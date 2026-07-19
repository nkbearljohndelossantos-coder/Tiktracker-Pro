import { query, executeTransaction } from '../config/db.js';
import ProfitEngine from '../services/profitEngine.js';
/**
 * Handle scan returns by Barcode/Tracking/Order ID
 */
export const scanReturn = async (req, res) => {
    const { barcode } = req.body;
    if (!barcode) {
        return res.status(400).json({ error: 'Barcode value is required.' });
    }
    try {
        // 1. Locate Order
        // Search orders table by order_id or tracking_number
        const orderRows = await query('SELECT order_id, tracking_number FROM orders WHERE order_id = ? OR tracking_number = ?', [barcode, barcode]);
        if (orderRows.length === 0) {
            return res.status(404).json({
                error: 'Original order not found. Please log return manually with custom order matching details.'
            });
        }
        const order = orderRows[0];
        // Get order items so user can choose which item to return or default to first/all
        const items = await query('SELECT sku, product_name, variation, quantity FROM order_items WHERE order_id = ?', [order.order_id]);
        res.json({
            success: true,
            orderId: order.order_id,
            trackingNumber: order.tracking_number,
            items
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
/**
 * Log returned items, re-add to stocks, adjust profit metrics
 */
export const saveReturn = async (req, res) => {
    const { orderId, sku, returnId, reason, conditionStatus, returnShippingCost, refundedAmount, returnToStock } = req.body;
    if (!orderId || !sku) {
        return res.status(400).json({ error: 'Order ID and SKU are required to record return.' });
    }
    const user = req.user;
    const targetReturnId = returnId || `RET-${orderId}-${Date.now()}`;
    try {
        await executeTransaction(async (conn) => {
            // Save return record
            await conn.execute(`INSERT INTO returns (
          return_id, order_id, sku, tracking_number, reason,
          condition_status, return_shipping_cost, refunded_amount,
          returned_to_inventory, recorded_by
         ) VALUES (?, ?, ?, (SELECT tracking_number FROM orders WHERE order_id = ?), ?, ?, ?, ?, ?, ?)`, [
                targetReturnId, orderId, sku, orderId, reason || 'TikTok Return',
                conditionStatus || 'GOOD', returnShippingCost || 0.0, refundedAmount || 0.0,
                !!returnToStock, user.id
            ]);
            // Add back to inventory if approved
            if (returnToStock && (conditionStatus === 'GOOD' || conditionStatus === 'DAMAGED_SELLABLE')) {
                await conn.execute('UPDATE products SET inventory_qty = inventory_qty + 1 WHERE sku = ?', [sku]);
                // Record stock movement
                await conn.execute(`INSERT INTO inventory_movements (sku, movement_type, quantity, notes, created_by)
           VALUES (?, 'RETURN', 1, ?, ?)`, [sku, `Restock from manual Return log: ${targetReturnId}`, user.id]);
            }
            // Recalculate settlements for order
            const [settlements] = await conn.execute('SELECT * FROM settlements WHERE order_id = ?', [orderId]);
            for (const sett of settlements) {
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
                const financials = {
                    gross_sales: parseFloat(sett.gross_sales),
                    tiktok_fees: parseFloat(sett.tiktok_fees),
                    affiliate_commission: parseFloat(sett.affiliate_commission),
                    shipping_fee_subsidy: parseFloat(sett.shipping_fee_subsidy),
                    shipping_fee_actual: parseFloat(sett.shipping_fee_actual),
                    platform_discount: parseFloat(sett.platform_discount),
                    adjustments: parseFloat(sett.adjustments),
                    refund: parseFloat(refundedAmount || 0),
                    return_loss: parseFloat(returnShippingCost || 0),
                    tax: parseFloat(sett.tax)
                };
                const recalculated = ProfitEngine.calculateProfit(financials, totalCogs);
                await conn.execute(`UPDATE settlements 
           SET refund = ?, return_loss = ?, statement_amount = ?, net_profit = ?
           WHERE id = ?`, [refundedAmount || 0, returnShippingCost || 0, recalculated.statement_amount, recalculated.net_profit, sett.id]);
            }
        });
        // Audit log
        await query("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'LOG_RETURN', 'RETURNS', ?)", [user.id, `Logged return ID: ${targetReturnId} for Order: ${orderId}`]);
        res.status(201).json({ success: true, message: 'Return logged successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const getReturns = async (req, res) => {
    try {
        const list = await query(`
      SELECT r.*, o.courier, o.customer_name, oi.product_name
      FROM returns r
      JOIN orders o ON r.order_id = o.order_id
      LEFT JOIN order_items oi ON r.order_id = oi.order_id AND r.sku = oi.sku
      ORDER BY r.scan_date DESC
    `);
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
