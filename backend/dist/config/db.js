import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Diagnostic Dotenv Loader for Production
const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../../.env')
];
let loadedEnvPath = '';
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        loadedEnvPath = p;
        break;
    }
}
if (loadedEnvPath) {
    console.log(`✔ Loaded environment variables from: ${loadedEnvPath}`);
}
else {
    console.warn('❌ WARNING: No .env file found in expected paths:', envPaths);
}
console.log('Database Connection Diagnostic Config:');
console.log('  DB_HOST:', process.env.DB_HOST || '(not set)');
console.log('  DB_USER:', process.env.DB_USER || '(not set)');
console.log('  DB_NAME:', process.env.DB_NAME || '(not set)');
console.log('  DB_PORT:', process.env.DB_PORT || '(not set)');
console.log('  NODE_ENV:', process.env.NODE_ENV || '(not set)');
let isDatabaseOnline = false;
let pool = null;
// Sandbox In-Memory Data Store (Fallback if MySQL is offline)
const memoryStore = {
    users: [
        { id: 1, username: 'admin', password_hash: '$2a$10$lthiuG3Kty8/Xq4OSpSIoOAyk5KzKqbYZUnNpHqmWHWmIHJyceVo2', email: 'admin@tiktrackerpro.com', role: 'SUPER_ADMIN' },
        { id: 2, username: 'manager', password_hash: '$2a$10$BRYpAHzDHGWX8cgNwTR2vupfXUHCRbxrVIJYcVRSm4R5H9McbJpWy', email: 'manager@tiktrackerpro.com', role: 'MANAGER' },
        { id: 3, username: 'staff', password_hash: '$2a$10$lrmtQO9N0Ap7OI1VL4FwtO8.86.vBC6yMSA0d23acUBzZG1fhbJKm', email: 'staff@tiktrackerpro.com', role: 'STAFF' },
        { id: 4, username: 'viewer', password_hash: '$2a$10$5faUN3XJsnypHt09WXENBuomI7.oYi0fBMh6GW2A39fzeVkQ7sXbe', email: 'viewer@tiktrackerpro.com', role: 'VIEWER' }
    ],
    refresh_tokens: [],
    products: [],
    product_cost_history: [],
    orders: [],
    order_items: [],
    settlements: [],
    waybills: [],
    waybill_review_queue: [],
    returns: [],
    inventory_movements: [],
    system_settings: [
        { setting_key: 'company_name', setting_value: 'NKB Manufacturing Corp.' },
        { setting_key: 'currency', setting_value: 'PHP' },
        { setting_key: 'low_stock_threshold', setting_value: '20' },
        { setting_key: 'ocr_confidence_threshold', setting_value: '60' },
        { setting_key: 'profit_warning_threshold', setting_value: '15.00' }
    ],
    audit_logs: []
};
export const initializeDatabaseSchema = async () => {
    if (!pool)
        return;
    try {
        const [tables] = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'users'
    `);
        if (tables && tables[0] && tables[0].count === 0) {
            console.log('Database empty. Automatically initializing schema...');
            let schemaPath = path.join(__dirname, '../database/schema.sql');
            let seedsPath = path.join(__dirname, '../database/seeds.sql');
            if (!fs.existsSync(schemaPath)) {
                schemaPath = path.join(__dirname, '../../../database/schema.sql');
            }
            if (!fs.existsSync(seedsPath)) {
                seedsPath = path.join(__dirname, '../../../database/seeds.sql');
            }
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await pool.query(schemaSql);
                console.log('✔ Database schema initialized successfully.');
            }
            else {
                console.warn('❌ Database schema file not found at:', schemaPath);
            }
            if (fs.existsSync(seedsPath)) {
                const seedsSql = fs.readFileSync(seedsPath, 'utf8');
                await pool.query(seedsSql);
                console.log('✔ Database seeds loaded successfully.');
            }
            else {
                console.warn('❌ Database seeds file not found at:', seedsPath);
            }
        }
        else {
            console.log('Database already initialized. Skipping auto-migration.');
        }
    }
    catch (err) {
        console.error('Failed to initialize database schema:', err.message);
    }
};
// Initialize Pool
try {
    pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tiktracker_pro',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        multipleStatements: true
    });
    pool.getConnection()
        .then(async (conn) => {
        console.log('Database connected successfully. Running in MySQL mode.');
        isDatabaseOnline = true;
        conn.release();
        // Auto-run schema migrations
        await initializeDatabaseSchema();
    })
        .catch((err) => {
        console.warn('MySQL connection failed:', err.message || err);
        console.warn('Starting in Sandboxed In-Memory Fallback mode.');
        isDatabaseOnline = false;
    });
}
catch (err) {
    console.warn('MySQL Configuration missing. Starting in Sandboxed In-Memory Fallback mode.');
    isDatabaseOnline = false;
}
export const query = async (sql, params = []) => {
    if (isDatabaseOnline && pool) {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        }
        catch (err) {
            console.error('MySQL execution error, falling back to memory:', err);
        }
    }
    // --- SMART MOCK QUERY RESOLVER ---
    const cleanedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    // 1. Users login lookup
    if (cleanedSql.includes('select * from users where username = ?')) {
        const user = memoryStore.users.find(u => u.username === params[0]);
        return user ? [user] : [];
    }
    if (cleanedSql.includes('select id, username, role, email from users where id = ?')) {
        const user = memoryStore.users.find(u => u.id === params[0]);
        return user ? [user] : [];
    }
    if (cleanedSql.includes('insert into users')) {
        const id = memoryStore.users.length + 1;
        memoryStore.users.push({
            id,
            username: params[0],
            password_hash: params[1],
            email: params[2],
            role: params[3],
            created_at: new Date().toISOString()
        });
        return { insertId: id };
    }
    // 2. Refresh Tokens
    if (cleanedSql.includes('select * from refresh_tokens where token = ?')) {
        const tokenObj = memoryStore.refresh_tokens.find(t => t.token === params[0]);
        return tokenObj ? [tokenObj] : [];
    }
    if (cleanedSql.includes('insert into refresh_tokens')) {
        memoryStore.refresh_tokens.push({
            user_id: params[0],
            token: params[1],
            expires_at: params[2]
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('delete from refresh_tokens where token = ?')) {
        memoryStore.refresh_tokens = memoryStore.refresh_tokens.filter(t => t.token !== params[0]);
        return { affectedRows: 1 };
    }
    // 3. Products
    if (cleanedSql.includes('select * from products')) {
        if (cleanedSql.includes('where sku = ?')) {
            const prod = memoryStore.products.find(p => p.sku === params[0]);
            return prod ? [prod] : [];
        }
        if (cleanedSql.includes('where sku in')) {
            // Fetch matching SKUs
            const skusSet = new Set(params);
            return memoryStore.products.filter(p => skusSet.has(p.sku));
        }
        return memoryStore.products;
    }
    if (cleanedSql.includes('insert into products')) {
        memoryStore.products.push({
            sku: params[0], name: params[1], supplier: params[2],
            purchase_cost: params[3], packaging_cost: params[4],
            bubble_wrap_cost: params[5], tape_cost: params[6],
            sticker_cost: params[7], labor_cost: params[8],
            other_expenses: params[9], inventory_qty: params[10]
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('update products set')) {
        const sku = params[params.length - 1];
        const index = memoryStore.products.findIndex(p => p.sku === sku);
        if (index !== -1) {
            memoryStore.products[index] = {
                ...memoryStore.products[index],
                name: params[0], supplier: params[1],
                purchase_cost: params[2], packaging_cost: params[3],
                bubble_wrap_cost: params[4], tape_cost: params[5],
                sticker_cost: params[6], labor_cost: params[7],
                other_expenses: params[8], inventory_qty: params[9]
            };
        }
        return { affectedRows: 1 };
    }
    // 4. System Settings
    if (cleanedSql.includes('select * from system_settings')) {
        return memoryStore.system_settings;
    }
    if (cleanedSql.includes('insert into system_settings')) {
        const key = params[0];
        const val = params[1];
        const index = memoryStore.system_settings.findIndex(s => s.setting_key === key);
        if (index !== -1) {
            memoryStore.system_settings[index].setting_value = val;
        }
        else {
            memoryStore.system_settings.push({ setting_key: key, setting_value: val });
        }
        return { affectedRows: 1 };
    }
    // 5. Orders & Items
    if (cleanedSql.includes('select distinct o.*, s.settlement_id')) {
        // Return all orders mapped with their payouts
        return memoryStore.orders.map(o => {
            const s = memoryStore.settlements.find(sett => sett.order_id === o.order_id);
            return {
                ...o,
                settlement_id: s ? s.settlement_id : null,
                net_profit: s ? String(s.net_profit) : null,
                statement_amount: s ? String(s.statement_amount) : null
            };
        });
    }
    if (cleanedSql.includes('select * from orders where order_id = ?')) {
        const ord = memoryStore.orders.find(o => o.order_id === params[0]);
        return ord ? [ord] : [];
    }
    if (cleanedSql.includes('select oi.*, p.purchase_cost')) {
        const orderId = params[0];
        const items = memoryStore.order_items.filter(oi => oi.order_id === orderId);
        return items.map(item => {
            const p = memoryStore.products.find(prod => prod.sku === item.sku) || {};
            return { ...item, ...p };
        });
    }
    // 6. Settlements
    if (cleanedSql.includes('select s.*, o.courier')) {
        return memoryStore.settlements.map(s => {
            const o = memoryStore.orders.find(ord => ord.order_id === s.order_id) || {};
            return {
                ...s,
                courier: o.courier,
                order_status: o.order_status,
                customer_name: o.customer_name
            };
        });
    }
    if (cleanedSql.includes('select * from settlements')) {
        if (cleanedSql.includes('where order_id = ?')) {
            return memoryStore.settlements.filter(s => s.order_id === params[0]);
        }
        return memoryStore.settlements;
    }
    if (cleanedSql.includes('update settlements set')) {
        const id = params[params.length - 1];
        const index = memoryStore.settlements.findIndex(s => s.id === id);
        if (index !== -1) {
            memoryStore.settlements[index] = {
                ...memoryStore.settlements[index],
                refund: params[0],
                return_loss: params[1],
                statement_amount: params[2],
                net_profit: params[3]
            };
        }
        return { affectedRows: 1 };
    }
    // 7. Waybills & Review Queue
    if (cleanedSql.includes('select * from waybills')) {
        if (cleanedSql.includes('where order_id = ?')) {
            return memoryStore.waybills.filter(w => w.order_id === params[0]);
        }
        return memoryStore.waybills;
    }
    if (cleanedSql.includes('select q.*, w.file_path')) {
        return memoryStore.waybill_review_queue.filter(q => !q.is_resolved);
    }
    // 8. Returns
    if (cleanedSql.includes('select r.*, o.courier')) {
        return memoryStore.returns.map(r => {
            const o = memoryStore.orders.find(ord => ord.order_id === r.order_id) || {};
            const oi = memoryStore.order_items.find(item => item.order_id === r.order_id && item.sku === r.sku) || {};
            return {
                ...r,
                courier: o.courier,
                customer_name: o.customer_name,
                product_name: oi.product_name
            };
        });
    }
    // 9. Audit Logs
    if (cleanedSql.includes('select a.*, u.username')) {
        return memoryStore.audit_logs.map(a => {
            const u = memoryStore.users.find(usr => usr.id === a.user_id) || {};
            return { ...a, username: u.username, role: u.role };
        });
    }
    // --- SANDBOX WRITE OPERATIONS MAPPINGS ---
    if (cleanedSql.includes('insert into orders')) {
        memoryStore.orders.push({
            order_id: params[0],
            tracking_number: params[1],
            customer_name: params[2],
            phone_number: params[3],
            shipping_address: params[4],
            courier: params[5],
            order_status: params[6],
            total_amount: params[7],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('insert into order_items')) {
        memoryStore.order_items.push({
            id: memoryStore.order_items.length + 1,
            order_id: params[0],
            sku: params[1],
            product_name: params[2],
            variation: params[3],
            quantity: params[4],
            price: params[5]
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('insert into settlements')) {
        memoryStore.settlements.push({
            id: memoryStore.settlements.length + 1,
            settlement_id: params[0],
            order_id: params[1],
            statement_date: params[2] || new Date().toISOString(),
            gross_sales: parseFloat(params[3] || 0),
            tiktok_fees: parseFloat(params[4] || 0),
            affiliate_commission: parseFloat(params[5] || 0),
            shipping_fee_subsidy: parseFloat(params[6] || 0),
            shipping_fee_actual: parseFloat(params[7] || 0),
            platform_discount: parseFloat(params[8] || 0),
            adjustments: parseFloat(params[9] || 0),
            refund: parseFloat(params[10] || 0),
            return_loss: parseFloat(params[11] || 0),
            tax: parseFloat(params[12] || 0),
            statement_amount: parseFloat(params[13] || 0),
            net_profit: parseFloat(params[14] || 0),
            raw_data_json: params[15]
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('insert into waybills')) {
        memoryStore.waybills.push({
            id: memoryStore.waybills.length + 1,
            order_id: params[0],
            tracking_number: params[1],
            customer_name: params[2],
            phone_number: params[3],
            shipping_address: params[4],
            courier: params[5],
            barcode_data: params[6],
            qr_data: params[7],
            is_matched: params[8] === true,
            matched_method: params[9],
            uploaded_at: new Date().toISOString()
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('insert into returns')) {
        memoryStore.returns.push({
            id: memoryStore.returns.length + 1,
            return_id: params[0],
            order_id: params[1],
            sku: params[2],
            tracking_number: params[3],
            scan_date: params[4] || new Date().toISOString(),
            reason: params[5],
            condition_status: params[6],
            return_shipping_cost: params[7],
            refunded_amount: params[8],
            returned_to_inventory: params[9] === true
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('insert into inventory_movements')) {
        memoryStore.inventory_movements.push({
            id: memoryStore.inventory_movements.length + 1,
            sku: params[0],
            movement_type: params[1],
            quantity: params[2],
            notes: params[3],
            created_by: params[4],
            created_at: new Date().toISOString()
        });
        return { affectedRows: 1 };
    }
    if (cleanedSql.includes('insert into audit_logs')) {
        memoryStore.audit_logs.push({
            id: memoryStore.audit_logs.length + 1,
            user_id: params[0],
            action: params[1],
            module: params[2],
            details: params[3],
            ip_address: params[4] || '127.0.0.1',
            created_at: new Date().toISOString()
        });
        return { affectedRows: 1 };
    }
    // Fallback defaults for writes and updates
    if (cleanedSql.startsWith('insert into') || cleanedSql.startsWith('update') || cleanedSql.startsWith('delete')) {
        return { affectedRows: 1, insertId: Date.now() };
    }
    return [];
};
export const executeTransaction = async (callback) => {
    if (isDatabaseOnline && pool) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    // Sandbox Transaction simulator (runs callback on mock connection)
    const connectionMock = {
        execute: async (sqlStr, parameters = []) => {
            const res = await query(sqlStr, parameters);
            return [res];
        }
    };
    return await callback(connectionMock);
};
export default pool;
