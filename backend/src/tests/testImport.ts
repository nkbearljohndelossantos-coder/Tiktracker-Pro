import { ExcelService } from '../services/excelService.js';
import xlsx from 'xlsx';

async function runTest() {
  console.log('Starting Excel import test...');
  try {
    // Generate a basic valid workbook in memory
    const data = [
      ['Settlement ID', 'Order ID', 'Date', 'Gross Sales', 'TikTok Fees', 'Affiliate Commission', 'Net Payout'],
      ['SET-001', 'ORD-001', '2026-07-19', 299, 15, 10, 274]
    ];
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    console.log('Workbook buffer generated successfully. Invoking parser...');
    const result = await ExcelService.parseAndImport(buffer, 'SETTLEMENT', 1);
    console.log('Result:', result);
  } catch (err: any) {
    console.error('CRITICAL ERROR:', err.stack || err.message);
  }
}

runTest();
