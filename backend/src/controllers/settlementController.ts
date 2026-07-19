import { Request, Response } from 'express';
import { query, executeTransaction } from '../config/db.js';
import ExcelService from '../services/excelService.js';
import ProfitEngine from '../services/profitEngine.js';

export const importExcelReport = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an Excel file.' });
  }

  const { type } = req.body; // 'ORDER', 'SETTLEMENT', 'RETURN', etc.
  if (!type) {
    return res.status(400).json({ error: 'Please specify report type.' });
  }

  const user = (req as any).user;

  try {
    const result = await ExcelService.parseAndImport(req.file.buffer, type, user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSettlements = async (req: Request, res: Response) => {
  const { search, startDate, endDate, isDiscrepancy } = req.query;

  try {
    let sql = `
      SELECT s.*, o.courier, o.order_status, o.customer_name
      FROM settlements s
      LEFT JOIN orders o ON s.order_id = o.order_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (s.settlement_id LIKE ? OR s.order_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (startDate && endDate) {
      sql += ' AND s.statement_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (isDiscrepancy === 'true') {
      // Discrepancy: e.g. return shipping cost occurred, or net profit is negative
      sql += ' AND (s.net_profit < 0 OR s.return_loss > 0 OR s.refund > 0)';
    }

    sql += ' ORDER BY s.statement_date DESC LIMIT 1000';

    const list = await query(sql, params) as any[];
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Recompute net profit margins for all settlements.
 * Useful when COGS/Packaging costs are modified.
 */
export const recalculateSettlements = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    let updatedCount = 0;
    
    await executeTransaction(async (conn) => {
      // Get all settlements
      const [settlements] = await conn.execute('SELECT * FROM settlements');
      
      for (const sett of settlements as any[]) {
        const orderId = sett.order_id;
        if (!orderId) continue;

        // Get items for the order
        const [orderItems] = await conn.execute(
          'SELECT sku, quantity FROM order_items WHERE order_id = ?',
          [orderId]
        );

        const itemsList = (orderItems as any[]).map(item => ({
          sku: item.sku || '',
          quantity: item.quantity
        }));

        const skus = itemsList.map(item => item.sku).filter(sku => sku !== '');
        
        let totalCogs = 0;
        if (skus.length > 0) {
          const costMap = new Map<string, any>();
          const placeholders = skus.map(() => '?').join(',');
          
          const [products] = await conn.execute(
            `SELECT sku, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses
             FROM products WHERE sku IN (${placeholders})`,
            skus
          );

          (products as any[]).forEach(p => {
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
          refund: parseFloat(sett.refund),
          return_loss: parseFloat(sett.return_loss),
          tax: parseFloat(sett.tax)
        };

        const calculated = ProfitEngine.calculateProfit(financials, totalCogs);

        // Update settlement record
        await conn.execute(
          `UPDATE settlements 
           SET statement_amount = ?, net_profit = ?
           WHERE id = ?`,
          [calculated.statement_amount, calculated.net_profit, sett.id]
        );
        updatedCount++;
      }
    });

    // Log action
    await query(
      "INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'RECALCULATE_FINANCES', 'FINANCE', ?)",
      [user.id, `Triggered bulk recalculation for ${updatedCount} orders.`]
    );

    res.json({ success: true, message: `Recalculation complete. Updated ${updatedCount} settlements.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
