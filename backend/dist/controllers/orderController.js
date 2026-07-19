import { query } from '../config/db.js';
export const getOrders = async (req, res) => {
    const { search, courier, status, startDate, endDate, supplier, sku, hasSettlement } = req.query;
    try {
        let sql = `
      SELECT DISTINCT o.*, s.settlement_id, s.net_profit, s.statement_amount
      FROM orders o
      LEFT JOIN settlements s ON o.order_id = s.order_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN products p ON oi.sku = p.sku
      WHERE 1=1
    `;
        const params = [];
        // Global Search
        if (search) {
            sql += ` AND (
        o.order_id LIKE ? OR 
        o.tracking_number LIKE ? OR 
        o.customer_name LIKE ? OR 
        oi.sku LIKE ? OR 
        oi.product_name LIKE ? OR 
        o.courier LIKE ? OR 
        s.settlement_id LIKE ?
      )`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }
        // Filters
        if (courier) {
            sql += ' AND o.courier = ?';
            params.push(courier);
        }
        if (status) {
            sql += ' AND o.order_status = ?';
            params.push(status);
        }
        if (startDate && endDate) {
            sql += ' AND o.created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        if (supplier) {
            sql += ' AND p.supplier = ?';
            params.push(supplier);
        }
        if (sku) {
            sql += ' AND oi.sku = ?';
            params.push(sku);
        }
        if (hasSettlement === 'true') {
            sql += ' AND s.id IS NOT NULL';
        }
        else if (hasSettlement === 'false') {
            sql += ' AND s.id IS NULL';
        }
        sql += ' ORDER BY o.created_at DESC LIMIT 1000'; // Limit results for performance
        const ordersList = await query(sql, params);
        res.json(ordersList);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const getOrderDetails = async (req, res) => {
    const { id } = req.params; // Order ID
    try {
        // 1. Get Order Core
        const orders = await query('SELECT * FROM orders WHERE order_id = ?', [id]);
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        const order = orders[0];
        // 2. Get Order Items with individual SKU cost breakdowns
        const items = await query(`SELECT oi.*, p.purchase_cost, p.packaging_cost, p.bubble_wrap_cost,
              p.tape_cost, p.sticker_cost, p.labor_cost, p.other_expenses, p.supplier
       FROM order_items oi
       LEFT JOIN products p ON oi.sku = p.sku
       WHERE oi.order_id = ?`, [id]);
        // 3. Get Settlements
        const settlements = await query('SELECT * FROM settlements WHERE order_id = ?', [id]);
        // 4. Get Waybill
        const waybills = await query('SELECT * FROM waybills WHERE order_id = ?', [id]);
        // 5. Get Return History
        const returns = await query('SELECT * FROM returns WHERE order_id = ?', [id]);
        // 6. Formulate Order Timeline
        const timeline = [];
        if (order.created_at) {
            timeline.push({ event: 'ORDERED', label: 'Order Created on TikTok Shop', timestamp: order.created_at });
        }
        if (order.imported_at) {
            timeline.push({ event: 'IMPORTED', label: 'System Order Log Created', timestamp: order.imported_at });
        }
        if (waybills.length > 0) {
            timeline.push({ event: 'WAYBILL_UPLOAD', label: 'Waybill Uploaded & Extracted', timestamp: waybills[0].uploaded_at });
        }
        if (settlements.length > 0) {
            timeline.push({ event: 'SETTLED', label: `Payout Settled (ID: ${settlements[0].settlement_id})`, timestamp: settlements[0].statement_date });
        }
        if (returns.length > 0) {
            timeline.push({ event: 'RETURNED', label: `Customer Return Logged (${returns[0].reason})`, timestamp: returns[0].scan_date });
        }
        // Sort timeline chronologically
        timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        // 7. Calculate overall financial breakdown
        let totalCogs = 0;
        items.forEach(item => {
            const itemCogs = (parseFloat(item.purchase_cost || '0') +
                parseFloat(item.packaging_cost || '0') +
                parseFloat(item.bubble_wrap_cost || '0') +
                parseFloat(item.tape_cost || '0') +
                parseFloat(item.sticker_cost || '0') +
                parseFloat(item.labor_cost || '0') +
                parseFloat(item.other_expenses || '0')) * item.quantity;
            totalCogs += itemCogs;
        });
        const financeBreakdown = {
            gross_revenue: parseFloat(order.total_amount || '0'),
            cogs: totalCogs,
            settlements: settlements.map(s => ({
                settlement_id: s.settlement_id,
                statement_date: s.statement_date,
                gross_sales: parseFloat(s.gross_sales),
                tiktok_fees: parseFloat(s.tiktok_fees),
                affiliate_commission: parseFloat(s.affiliate_commission),
                shipping_fee_subsidy: parseFloat(s.shipping_fee_subsidy),
                shipping_fee_actual: parseFloat(s.shipping_fee_actual),
                platform_discount: parseFloat(s.platform_discount),
                adjustments: parseFloat(s.adjustments),
                refund: parseFloat(s.refund),
                return_loss: parseFloat(s.return_loss),
                tax: parseFloat(s.tax),
                net_payout: parseFloat(s.statement_amount),
                net_profit: parseFloat(s.net_profit)
            }))
        };
        res.json({
            order,
            items,
            financeBreakdown,
            waybill: waybills[0] || null,
            returns,
            timeline
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
