import { query, executeTransaction } from '../config/db.js';
export const getProducts = async (req, res) => {
    try {
        const products = await query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(products);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const getProductBySku = async (req, res) => {
    const { sku } = req.params;
    try {
        const rows = await query('SELECT * FROM products WHERE sku = ?', [sku]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const createProduct = async (req, res) => {
    const { sku, name, supplier, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses, inventory_qty } = req.body;
    if (!sku || !name) {
        return res.status(400).json({ error: 'SKU and Name are required.' });
    }
    const user = req.user;
    try {
        await executeTransaction(async (conn) => {
            // Check duplicate
            const [existing] = await conn.execute('SELECT sku FROM products WHERE sku = ?', [sku]);
            if (existing.length > 0) {
                throw new Error('Product with this SKU already exists.');
            }
            await conn.execute(`INSERT INTO products (
          sku, name, supplier, purchase_cost, packaging_cost,
          bubble_wrap_cost, tape_cost, sticker_cost, labor_cost,
          other_expenses, inventory_qty
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                sku, name, supplier || null, purchase_cost || 0, packaging_cost || 0,
                bubble_wrap_cost || 0, tape_cost || 0, sticker_cost || 0, labor_cost || 0,
                other_expenses || 0, inventory_qty || 0
            ]);
            // Log cost history
            await conn.execute(`INSERT INTO product_cost_history (
          sku, purchase_cost, packaging_cost, bubble_wrap_cost,
          tape_cost, sticker_cost, labor_cost, other_expenses, changed_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                sku, purchase_cost || 0, packaging_cost || 0, bubble_wrap_cost || 0,
                tape_cost || 0, sticker_cost || 0, labor_cost || 0, other_expenses || 0,
                user.id
            ]);
            // Log inventory movement if initial qty > 0
            if (inventory_qty > 0) {
                await conn.execute(`INSERT INTO inventory_movements (sku, movement_type, quantity, notes, created_by)
           VALUES (?, 'IMPORT', ?, ?, ?)`, [sku, inventory_qty, 'Initial stock entry upon product creation.', user.id]);
            }
        });
        // Audit log
        await query('INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)', [
            user.id,
            'CREATE_PRODUCT',
            'INVENTORY',
            `Created product SKU: ${sku}, Qty: ${inventory_qty}`
        ]);
        res.status(201).json({ message: 'Product created successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const updateProduct = async (req, res) => {
    const { sku } = req.params;
    const { name, supplier, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses, inventory_qty } = req.body;
    const user = req.user;
    try {
        await executeTransaction(async (conn) => {
            // Get current values
            const [currentRows] = await conn.execute('SELECT * FROM products WHERE sku = ?', [sku]);
            if (currentRows.length === 0) {
                throw new Error('Product not found.');
            }
            const current = currentRows[0];
            // Check if costs changed
            const costChanged = parseFloat(current.purchase_cost) !== parseFloat(purchase_cost || '0') ||
                parseFloat(current.packaging_cost) !== parseFloat(packaging_cost || '0') ||
                parseFloat(current.bubble_wrap_cost) !== parseFloat(bubble_wrap_cost || '0') ||
                parseFloat(current.tape_cost) !== parseFloat(tape_cost || '0') ||
                parseFloat(current.sticker_cost) !== parseFloat(sticker_cost || '0') ||
                parseFloat(current.labor_cost) !== parseFloat(labor_cost || '0') ||
                parseFloat(current.other_expenses) !== parseFloat(other_expenses || '0');
            // Update product
            await conn.execute(`UPDATE products SET 
          name = ?, supplier = ?, purchase_cost = ?, packaging_cost = ?,
          bubble_wrap_cost = ?, tape_cost = ?, sticker_cost = ?, labor_cost = ?,
          other_expenses = ?, inventory_qty = ?
         WHERE sku = ?`, [
                name || current.name, supplier || current.supplier, purchase_cost || 0, packaging_cost || 0,
                bubble_wrap_cost || 0, tape_cost || 0, sticker_cost || 0, labor_cost || 0,
                other_expenses || 0, inventory_qty || 0, sku
            ]);
            // Record cost history if changed
            if (costChanged) {
                await conn.execute(`INSERT INTO product_cost_history (
            sku, purchase_cost, packaging_cost, bubble_wrap_cost,
            tape_cost, sticker_cost, labor_cost, other_expenses, changed_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    sku, purchase_cost || 0, packaging_cost || 0, bubble_wrap_cost || 0,
                    tape_cost || 0, sticker_cost || 0, labor_cost || 0, other_expenses || 0,
                    user.id
                ]);
            }
            // Record stock movement if stock adjusted manually
            const stockDiff = (inventory_qty || 0) - current.inventory_qty;
            if (stockDiff !== 0) {
                await conn.execute(`INSERT INTO inventory_movements (sku, movement_type, quantity, notes, created_by)
           VALUES (?, 'MANUAL_ADJUSTMENT', ?, ?, ?)`, [sku, stockDiff, 'Manual stock adjustment.', user.id]);
            }
        });
        // Audit log
        await query('INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)', [
            user.id,
            'UPDATE_PRODUCT',
            'INVENTORY',
            `Updated product SKU: ${sku}`
        ]);
        res.json({ message: 'Product updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteProduct = async (req, res) => {
    const { sku } = req.params;
    const user = req.user;
    try {
        await query('DELETE FROM products WHERE sku = ?', [sku]);
        await query('INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)', [
            user.id,
            'DELETE_PRODUCT',
            'INVENTORY',
            `Deleted product SKU: ${sku}`
        ]);
        res.json({ message: 'Product deleted successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
