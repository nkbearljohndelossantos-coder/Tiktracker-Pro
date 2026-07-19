import { query } from '../config/db.js';
export class ProfitEngine {
    /**
     * Fetch COGS details for a list of products by SKU
     */
    static async getProductCosts(skus) {
        const costMap = new Map();
        if (skus.length === 0)
            return costMap;
        // Build placeholders for SQL IN clause
        const placeholders = skus.map(() => '?').join(',');
        const sql = `
      SELECT sku, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses
      FROM products
      WHERE sku IN (${placeholders})
    `;
        const rows = await query(sql, skus);
        rows.forEach((row) => {
            costMap.set(row.sku, {
                sku: row.sku,
                purchase_cost: parseFloat(row.purchase_cost || '0'),
                packaging_cost: parseFloat(row.packaging_cost || '0'),
                bubble_wrap_cost: parseFloat(row.bubble_wrap_cost || '0'),
                tape_cost: parseFloat(row.tape_cost || '0'),
                sticker_cost: parseFloat(row.sticker_cost || '0'),
                labor_cost: parseFloat(row.labor_cost || '0'),
                other_expenses: parseFloat(row.other_expenses || '0')
            });
        });
        return costMap;
    }
    /**
     * Calculate total COGS (cost of goods sold) for order items
     */
    static calculateCOGS(items, costMap) {
        let totalCogs = 0;
        let packaging = 0;
        let bubbleWrap = 0;
        let tape = 0;
        let sticker = 0;
        let labor = 0;
        let other = 0;
        let purchase = 0;
        items.forEach((item) => {
            const costs = costMap.get(item.sku);
            if (costs) {
                const qty = item.quantity;
                purchase += costs.purchase_cost * qty;
                packaging += costs.packaging_cost * qty;
                bubbleWrap += costs.bubble_wrap_cost * qty;
                tape += costs.tape_cost * qty;
                sticker += costs.sticker_cost * qty;
                labor += costs.labor_cost * qty;
                other += costs.other_expenses * qty;
            }
        });
        totalCogs = purchase + packaging + bubbleWrap + tape + sticker + labor + other;
        return {
            total: totalCogs,
            purchase,
            packaging,
            bubbleWrap,
            tape,
            sticker,
            labor,
            other
        };
    }
    /**
     * Compute final financial breakdown for a settlement
     */
    static calculateProfit(financials, cogs) {
        const { gross_sales, tiktok_fees, affiliate_commission, shipping_fee_subsidy, shipping_fee_actual, platform_discount, adjustments, refund, return_loss, tax } = financials;
        // Gross Payout (Statement Amount) as sent by TikTok:
        // Payout = Gross Sales - TikTok Fees - Affiliate Commission - Shipping Fee (Actual) + Subsidies + Adjustments - Refund
        // Let's standardise the payout matching TikTok Shop logic:
        // Typically Payout = Gross Sales - TikTok Fees - Affiliate Commission - (Shipping Fee Actual - Shipping Fee Subsidy) - Refund + Adjustments
        const payout = (gross_sales + shipping_fee_subsidy + adjustments) - (tiktok_fees + affiliate_commission + shipping_fee_actual + refund + tax);
        // Gross Profit (Before Product COGS, but after TikTok channel costs)
        // Gross Profit = Payout (since Payout has all platform commissions, actual shipping fees, voucher adjustments and refunds accounted for)
        const grossProfit = payout;
        // Net Profit = Gross Profit - Product Cost (COGS) - Return Loss
        const netProfit = grossProfit - cogs - return_loss;
        // Margins
        const revenue = gross_sales > 0 ? gross_sales : 1.00; // prevent divide by zero
        const profitMarginPercent = (netProfit / revenue) * 100;
        const lossMarginPercent = netProfit < 0 ? (Math.abs(netProfit) / revenue) * 100 : 0;
        return {
            statement_amount: parseFloat(payout.toFixed(2)),
            gross_profit: parseFloat(grossProfit.toFixed(2)),
            net_profit: parseFloat(netProfit.toFixed(2)),
            profit_percent: parseFloat(profitMarginPercent.toFixed(2)),
            loss_percent: parseFloat(lossMarginPercent.toFixed(2))
        };
    }
}
export default ProfitEngine;
