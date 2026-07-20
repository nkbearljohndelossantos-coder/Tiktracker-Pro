import { executeTransaction } from '../../config/db.js';
import ProfitEngine from '../profitEngine.js';
import { SheetDetector } from './sheetDetector.js';
import { ColumnMatcher } from './columnMatcher.js';
import { Validation } from './validation.js';
import { ImportLogger } from './importLogger.js';
import xlsx from 'xlsx';
export class SettlementParser {
    /**
     * Orchestrates the settlement import process.
     * - Detects the sheet
     * - Maps columns
     * - Validates required fields
     * - Iterates over rows, logging errors
     * - Saves data to DB
     */
    static async parseAndImport(fileBuffer, userId) {
        const logger = new ImportLogger();
        let workbook;
        try {
            workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        }
        catch (err) {
            logger.addError(0, `Failed to read Excel file: ${err.message}`, '');
            return { success: false, log: logger.getLog() };
        }
        const detectedSheet = SheetDetector.detect(workbook, (normalizedHeaders) => {
            const mapping = ColumnMatcher.match(normalizedHeaders);
            const missing = Validation.validateRequiredFields(mapping);
            return missing.length === 0;
        });
        if (!detectedSheet) {
            logger.addError(0, 'No valid Settlement Report worksheet found. Missing required business fields (e.g. Transaction Type, Currency, Order Created Time, Order Settled Time).', '');
            return { success: false, log: logger.getLog() };
        }
        const { sheetName, headerRowIndex, normalizedHeaders, rawData } = detectedSheet;
        const originalHeadersRow = rawData[headerRowIndex] || [];
        const originalHeaders = Array.from(originalHeadersRow).map(h => String(h || ''));
        const mapping = ColumnMatcher.match(normalizedHeaders);
        logger.setWorksheetInfo(sheetName, originalHeaders, mapping);
        const dataRows = rawData.slice(headerRowIndex + 1).filter(row => row && Array.isArray(row) && row.length > 0 && row[0] !== undefined);
        await executeTransaction(async (conn) => {
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rowNumber = headerRowIndex + 2 + i;
                try {
                    const externalTxId = mapping.external_transaction_id !== -1 ? String(row[mapping.external_transaction_id] || '').trim() : '';
                    const relatedOrderId = mapping.related_order_id !== -1 ? String(row[mapping.related_order_id] || '').trim() : externalTxId;
                    if (!externalTxId) {
                        logger.addError(rowNumber, 'Missing External Transaction ID', row);
                        continue;
                    }
                    // Map to database schema
                    const settlementId = externalTxId;
                    const orderId = relatedOrderId;
                    // Check for duplicate entry
                    const [existing] = await conn.execute('SELECT id FROM settlements WHERE settlement_id = ? AND order_id = ?', [settlementId, orderId]);
                    if (existing.length > 0) {
                        logger.addWarning(`Row ${rowNumber}: Skipped duplicate transaction ${settlementId}`);
                        logger.incrementSkipped();
                        continue;
                    }
                    // Parse optional financials gracefully
                    const grossSales = this.parseAmount(row, mapping.gross_sales);
                    const tiktokFees = this.parseAmount(row, mapping.tiktok_fees, true);
                    const affiliateCommission = this.parseAmount(row, mapping.affiliate_commission, true);
                    const shippingSubsidy = this.parseAmount(row, mapping.shipping_subsidy);
                    const shippingActual = this.parseAmount(row, mapping.shipping_actual, true);
                    const discount = this.parseAmount(row, mapping.discount, true);
                    const adjustments = this.parseAmount(row, mapping.adjustments);
                    const refund = this.parseAmount(row, mapping.refund, true);
                    const returnLoss = this.parseAmount(row, mapping.return_loss, true);
                    const tax = this.parseAmount(row, mapping.tax, true);
                    const rawPayout = this.parseAmount(row, mapping.net_payout);
                    const statementDateRaw = mapping.order_settled_time !== -1 ? row[mapping.order_settled_time] : null;
                    let statementDate = null;
                    if (statementDateRaw) {
                        if (typeof statementDateRaw === 'number') {
                            const dateObj = new Date((statementDateRaw - 25569) * 86400 * 1000);
                            statementDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
                        }
                        else {
                            const parsed = new Date(statementDateRaw);
                            if (!isNaN(parsed.getTime())) {
                                statementDate = parsed.toISOString().slice(0, 19).replace('T', ' ');
                            }
                        }
                    }
                    // Retrieve product costs to calculate Net Profit dynamically
                    let totalCogs = 0;
                    if (orderId) {
                        const [orderItems] = await conn.execute('SELECT sku, quantity FROM order_items WHERE order_id = ?', [orderId]);
                        const itemsList = orderItems.map(item => ({ sku: item.sku || '', quantity: item.quantity }));
                        const skus = itemsList.map(item => item.sku).filter(sku => sku !== '');
                        if (skus.length > 0) {
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
                    }
                    const financials = {
                        gross_sales: grossSales,
                        tiktok_fees: tiktokFees,
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
                    // Persist the settlement row
                    await conn.execute(`INSERT INTO settlements (
              settlement_id, order_id, statement_date, gross_sales, tiktok_fees,
              affiliate_commission, shipping_fee_subsidy, shipping_fee_actual,
              platform_discount, adjustments, refund, return_loss, tax,
              statement_amount, net_profit, raw_data_json
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        settlementId, orderId, statementDate, grossSales, tiktokFees,
                        affiliateCommission, shippingSubsidy, shippingActual,
                        discount, adjustments, refund, returnLoss, tax,
                        rawPayout !== 0.0 ? rawPayout : calculated.statement_amount,
                        calculated.net_profit, JSON.stringify(row)
                    ]);
                    logger.incrementImported();
                }
                catch (err) {
                    logger.addError(rowNumber, err.message, row);
                }
            }
        });
        // Add audit log record of the import operation
        await executeTransaction(async (conn) => {
            await conn.execute("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'SETTLEMENT_IMPORT', 'FINANCE', ?)", [userId, `Imported ${logger.getLog().importedRows} settlements. Skipped: ${logger.getLog().skippedRows}. Warnings: ${logger.getLog().warnings.length}. Errors: ${logger.getLog().errors.length}`]);
        });
        return { success: true, log: logger.getLog() };
    }
    static parseAmount(row, index, absolute = false) {
        if (index === -1)
            return 0.0;
        const val = parseFloat(row[index]);
        if (isNaN(val))
            return 0.0;
        return absolute ? Math.abs(val) : val;
    }
}
