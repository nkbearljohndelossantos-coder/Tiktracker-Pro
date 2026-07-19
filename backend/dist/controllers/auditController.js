import { query } from '../config/db.js';
export const getAuditLogs = async (req, res) => {
    try {
        const list = await query(`
      SELECT a.*, u.username, u.role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 1000
    `);
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
