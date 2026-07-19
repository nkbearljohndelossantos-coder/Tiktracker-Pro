import xlsx from 'xlsx';
import { executeTransaction, query } from '../config/db.js';
import ProfitEngine from './profitEngine.js';
export class ExcelService {
    /**
     * Helper to normalize a header name by lowercase, stripping spaces, dashes and underscores
     */
    static normalizeHeader(h) {
        return h.toLowerCase().replace(/[\s\-_()]/g, '');
    }
    /**
     * Parse uploaded Excel buffer and map headers dynamically
     */
    static async parseAndImport(fileBuffer, fileType, userId) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawData.length === 0) {
            return { success: false, imported: 0, duplicates: 0, errors: ['Excel file is empty'] };
        }
        // 1. Identify header row (usually index 0, sometimes 1 or 2 due to report title rows)
        let headerRowIndex = 0;
        let headers = [];
        for (let r = 0; r < Math.min(rawData.length, 10); r++) {
            const row = rawData[r];
            if (row && Array.isArray(row) && row.some(cell => {
                const str = String(cell || '').toLowerCase();
                return str.includes('order id') || str.includes('order no') || str.includes('tracking') || str.includes('settlement');
            })) {
                headerRowIndex = r;
                headers = row.map(cell => this.normalizeHeader(String(cell || '')));
                break;
            }
        }
        if (headers.length === 0) {
            // Fallback to row 0 if we couldn't detect a clear header row
            const firstRow = rawData[0] || [];
            headers = firstRow.map(cell => this.normalizeHeader(String(cell || '')));
        }
        const dataRows = rawData.slice(headerRowIndex + 1).filter(row => row && Array.isArray(row) && row.length > 0 && row[0] !== undefined);
        if (fileType === 'ORDER') {
            return await this.importOrders(headers, dataRows, userId);
        }
        else if (fileType === 'SETTLEMENT' || fileType === 'TRANSACTION') {
            return await this.importSettlements(headers, dataRows, userId);
        }
        else if (fileType === 'RETURN') {
            return await this.importReturns(headers, dataRows, userId);
        }
        else {
            return { success: false, imported: 0, duplicates: 0, errors: [`File type ${fileType} is not supported yet.`] };
        }
    }
    /**
     * Import TikTok Orders report
     */
    static async importOrders(headers, rows, userId) {
        // Map of logical columns to standard header names (variations)
        const mapping = {
            orderId: headers.findIndex(h => h.includes('orderid') || h.includes('orderno') || h.includes('ordernumber')),
            tracking: headers.findIndex(h => h.includes('tracking') || h.includes('waybill') || h.includes('trackingnumber')),
            customer: headers.findIndex(h => h.includes('customer') || h.includes('recipient') || h.includes('buyername') || h.includes('receivername')),
            phone: headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('tel')),
            address: headers.findIndex(h => h.includes('address') || h.includes('shippingaddress') || h.includes('deliveryaddress') || h.includes('recipientaddress')),
            courier: headers.findIndex(h => h.includes('courier') || h.includes('shippingprovider') || h.includes('logistics') || h.includes('shippingcompany')),
            status: headers.findIndex(h => h.includes('status') || h.includes('orderstatus')),
            sku: headers.findIndex(h => h.includes('sku') || h.includes('sellersku') || h.includes('skuid')),
            productName: headers.findIndex(h => h.includes('product') || h.includes('productname') || h.includes('itemname')),
            variation: headers.findIndex(h => h.includes('variation') || h.includes('variationname') || h.includes('productvariation')),
            quantity: headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('numberofitems')),
            price: headers.findIndex(h => h.includes('price') || h.includes('itemprice') || h.includes('unitprice') || h.includes('originalprice'))
        };
        if (mapping.orderId === -1) {
            return { success: false, imported: 0, duplicates: 0, errors: ['Could not find Order ID column in Excel.'] };
        }
        let imported = 0;
        let duplicates = 0;
        const errors = [];
        // Run transaction
        await executeTransaction(async (conn) => {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    const orderId = String(row[mapping.orderId] || '').trim();
                    if (!orderId)
                        continue;
                    // Check duplicate order
                    const [existing] = await conn.execute('SELECT order_id FROM orders WHERE order_id = ?', [orderId]);
                    const isDuplicate = existing.length > 0;
                    const tracking = mapping.tracking !== -1 ? String(row[mapping.tracking] || '').trim() : '';
                    const customer = mapping.customer !== -1 ? String(row[mapping.customer] || '').trim() : '';
                    const phone = mapping.phone !== -1 ? String(row[mapping.phone] || '').trim() : '';
                    const address = mapping.address !== -1 ? String(row[mapping.address] || '').trim() : '';
                    const courier = mapping.courier !== -1 ? String(row[mapping.courier] || '').trim() : '';
                    const status = mapping.status !== -1 ? String(row[mapping.status] || '').trim() : 'PENDING';
                    const sku = mapping.sku !== -1 ? String(row[mapping.sku] || '').trim() : '';
                    const productName = mapping.productName !== -1 ? String(row[mapping.productName] || '').trim() : 'Unknown Product';
                    const variation = mapping.variation !== -1 ? String(row[mapping.variation] || '').trim() : '';
                    const quantity = mapping.quantity !== -1 ? parseInt(row[mapping.quantity]) || 1 : 1;
                    const price = mapping.price !== -1 ? parseFloat(row[mapping.price]) || 0.0 : 0.0;
                    if (!isDuplicate) {
                        // Save Order
                        await conn.execute(`INSERT INTO orders (order_id, tracking_number, customer_name, phone_number, shipping_address, courier, order_status, total_amount, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [orderId, tracking, customer, phone, address, courier, status, price * quantity]);
                        imported++;
                    }
                    else {
                        duplicates++;
                    }
                    // Save Order Items
                    // Check if item already added
                    const [existingItem] = await conn.execute('SELECT id FROM order_items WHERE order_id = ? AND sku = ? AND variation = ?', [orderId, sku, variation]);
                    if (existingItem.length === 0) {
                        await conn.execute(`INSERT INTO order_items (order_id, sku, product_name, variation, quantity, price)
               VALUES (?, ?, ?, ?, ?, ?)`, [orderId, sku || null, productName, variation, quantity, price]);
                        // Trigger Stock movement if order completed/shipped and product exists
                        if (sku && (status.toUpperCase() === 'COMPLETED' || status.toUpperCase() === 'SHIPPED' || status.toUpperCase() === 'DELIVERED')) {
                            // Check if SKU exists
                            const [product] = await conn.execute('SELECT sku, inventory_qty FROM products WHERE sku = ?', [sku]);
                            if (product.length > 0) {
                                // Deduct stock
                                await conn.execute('UPDATE products SET inventory_qty = inventory_qty - ? WHERE sku = ?', [quantity, sku]);
                                // Log movement
                                await conn.execute(`INSERT INTO inventory_movements (sku, movement_type, quantity, notes, created_by)
                   VALUES (?, 'SALE', ?, ?, ?)`, [sku, -quantity, `Deduction from Order Import: ${orderId}`, userId]);
                            }
                        }
                    }
                }
                catch (err) {
                    errors.push(`Row ${i + 2}: ${err.message}`);
                }
            }
        });
        // Audit Log
        await query("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'ORDER_IMPORT', 'ORDERS', ?)", [userId, `Imported ${imported} orders. Duplicates: ${duplicates}. Errors: ${errors.length}`]);
        return { success: true, imported, duplicates, errors };
    }
    /**
     * Import TikTok Settlements report
     */
    static async importSettlements(headers, rows, userId) {
        const mapping = {
            settlementId: headers.findIndex(h => h.includes('settlementid') || h.includes('statementid') || h.includes('payoutid') || h.includes('paymentid')),
            orderId: headers.findIndex(h => h.includes('orderid') || h.includes('orderno') || h.includes('orderid')),
            statementDate: headers.findIndex(h => h.includes('date') || h.includes('settlementtime') || h.includes('releasedate') || h.includes('statementdate')),
            grossSales: headers.findIndex(h => h.includes('grosssales') || h.includes('revenue') || h.includes('amount') || h.includes('orderamount')),
            tiktokFees: headers.findIndex(h => h.includes('fee') || h.includes('tiktokfee') || h.includes('commission') || h.includes('transactionfee') || h.includes('platformfee')),
            affiliateCommission: headers.findIndex(h => h.includes('affiliate') || h.includes('affiliatecommission') || h.includes('creatorcommission')),
            shippingSubsidy: headers.findIndex(h => h.includes('shippingsubsidy') || h.includes('shippingfeesubsidy') || h.includes('platformshipping')),
            shippingActual: headers.findIndex(h => h.includes('shippingactual') || h.includes('actualshipping') || h.includes('shippingfee')),
            discount: headers.findIndex(h => h.includes('discount') || h.includes('platformvoucher') || h.includes('voucher')),
            adjustments: headers.findIndex(h => h.includes('adjustment') || h.includes('otheradjustment')),
            refund: headers.findIndex(h => h.includes('refund') || h.includes('refundamount')),
            returnLoss: headers.findIndex(h => h.includes('returnloss') || h.includes('returnshippingcost')),
            tax: headers.findIndex(h => h.includes('tax') || h.includes('vat') || h.includes('withholdingtax')),
            netPayout: headers.findIndex(h => h.includes('net') || h.includes('netpayout') || h.includes('settlementamount') || h.includes('statementamount'))
        };
        if (mapping.settlementId === -1) {
            return { success: false, imported: 0, duplicates: 0, errors: ['Could not find Settlement/Statement ID column in Excel.'] };
        }
        let imported = 0;
        let duplicates = 0;
        const errors = [];
        await executeTransaction(async (conn) => {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    const settlementId = String(row[mapping.settlementId] || '').trim();
                    const orderId = mapping.orderId !== -1 ? String(row[mapping.orderId] || '').trim() : '';
                    if (!settlementId || !orderId)
                        continue;
                    // Check duplicate settlement-order pair
                    const [existing] = await conn.execute('SELECT id FROM settlements WHERE settlement_id = ? AND order_id = ?', [settlementId, orderId]);
                    if (existing.length > 0) {
                        duplicates++;
                        continue;
                    }
                    // Parse financials
                    const grossSales = mapping.grossSales !== -1 ? Math.abs(parseFloat(row[mapping.grossSales])) || 0.0 : 0.0;
                    // Combine fee columns if multiple matches. For simplicity, parse fields, treat negative/positive correctly
                    let fees = 0;
                    if (mapping.tiktokFees !== -1) {
                        fees = Math.abs(parseFloat(row[mapping.tiktokFees])) || 0.0;
                    }
                    const affiliateCommission = mapping.affiliateCommission !== -1 ? Math.abs(parseFloat(row[mapping.affiliateCommission])) || 0.0 : 0.0;
                    const shippingSubsidy = mapping.shippingSubsidy !== -1 ? parseFloat(row[mapping.shippingSubsidy]) || 0.0 : 0.0;
                    const shippingActual = mapping.shippingActual !== -1 ? Math.abs(parseFloat(row[mapping.shippingActual])) || 0.0 : 0.0;
                    const discount = mapping.discount !== -1 ? Math.abs(parseFloat(row[mapping.discount])) || 0.0 : 0.0;
                    const adjustments = mapping.adjustments !== -1 ? parseFloat(row[mapping.adjustments]) || 0.0 : 0.0;
                    const refund = mapping.refund !== -1 ? Math.abs(parseFloat(row[mapping.refund])) || 0.0 : 0.0;
                    const returnLoss = mapping.returnLoss !== -1 ? Math.abs(parseFloat(row[mapping.returnLoss])) || 0.0 : 0.0;
                    const tax = mapping.tax !== -1 ? Math.abs(parseFloat(row[mapping.tax])) || 0.0 : 0.0;
                    const rawPayout = mapping.netPayout !== -1 ? parseFloat(row[mapping.netPayout]) || 0.0 : 0.0;
                    const statementDateRaw = mapping.statementDate !== -1 ? row[mapping.statementDate] : null;
                    let statementDate = null;
                    if (statementDateRaw) {
                        // Excel dates can be numbers or strings
                        if (typeof statementDateRaw === 'number') {
                            const dateObj = new Date((statementDateRaw - 25569) * 86400 * 1000);
                            statementDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
                        }
                        else {
                            statementDate = new Date(statementDateRaw).toISOString().slice(0, 19).replace('T', ' ');
                        }
                    }
                    // Calculate COGS
                    // Get order items from database
                    const [orderItems] = await conn.execute('SELECT sku, quantity FROM order_items WHERE order_id = ?', [orderId]);
                    const itemsList = orderItems.map(item => ({
                        sku: item.sku || '',
                        quantity: item.quantity
                    }));
                    const skus = itemsList.map(item => item.sku).filter(sku => sku !== '');
                    let totalCogs = 0;
                    if (skus.length > 0) {
                        // Get costs
                        const costMap = new Map();
                        const placeholders = skus.map(() => '?').join(',');
                        const [products] = await conn.execute(`SELECT sku, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses
               FROM products WHERE sku IN (${placeholders})`, skus);
                        products.forEach(p => {
                            costMap.set(p.sku, {
                                sku: p.sku,
                                purchase_cost: parseFloat(p.purchase_cost),
                                packaging_cost: parseFloat(p.packaging_cost),
                                bubble_wrap_cost: parseFloat(p.bubble_wrap_cost),
                                tape_cost: parseFloat(p.tape_cost),
                                sticker_cost: parseFloat(p.sticker_cost),
                                labor_cost: parseFloat(p.labor_cost),
                                other_expenses: parseFloat(p.other_expenses)
                            });
                        });
                        const cogsDetails = ProfitEngine.calculateCOGS(itemsList, costMap);
                        totalCogs = cogsDetails.total;
                    }
                    // Compute Profit
                    const financials = {
                        gross_sales: grossSales,
                        tiktok_fees: fees,
                        affiliate_commission: affiliateCommission,
                        shipping_fee_subsidy: shippingSubsidy,
                        shipping_fee_actual: shippingActual,
                        platform_discount: discount,
                        adjustments,
                        refund,
                        return_loss: returnLoss,
                        tax
                    };
                    const calculated = ProfitEngine.calculateProfit(financials, totalCogs);
                    // Save Settlement
                    await conn.execute(`INSERT INTO settlements (
              settlement_id, order_id, statement_date, gross_sales, tiktok_fees,
              affiliate_commission, shipping_fee_subsidy, shipping_fee_actual,
              platform_discount, adjustments, refund, return_loss, tax,
              statement_amount, net_profit, raw_data_json
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        settlementId, orderId, statementDate, grossSales, fees,
                        affiliateCommission, shippingSubsidy, shippingActual,
                        discount, adjustments, refund, returnLoss, tax,
                        rawPayout !== 0.0 ? rawPayout : calculated.statement_amount,
                        calculated.net_profit, JSON.stringify(row)
                    ]);
                    imported++;
                }
                catch (err) {
                    errors.push(`Row ${i + 2}: ${err.message}`);
                }
            }
        });
        await query("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'SETTLEMENT_IMPORT', 'FINANCE', ?)", [userId, `Imported ${imported} settlements. Duplicates: ${duplicates}. Errors: ${errors.length}`]);
        return { success: true, imported, duplicates, errors };
    }
    /**
     * Import TikTok Return reports
     */
    static async importReturns(headers, rows, userId) {
        const mapping = {
            returnId: headers.findIndex(h => h.includes('returnid') || h.includes('refundid') || h.includes('returnno')),
            orderId: headers.findIndex(h => h.includes('orderid') || h.includes('orderno')),
            sku: headers.findIndex(h => h.includes('sku') || h.includes('sellersku')),
            tracking: headers.findIndex(h => h.includes('tracking') || h.includes('waybill') || h.includes('returntracking')),
            reason: headers.findIndex(h => h.includes('reason') || h.includes('returnreason') || h.includes('buyerreturnreason')),
            cost: headers.findIndex(h => h.includes('cost') || h.includes('returnshippingfee') || h.includes('fee')),
            refundAmount: headers.findIndex(h => h.includes('refund') || h.includes('refundamount') || h.includes('refundedamount'))
        };
        if (mapping.orderId === -1) {
            return { success: false, imported: 0, duplicates: 0, errors: ['Could not find Order ID column in Excel.'] };
        }
        let imported = 0;
        let duplicates = 0;
        const errors = [];
        await executeTransaction(async (conn) => {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    const orderId = String(row[mapping.orderId] || '').trim();
                    if (!orderId)
                        continue;
                    const returnId = mapping.returnId !== -1 ? String(row[mapping.returnId] || '').trim() : `RET-${orderId}-${i}`;
                    const sku = mapping.sku !== -1 ? String(row[mapping.sku] || '').trim() : '';
                    const tracking = mapping.tracking !== -1 ? String(row[mapping.tracking] || '').trim() : '';
                    const reason = mapping.reason !== -1 ? String(row[mapping.reason] || '').trim() : 'TikTok Return';
                    const returnShipping = mapping.cost !== -1 ? parseFloat(row[mapping.cost]) || 0.0 : 0.0;
                    const refundAmount = mapping.refundAmount !== -1 ? parseFloat(row[mapping.refundAmount]) || 0.0 : 0.0;
                    // Check duplicate return
                    const [existing] = await conn.execute('SELECT id FROM returns WHERE return_id = ?', [returnId]);
                    if (existing.length > 0) {
                        duplicates++;
                        continue;
                    }
                    // Insert return
                    await conn.execute(`INSERT INTO returns (return_id, order_id, sku, tracking_number, reason, condition_status, return_shipping_cost, refunded_amount, returned_to_inventory, recorded_by)
             VALUES (?, ?, ?, ?, ?, 'GOOD', ?, ?, TRUE, ?)`, [returnId, orderId, sku || null, tracking, reason, returnShipping, refundAmount, userId]);
                    // Update inventory and log stock movement
                    if (sku) {
                        const [product] = await conn.execute('SELECT sku FROM products WHERE sku = ?', [sku]);
                        if (product.length > 0) {
                            await conn.execute('UPDATE products SET inventory_qty = inventory_qty + 1 WHERE sku = ?', [sku]);
                            await conn.execute(`INSERT INTO inventory_movements (sku, movement_type, quantity, notes, created_by)
                 VALUES (?, 'RETURN', 1, ?, ?)`, [sku, `Restock from Return Import: ${returnId}`, userId]);
                        }
                    }
                    // Recalculate profit for the associated order settlements
                    const [settlements] = await conn.execute('SELECT id, gross_sales, tiktok_fees, affiliate_commission, shipping_fee_subsidy, shipping_fee_actual, platform_discount, adjustments, tax FROM settlements WHERE order_id = ?', [orderId]);
                    for (const sett of settlements) {
                        // Get current COGS
                        const [orderItems] = await conn.execute('SELECT sku, quantity FROM order_items WHERE order_id = ?', [orderId]);
                        const itemsList = orderItems.map(item => ({
                            sku: item.sku || '',
                            quantity: item.quantity
                        }));
                        const skus = itemsList.map(item => item.sku).filter(sku => sku !== '');
                        let totalCogs = 0;
                        if (skus.length > 0) {
                            const costMap = new Map();
                            const placeholders = skus.map(() => '?').join(',');
                            const [products] = await conn.execute(`SELECT sku, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses
                 FROM products WHERE sku IN (${placeholders})`, skus);
                            products.forEach(p => {
                                costMap.set(p.sku, p);
                            });
                            const cogsDetails = ProfitEngine.calculateCOGS(itemsList, costMap);
                            totalCogs = cogsDetails.total;
                        }
                        const financials = {
                            gross_sales: parseFloat(sett.gross_sales),
                            tiktok_fees: parseFloat(sett.tiktok_fees),
                            affiliate_commission: parseFloat(sett.affiliate_commission),
                            shipping_fee_subsidy: parseFloat(sett.shipping_fee_subsidy),
                            shipping_fee_actual: parseFloat(sett.shipping_fee_actual),
                            platform_discount: parseFloat(sett.platform_discount),
                            adjustments: parseFloat(sett.adjustments),
                            refund: refundAmount,
                            return_loss: returnShipping, // Return Loss is the return shipping cost incurred by seller
                            tax: parseFloat(sett.tax)
                        };
                        const recalculated = ProfitEngine.calculateProfit(financials, totalCogs);
                        // Update settlement profit
                        await conn.execute(`UPDATE settlements 
               SET refund = ?, return_loss = ?, statement_amount = ?, net_profit = ?
               WHERE id = ?`, [refundAmount, returnShipping, recalculated.statement_amount, recalculated.net_profit, sett.id]);
                    }
                    imported++;
                }
                catch (err) {
                    errors.push(`Row ${i + 2}: ${err.message}`);
                }
            }
        });
        await query("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'RETURN_IMPORT', 'RETURNS', ?)", [userId, `Imported ${imported} returns. Duplicates: ${duplicates}. Errors: ${errors.length}`]);
        return { success: true, imported, duplicates, errors };
    }
}
export default ExcelService;
