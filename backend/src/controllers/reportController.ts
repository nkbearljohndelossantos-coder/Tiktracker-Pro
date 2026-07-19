import { Request, Response } from 'express';
import xlsx from 'xlsx';
import { query } from '../config/db.js';

export const getReportData = async (req: Request, res: Response) => {
  const { startDate, endDate, grouping } = req.query; // grouping: 'daily' | 'weekly' | 'monthly' | 'yearly'

  try {
    let selectClause = 'DATE(s.statement_date) as period';
    let groupBy = 'DATE(s.statement_date)';

    if (grouping === 'weekly') {
      selectClause = 'YEARWEEK(s.statement_date) as period';
      groupBy = 'YEARWEEK(s.statement_date)';
    } else if (grouping === 'monthly') {
      selectClause = 'DATE_FORMAT(s.statement_date, "%Y-%m") as period';
      groupBy = 'DATE_FORMAT(s.statement_date, "%Y-%m")';
    } else if (grouping === 'yearly') {
      selectClause = 'YEAR(s.statement_date) as period';
      groupBy = 'YEAR(s.statement_date)';
    }

    const sql = `
      SELECT 
        ${selectClause},
        COUNT(DISTINCT s.order_id) AS order_count,
        SUM(s.gross_sales) AS gross_sales,
        SUM(s.tiktok_fees) AS tiktok_fees,
        SUM(s.affiliate_commission) AS affiliate_commission,
        SUM(s.shipping_fee_actual) AS shipping_fee_actual,
        SUM(s.shipping_fee_subsidy) AS shipping_fee_subsidy,
        SUM(s.platform_discount) AS platform_discount,
        SUM(s.adjustments) AS adjustments,
        SUM(s.refund) AS refund,
        SUM(s.return_loss) AS return_loss,
        SUM(s.tax) AS tax,
        SUM(s.statement_amount) AS payout,
        SUM(s.net_profit) AS net_profit
      FROM settlements s
      WHERE s.statement_date BETWEEN ? AND ?
      GROUP BY ${groupBy}
      ORDER BY period DESC
    `;

    const data = await query(sql, [startDate || '1970-01-01', endDate || '2099-12-31']) as any[];
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const exportReport = async (req: Request, res: Response) => {
  const { startDate, endDate, format } = req.query; // format: 'csv' | 'xlsx'

  try {
    const sql = `
      SELECT 
        s.settlement_id AS 'Settlement ID',
        s.order_id AS 'Order ID',
        s.statement_date AS 'Date',
        s.gross_sales AS 'Gross Sales',
        s.tiktok_fees AS 'Fees',
        s.affiliate_commission AS 'Affiliate Comm.',
        s.shipping_fee_actual AS 'Actual Shipping',
        s.shipping_fee_subsidy AS 'Shipping Subsidy',
        s.platform_discount AS 'Voucher Discount',
        s.adjustments AS 'Adjustments',
        s.refund AS 'Refund',
        s.return_loss AS 'Return Loss',
        s.statement_amount AS 'Payout Amount',
        s.net_profit AS 'Net Profit'
      FROM settlements s
      WHERE s.statement_date BETWEEN ? AND ?
      ORDER BY s.statement_date DESC
    `;

    const data = await query(sql, [startDate || '1970-01-01', endDate || '2099-12-31']) as any[];

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => 
        Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      );
      const csvContent = [headers, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=financial_report_${Date.now()}.csv`);
      return res.send(csvContent);
    } else {
      // Default: XLSX Excel
      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Financial Reconcile');
      
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=financial_report_${Date.now()}.xlsx`);
      return res.send(buffer);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
