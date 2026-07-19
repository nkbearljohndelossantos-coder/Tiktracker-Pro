import { ExcelService } from '../services/excelService.js';
import xlsx from 'xlsx';
async function runTest() {
    console.log('Starting detailed Excel import test...');
    try {
        // Generate mock data representing various row structures
        const data = [
            ['Settlement ID', 'Order ID', 'Date', 'Gross Sales', 'TikTok Fees', 'Affiliate Commission', 'Net Payout'],
            ['SET-001', 'ORD-001', '2026-07-19 18:00:00', '299.00', '15.00', '10.00', '274.00'],
            ['SET-002', 'ORD-002', 'Invalid Date', '399.00', '20.00', '0.00', '379.00'], // Invalid date
            ['SET-003', 'ORD-003', null, '199.00', '10.00', '0.00', '189.00'], // Null date
            [null, null, null, null, null, null, null], // Empty row
            ['SET-004', 'ORD-004', 46219.75, 499, 25, 15, 459] // Numeric date
        ];
        const ws = xlsx.utils.aoa_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        console.log('Mock spreadsheet generated. Executing parseAndImport...');
        const result = await ExcelService.parseAndImport(buffer, 'SETTLEMENT', 1);
        console.log('Import execution results:', result);
    }
    catch (err) {
        console.error('CRITICAL IMPORT ERROR:', err.stack || err.message);
    }
}
runTest();
