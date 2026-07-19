import assert from 'assert';
import jwt from 'jsonwebtoken';
import ProfitEngine from '../services/profitEngine.js';
console.log('--- RUNNING INTEGRATION TEST SUITES ---');
// 1. Test JWT Auth Token Generation
function testJWTAuth() {
    console.log('Testing JWT authentication token signatures...');
    const secret = 'test_secret_key';
    const payload = { id: 1, username: 'test_admin', role: 'SUPER_ADMIN' };
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
    assert.ok(token, 'JWT Token was not generated.');
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.username, 'test_admin', 'Decoded username does not match.');
    assert.strictEqual(decoded.role, 'SUPER_ADMIN', 'Decoded role does not match.');
    console.log('✔ JWT authentication tests passed.');
}
// 2. Test Profit Engine Calculation Engine
function testProfitEngine() {
    console.log('Testing Profit Engine calculation logic...');
    const mockProductCosts = new Map();
    mockProductCosts.set('SKU-MUG-001', {
        sku: 'SKU-MUG-001',
        purchase_cost: 120.00,
        packaging_cost: 15.00,
        bubble_wrap_cost: 5.00,
        tape_cost: 2.00,
        sticker_cost: 1.50,
        labor_cost: 10.00,
        other_expenses: 1.50 // Sum COGS = 155.00
    });
    const orderItems = [{ sku: 'SKU-MUG-001', quantity: 2 }]; // 2 Mugs = 310.00 COGS
    const cogsDetails = ProfitEngine.calculateCOGS(orderItems, mockProductCosts);
    assert.strictEqual(cogsDetails.total, 310.00, `COGS calculation incorrect. Got: ${cogsDetails.total}, Expected: 310.00`);
    const financials = {
        gross_sales: 598.00,
        tiktok_fees: 30.00,
        affiliate_commission: 30.00,
        shipping_fee_subsidy: 40.00,
        shipping_fee_actual: 40.00,
        platform_discount: 20.00,
        adjustments: 0.00,
        refund: 0.00,
        return_loss: 0.00,
        tax: 7.00
    };
    // Statement Payout = (Gross Sales + Subsidies + Adjustments) - (Fees + Comm + Shipping Actual + Refund + Tax)
    // Statement Payout = (598 + 40 + 0) - (30 + 30 + 40 + 0 + 7) = 638 - 107 = 531.00
    // Net Profit = Payout - COGS - Return Loss = 531 - 310 - 0 = 221.00
    // Profit Margin % = (221 / 598) * 100 = 36.96%
    const profitResults = ProfitEngine.calculateProfit(financials, cogsDetails.total);
    assert.strictEqual(profitResults.statement_amount, 531.00, `Statement payout incorrect. Got: ${profitResults.statement_amount}`);
    assert.strictEqual(profitResults.net_profit, 221.00, `Net profit calculation incorrect. Got: ${profitResults.net_profit}`);
    assert.strictEqual(profitResults.profit_percent, 36.96, `Profit margin % incorrect. Got: ${profitResults.profit_percent}`);
    console.log('✔ Profit Engine formula tests passed.');
}
try {
    testJWTAuth();
    testProfitEngine();
    console.log('--- ALL INTEGRATION TEST SUITES COMPLETED SUCCESSFULLY ---');
}
catch (err) {
    console.error('❌ Tests failed:', err.message);
    process.exit(1);
}
