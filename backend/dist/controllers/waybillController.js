import { query, executeTransaction } from '../config/db.js';
import OCRService from '../services/ocrService.js';
export const uploadWaybills = async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Please upload at least one waybill file.' });
    }
    const user = req.user;
    const results = [];
    const errors = [];
    for (const file of files) {
        try {
            // Process file through OCR and Order Matching logic
            const extracted = await OCRService.processWaybill(file.buffer, file.originalname, file.mimetype);
            // Save file to disk or simulated file store path (e.g. uploads/waybills/...)
            const filePath = `uploads/waybills/${Date.now()}-${file.originalname}`;
            // Keep track of the insertion
            await executeTransaction(async (conn) => {
                // Double check duplicate tracking upload
                const [existing] = await conn.execute('SELECT id FROM waybills WHERE tracking_number = ?', [
                    extracted.trackingNumber || `TEMP-${Date.now()}-${Math.random()}`
                ]);
                if (existing.length > 0) {
                    throw new Error(`Tracking number ${extracted.trackingNumber} already uploaded.`);
                }
                const [insertRes] = await conn.execute(`INSERT INTO waybills (
            order_id, tracking_number, customer_name, phone_number,
            shipping_address, courier, barcode_data, qr_data, file_path, ocr_text,
            is_matched, matched_method
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    extracted.orderId || null,
                    extracted.trackingNumber || `UNREADABLE-${Date.now()}`,
                    extracted.customerName || null,
                    extracted.phoneNumber || null,
                    extracted.shippingAddress || null,
                    extracted.courier || null,
                    extracted.barcodeData || null,
                    extracted.qrData || null,
                    filePath,
                    extracted.ocrText,
                    extracted.isMatched,
                    extracted.matchedMethod
                ]);
                const waybillId = insertRes.insertId;
                // If not matched, write to the manual review queue
                if (!extracted.isMatched) {
                    let reason = 'Order ID or Tracking number could not be found in orders database.';
                    if (!extracted.orderId && !extracted.trackingNumber) {
                        reason = 'Unreadable label (could not extract tracking tags or order ID).';
                    }
                    await conn.execute(`INSERT INTO waybill_review_queue (waybill_id, tracking_number, ocr_text, reason)
             VALUES (?, ?, ?, ?)`, [waybillId, extracted.trackingNumber || null, extracted.ocrText, reason]);
                }
            });
            results.push({
                fileName: file.originalname,
                success: true,
                extracted: {
                    orderId: extracted.orderId,
                    trackingNumber: extracted.trackingNumber,
                    customerName: extracted.customerName,
                    courier: extracted.courier,
                    isMatched: extracted.isMatched
                }
            });
        }
        catch (err) {
            errors.push(`File ${file.originalname}: ${err.message}`);
        }
    }
    // Audit log
    await query("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'WAYBILL_UPLOAD', 'WAYBILLS', ?)", [user.id, `Uploaded ${results.length} waybills. Failures: ${errors.length}`]);
    res.json({
        success: true,
        processedCount: results.length,
        results,
        errors
    });
};
export const getWaybills = async (req, res) => {
    const { search, isMatched } = req.query;
    try {
        let sql = 'SELECT * FROM waybills WHERE 1=1';
        const params = [];
        if (search) {
            sql += ' AND (tracking_number LIKE ? OR order_id LIKE ? OR customer_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (isMatched === 'true') {
            sql += ' AND is_matched = TRUE';
        }
        else if (isMatched === 'false') {
            sql += ' AND is_matched = FALSE';
        }
        sql += ' ORDER BY uploaded_at DESC LIMIT 500';
        const list = await query(sql, params);
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const getReviewQueue = async (req, res) => {
    try {
        const list = await query(`
      SELECT q.*, w.file_path, w.courier, w.customer_name, w.phone_number
      FROM waybill_review_queue q
      JOIN waybills w ON q.waybill_id = w.id
      WHERE q.is_resolved = FALSE
      ORDER BY q.id ASC
    `);
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
/**
 * Resolve unmatched waybills by manual connection
 */
export const resolveReviewItem = async (req, res) => {
    const { queueId } = req.params;
    const { orderId } = req.body;
    const user = req.user;
    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required to link waybill.' });
    }
    try {
        await executeTransaction(async (conn) => {
            // Find queue details
            const [queueRows] = await conn.execute('SELECT waybill_id FROM waybill_review_queue WHERE id = ? AND is_resolved = FALSE', [queueId]);
            if (queueRows.length === 0) {
                throw new Error('Queue item not found or already resolved.');
            }
            const waybillId = queueRows[0].waybill_id;
            // Find order details
            const [orderRows] = await conn.execute('SELECT order_id, tracking_number FROM orders WHERE order_id = ?', [orderId]);
            if (orderRows.length === 0) {
                throw new Error(`Order ID ${orderId} does not exist in the orders report database.`);
            }
            const order = orderRows[0];
            // Update Waybill
            await conn.execute(`UPDATE waybills 
         SET order_id = ?, tracking_number = ?, is_matched = TRUE, matched_method = 'MANUAL'
         WHERE id = ?`, [order.order_id, order.tracking_number || 'MANUAL-LINKED', waybillId]);
            // Update Queue status
            await conn.execute(`UPDATE waybill_review_queue 
         SET is_resolved = TRUE, resolved_by = ?, resolved_at = NOW()
         WHERE id = ?`, [user.id, queueId]);
        });
        // Audit log
        await query("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, 'RESOLVE_WAYBILL', 'WAYBILLS', ?)", [user.id, `Manually resolved waybill queue ID: ${queueId} to Order: ${orderId}`]);
        res.json({ success: true, message: 'Waybill successfully linked and resolved.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
