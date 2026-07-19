import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const list = await query('SELECT * FROM system_settings') as any[];
    const settingsObj: Record<string, string> = {};
    list.forEach(row => {
      settingsObj[row.setting_key] = row.setting_value;
    });
    res.json(settingsObj);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const settings = req.body; // Record<string, string>
  const user = (req as any).user;

  try {
    for (const [key, val] of Object.entries(settings)) {
      await query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [key, val, val]
      );
    }

    // Audit log
    await query(
      "INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'UPDATE_SETTINGS', 'SYSTEM', ?)",
      [user.id, `Updated settings: ${Object.keys(settings).join(', ')}`]
    );

    res.json({ message: 'Settings updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Creates a system backup by exporting MySQL tables as a portable JSON package.
 */
export const backupDatabase = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const tables = [
      'users', 'system_settings', 'products', 'product_cost_history',
      'orders', 'order_items', 'settlements', 'waybills',
      'waybill_review_queue', 'returns', 'inventory_movements'
    ];

    const backupData: Record<string, any[]> = {};

    for (const table of tables) {
      const rows = await query(`SELECT * FROM ${table}`) as any[];
      backupData[table] = rows;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tiktracker_backup_${Date.now()}.json`);
    
    // Audit log
    await query(
      "INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'DATABASE_BACKUP', 'SYSTEM', 'Triggered database export backup.')",
      [user.id]
    );

    res.send(JSON.stringify(backupData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
