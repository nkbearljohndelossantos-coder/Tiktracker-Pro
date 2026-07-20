import { SettlementParser } from '../../services/importer/settlementParser.js';
import xlsx from 'xlsx';

async function runTests() {
  console.log('--- Starting Enterprise Importer Tests ---');

  // Test 1: Old Format
  try {
    const oldFormatData = [
      ['Settlement ID', 'Order ID', 'Transaction Type', 'Order Created Time', 'Currency', 'Statement Date', 'Gross Sales', 'TikTok Fees', 'Net Payout'],
      ['SET-OLD-1', 'ORD-101', 'Order', '2026-07-19', 'PHP', '2026-07-20 10:00:00', '1000.00', '150.00', '850.00']
    ];
    console.log('\n[Test 1] Running Old Format Test...');
    await testParser('Old_Format', oldFormatData, 'Settlement Details');
  } catch(e) { console.error(e); }

  // Test 2: New Format (with Blank columns and extra ignored columns)
  try {
    const newFormatData = [
      ['Order/Adjustment ID', 'Related Order ID', '', 'Transaction Type', 'Order Created Time', 'Currency', 'Order Settled Time', 'Total Revenue', 'Unknown Column XYZ', 'Transaction Fee'],
      ['SET-NEW-1', 'ORD-202', 'Some garbage', 'Order', '2026-07-20', 'PHP', '2026-07-21 12:00:00', '2000.00', 'Ignore Me', '300.00']
    ];
    console.log('\n[Test 2] Running New Format Test (Blank columns + Extra Columns)...');
    await testParser('New_Format', newFormatData, 'Transaction Details');
  } catch(e) { console.error(e); }

  // Test 3: Missing Optional Columns safely default to 0
  try {
    const minFormatData = [
      ['Order ID', 'Transaction Type', 'Currency', 'Order Created Time', 'Order Settled Time'],
      ['SET-MIN-1', 'Order', 'PHP', '2026-07-20', '2026-07-20']
    ];
    console.log('\n[Test 3] Running Minimum Required Columns Test...');
    await testParser('Min_Format', minFormatData, 'Random Sheet Name');
  } catch(e) { console.error(e); }
  
  // Test 4: Missing Required Fields (Should Fail Gracefully)
  try {
    const badFormatData = [
      ['Gross Sales', 'TikTok Fees', 'Net Payout'],
      ['1000.00', '150.00', '850.00']
    ];
    console.log('\n[Test 4] Running Missing Required Fields Test...');
    await testParser('Bad_Format', badFormatData, 'Order details');
  } catch(e) { console.error(e); }
}

async function testParser(testName: string, data: any[][], sheetName: string) {
  const ws = xlsx.utils.aoa_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Dummy user ID = 1
  const result = await SettlementParser.parseAndImport(buffer, 1);
  console.log(`[Result] ${testName} Success: ${result.success}`);
  if (result.log) {
    console.log(`  Imported Rows: ${result.log.importedRows}`);
    console.log(`  Skipped/Duplicates: ${result.log.skippedRows}`);
    console.log(`  Errors: ${result.log.errors.length}`);
    if (result.log.errors.length > 0) {
      console.log('  Sample Error:', result.log.errors[0].reason);
    }
  }
}

runTests().then(() => {
  console.log('\n--- Tests Completed ---');
  process.exit(0);
});
