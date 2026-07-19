import { query } from '../config/db.js';
export const getDashboardStats = async (req, res) => {
    try {
        // 1. KPI cards aggregates
        const [financeStats] = await query(`
      SELECT 
        SUM(gross_sales) AS total_revenue,
        SUM(statement_amount) AS total_settlement,
        SUM(net_profit) AS net_profit,
        SUM(gross_sales - tiktok_fees - affiliate_commission - shipping_fee_actual) AS gross_profit
      FROM settlements
    `);
        const [orderStats] = await query(`
      SELECT 
        COUNT(order_id) AS total_orders,
        SUM(CASE WHEN order_status = 'RETURNED' OR order_status = 'REFUNDED' THEN 1 ELSE 0 END) AS returned_refunded_orders,
        SUM(CASE WHEN order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders,
        SUM(CASE WHEN order_status = 'PENDING' OR order_status = 'AWAITING_SHIPMENT' THEN 1 ELSE 0 END) AS pending_orders
      FROM orders
    `);
        // Sales over periods (Today, Weekly, Monthly)
        const [salesPeriods] = await query(`
      SELECT
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END) AS today_sales,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN total_amount ELSE 0 END) AS weekly_sales,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_amount ELSE 0 END) AS monthly_sales
      FROM orders
    `);
        // 2. Product Rankings
        // Best Selling Products (by volume)
        const bestSelling = await query(`
      SELECT sku, product_name, SUM(quantity) AS quantity_sold, SUM(price * quantity) AS total_sales
      FROM order_items
      GROUP BY sku, product_name
      ORDER BY quantity_sold DESC
      LIMIT 5
    `);
        // Highest/Lowest profit products
        // Match settlements with order items and compute net profit margins per product
        const productProfits = await query(`
      SELECT 
        oi.sku, 
        oi.product_name, 
        SUM(s.net_profit) AS product_net_profit,
        SUM(oi.quantity) AS quantity_sold
      FROM order_items oi
      JOIN settlements s ON oi.order_id = s.order_id
      GROUP BY oi.sku, oi.product_name
      ORDER BY product_net_profit DESC
      LIMIT 10
    `);
        const highestProfit = [...productProfits].sort((a, b) => parseFloat(b.product_net_profit) - parseFloat(a.product_net_profit)).slice(0, 5);
        const lowestProfit = [...productProfits].sort((a, b) => parseFloat(a.product_net_profit) - parseFloat(b.product_net_profit)).slice(0, 5);
        // 3. Trends (Profit Trend & Expense Trend) over last 30 days
        const trends = await query(`
      SELECT 
        DATE(statement_date) AS date_str,
        SUM(gross_sales) AS revenue,
        SUM(net_profit) AS profit,
        SUM(tiktok_fees + affiliate_commission + shipping_fee_actual) AS channel_expenses,
        SUM(gross_sales - net_profit - tiktok_fees - affiliate_commission - shipping_fee_actual) AS cogs_expenses
      FROM settlements
      WHERE statement_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(statement_date)
      ORDER BY date_str ASC
    `);
        const finance = financeStats || {};
        const orders = orderStats || {};
        const sales = salesPeriods || {};
        res.json({
            kpis: {
                totalRevenue: parseFloat(finance.total_revenue || 0),
                totalSettlement: parseFloat(finance.total_settlement || 0),
                netProfit: parseFloat(finance.net_profit || 0),
                grossProfit: parseFloat(finance.gross_profit || 0),
                totalOrders: parseInt(orders.total_orders || 0),
                returnedOrders: parseInt(orders.returned_refunded_orders || 0),
                cancelledOrders: parseInt(orders.cancelled_orders || 0),
                pendingOrders: parseInt(orders.pending_orders || 0),
                todaySales: parseFloat(sales.today_sales || 0),
                weeklySales: parseFloat(sales.weekly_sales || 0),
                monthlySales: parseFloat(sales.monthly_sales || 0)
            },
            bestSelling,
            highestProfit,
            lowestProfit,
            trends: (trends || []).map((t) => ({
                date: t.date_str,
                revenue: parseFloat(t.revenue || 0),
                profit: parseFloat(t.profit || 0),
                expenses: parseFloat(t.channel_expenses || 0) + parseFloat(t.cogs_expenses || 0),
                cogs: parseFloat(t.cogs_expenses || 0),
                fees: parseFloat(t.channel_expenses || 0)
            }))
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
