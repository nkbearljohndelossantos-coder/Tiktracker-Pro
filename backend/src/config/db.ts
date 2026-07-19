import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let isDatabaseOnline = false;
let pool: mysql.Pool | null = null;

// Sandbox In-Memory Data Store (Fallback if MySQL is offline)
const memoryStore = {
  users: [
    { id: 1, username: 'admin', password_hash: '$2a$10$lthiuG3Kty8/Xq4OSpSIoOAyk5KzKqbYZUnNpHqmWHWmIHJyceVo2', email: 'admin@tiktrackerpro.com', role: 'SUPER_ADMIN' },
    { id: 2, username: 'manager', password_hash: '$2a$10$BRYpAHzDHGWX8cgNwTR2vupfXUHCRbxrVIJYcVRSm4R5H9McbJpWy', email: 'manager@tiktrackerpro.com', role: 'MANAGER' },
    { id: 3, username: 'staff', password_hash: '$2a$10$lrmtQO9N0Ap7OI1VL4FwtO8.86.vBC6yMSA0d23acUBzZG1fhbJKm', email: 'staff@tiktrackerpro.com', role: 'STAFF' },
    { id: 4, username: 'viewer', password_hash: '$2a$10$5faUN3XJsnypHt09WXENBuomI7.oYi0fBMh6GW2A39fzeVkQ7sXbe', email: 'viewer@tiktrackerpro.com', role: 'VIEWER' }
  ] as any[],
  refresh_tokens: [] as any[],
  products: [
    { sku: 'SKU-MUG-001', name: 'TikTracker Dynamic Ceramic Mug - Matte Black', supplier: 'Apex Supplier Ltd.', purchase_cost: 120.00, packaging_cost: 15.00, bubble_wrap_cost: 5.00, tape_cost: 2.00, sticker_cost: 1.50, labor_cost: 10.00, other_expenses: 1.50, inventory_qty: 150 },
    { sku: 'SKU-SHIRT-002', name: 'TikTracker Tech Premium Cotton Shirt - Navy Blue', supplier: 'Vibrant Loom Co.', purchase_cost: 180.00, packaging_cost: 10.00, bubble_wrap_cost: 2.00, tape_cost: 1.00, sticker_cost: 1.50, labor_cost: 10.00, other_expenses: 0.50, inventory_qty: 240 },
    { sku: 'SKU-HOODIE-003', name: 'TikTracker Oversized Fleece Hoodie - Sand', supplier: 'Vibrant Loom Co.', purchase_cost: 350.00, packaging_cost: 20.00, bubble_wrap_cost: 4.00, tape_cost: 2.00, sticker_cost: 1.50, labor_cost: 15.00, other_expenses: 2.50, inventory_qty: 95 },
    { sku: 'SKU-CAP-004', name: 'TikTracker Pro Retro Dad Cap - Pitch Black', supplier: 'TopCap Manufacturer', purchase_cost: 85.00, packaging_cost: 8.00, bubble_wrap_cost: 1.50, tape_cost: 1.00, sticker_cost: 1.50, labor_cost: 8.00, other_expenses: 0.00, inventory_qty: 45 },
    { sku: 'SKU-BOTTLE-005', name: 'TikTracker Insulated Steel Flask - 750ml Forest Green', supplier: 'HydroMakers Co.', purchase_cost: 280.00, packaging_cost: 25.00, bubble_wrap_cost: 8.00, tape_cost: 2.50, sticker_cost: 1.50, labor_cost: 12.00, other_expenses: 3.00, inventory_qty: 18 }
  ] as any[],
  product_cost_history: [] as any[],
  orders: [
    { order_id: '574919559123456789', tracking_number: 'JX123456789PH', customer_name: 'Juan Dela Cruz', phone_number: '+63 917 123 4567', shipping_address: 'Block 5 Lot 12, Moonwalk Phase 2, Paranaque City, Metro Manila', courier: 'J&T Express', order_status: 'COMPLETED', total_amount: 299.00, created_at: new Date('2026-07-10 10:15:00').toISOString(), updated_at: new Date('2026-07-12 14:30:00').toISOString(), imported_at: new Date().toISOString() },
    { order_id: '574919559123456790', tracking_number: 'SPX987654321', customer_name: 'Maria Clara', phone_number: '+63 918 765 4321', shipping_address: '142 Rizal Street, Angeles City, Pampanga', courier: 'Shopee Xpress', order_status: 'COMPLETED', total_amount: 399.00, created_at: new Date('2026-07-11 11:20:00').toISOString(), updated_at: new Date('2026-07-13 16:10:00').toISOString(), imported_at: new Date().toISOString() },
    { order_id: '574919559123456791', tracking_number: 'FLA555666777', customer_name: 'Jose Rizal', phone_number: '+63 919 999 8888', shipping_address: 'Calamba Plaza, Calamba City, Laguna', courier: 'Flash Express', order_status: 'COMPLETED', total_amount: 699.00, created_at: new Date('2026-07-12 09:05:00').toISOString(), updated_at: new Date('2026-07-14 11:45:00').toISOString(), imported_at: new Date().toISOString() },
    { order_id: '574919559123456792', tracking_number: 'JX123456795PH', customer_name: 'Andres Bonifacio', phone_number: '+63 920 111 2222', shipping_address: 'Monumento Circle, Caloocan City, Metro Manila', courier: 'J&T Express', order_status: 'COMPLETED', total_amount: 199.00, created_at: new Date('2026-07-13 13:40:00').toISOString(), updated_at: new Date('2026-07-15 15:20:00').toISOString(), imported_at: new Date().toISOString() },
    { order_id: '574919559123456793', tracking_number: 'JX123456796PH', customer_name: 'Emilio Aguinaldo', phone_number: '+63 921 333 4444', shipping_address: 'Aguinaldo Shrine, Kawit, Cavite', courier: 'J&T Express', order_status: 'REFUNDED', total_amount: 299.00, created_at: new Date('2026-07-14 15:50:00').toISOString(), updated_at: new Date('2026-07-16 10:05:00').toISOString(), imported_at: new Date().toISOString() },
    { order_id: '574919559123456794', tracking_number: 'JX123456797PH', customer_name: 'Gabriela Silang', phone_number: '+63 922 555 6666', shipping_address: 'Vigan Plaza, Vigan City, Ilocos Sur', courier: 'J&T Express', order_status: 'COMPLETED', total_amount: 580.00, created_at: new Date('2026-07-15 08:30:00').toISOString(), updated_at: new Date('2026-07-17 12:30:00').toISOString(), imported_at: new Date().toISOString() }
  ] as any[],
  order_items: [
    { id: 1, order_id: '574919559123456789', sku: 'SKU-MUG-001', product_name: 'TikTracker Dynamic Ceramic Mug - Matte Black', variation: 'Matte Black', quantity: 1, price: 299.00 },
    { id: 2, order_id: '574919559123456790', sku: 'SKU-SHIRT-002', product_name: 'TikTracker Tech Premium Cotton Shirt - Navy Blue', variation: 'Navy Blue - M', quantity: 1, price: 399.00 },
    { id: 3, order_id: '574919559123456791', sku: 'SKU-HOODIE-003', product_name: 'TikTracker Oversized Fleece Hoodie - Sand', variation: 'Sand - L', quantity: 1, price: 699.00 },
    { id: 4, order_id: '574919559123456792', sku: 'SKU-CAP-004', product_name: 'TikTracker Pro Retro Dad Cap - Pitch Black', variation: 'Default', quantity: 1, price: 199.00 },
    { id: 5, order_id: '574919559123456793', sku: 'SKU-MUG-001', product_name: 'TikTracker Dynamic Ceramic Mug - Matte Black', variation: 'Matte Black', quantity: 1, price: 299.00 },
    { id: 6, order_id: '574919559123456794', sku: 'SKU-MUG-001', product_name: 'TikTracker Dynamic Ceramic Mug - Matte Black', variation: 'Matte Black', quantity: 1, price: 299.00 },
    { id: 7, order_id: '574919559123456794', sku: 'SKU-CAP-004', product_name: 'TikTracker Pro Retro Dad Cap - Pitch Black', variation: 'Default', quantity: 1, price: 199.00 }
  ] as any[],
  settlements: [
    { id: 1, settlement_id: 'SET-2026-001', order_id: '574919559123456789', statement_date: new Date('2026-07-12 18:00:00').toISOString(), gross_sales: 299.00, tiktok_fees: 15.00, affiliate_commission: 15.00, shipping_fee_subsidy: 20.00, shipping_fee_actual: 20.00, platform_discount: 10.00, adjustments: 0.00, refund: 0.00, return_loss: 0.00, tax: 3.50, statement_amount: 245.50, net_profit: 90.50, imported_at: new Date().toISOString() },
    { id: 2, settlement_id: 'SET-2026-002', order_id: '574919559123456790', statement_date: new Date('2026-07-13 18:00:00').toISOString(), gross_sales: 399.00, tiktok_fees: 20.00, affiliate_commission: 0.00, shipping_fee_subsidy: 0.00, shipping_fee_actual: 35.00, platform_discount: 15.00, adjustments: 0.00, refund: 0.00, return_loss: 0.00, tax: 4.50, statement_amount: 324.50, net_profit: 119.50, imported_at: new Date().toISOString() },
    { id: 3, settlement_id: 'SET-2026-003', order_id: '574919559123456791', statement_date: new Date('2026-07-14 18:00:00').toISOString(), gross_sales: 699.00, tiktok_fees: 35.00, affiliate_commission: 35.00, shipping_fee_subsidy: 30.00, shipping_fee_actual: 40.00, platform_discount: 25.00, adjustments: 0.00, refund: 0.00, return_loss: 0.00, tax: 7.80, statement_amount: 556.20, net_profit: 141.20, imported_at: new Date().toISOString() },
    { id: 4, settlement_id: 'SET-2026-004', order_id: '574919559123456792', statement_date: new Date('2026-07-15 18:00:00').toISOString(), gross_sales: 199.00, tiktok_fees: 10.00, affiliate_commission: 10.00, shipping_fee_subsidy: 20.00, shipping_fee_actual: 20.00, platform_discount: 5.00, adjustments: 0.00, refund: 0.00, return_loss: 0.00, tax: 2.20, statement_amount: 151.80, net_profit: 46.80, imported_at: new Date().toISOString() },
    { id: 5, settlement_id: 'SET-2026-005', order_id: '574919559123456793', statement_date: new Date('2026-07-16 18:00:00').toISOString(), gross_sales: 299.00, tiktok_fees: 15.00, affiliate_commission: 0.00, shipping_fee_subsidy: 0.00, shipping_fee_actual: 0.00, platform_discount: 0.00, adjustments: 0.00, refund: 299.00, return_loss: 30.00, tax: 0.00, statement_amount: -344.00, net_profit: -499.00, imported_at: new Date().toISOString() },
    { id: 6, settlement_id: 'SET-2026-006', order_id: '574919559123456794', statement_date: new Date('2026-07-17 18:00:00').toISOString(), gross_sales: 498.00, tiktok_fees: 25.00, affiliate_commission: 25.00, shipping_fee_subsidy: 20.00, shipping_fee_actual: 30.00, platform_discount: 15.00, adjustments: 0.00, refund: 0.00, return_loss: 0.00, tax: 5.50, statement_amount: 397.50, net_profit: 137.50, imported_at: new Date().toISOString() }
  ] as any[],
  waybills: [
    { id: 1, order_id: '574919559123456789', tracking_number: 'JX123456789PH', customer_name: 'Juan Dela Cruz', phone_number: '+63 917 123 4567', shipping_address: 'Block 5 Lot 12, Moonwalk Phase 2, Paranaque City, Metro Manila', courier: 'J&T Express', barcode_data: '574919559123456789', qr_data: 'JX123456789PH', file_path: '', ocr_text: 'RECIPIENT: Juan Dela Cruz...', is_matched: true, matched_method: 'ORDER_ID', uploaded_at: new Date().toISOString() }
  ] as any[],
  waybill_review_queue: [
    { id: 1, waybill_id: 10, tracking_number: 'UNRESOLVED-789PH', ocr_text: 'RECIPIENT: Juan Luna\nTEL: 0917-888-8888\nADD: Manila Town Plaza\nSHIP: J&T Express\nTRACKING: JX888777999PH\nPRICE: COD 450.00', reason: 'Order ID or Tracking number could not be found in orders database.', is_resolved: false, resolved_by: null, resolved_at: null, file_path: '', courier: 'J&T Express', customer_name: 'Juan Luna', phone_number: '0917-888-8888' }
  ] as any[],
  returns: [] as any[],
  inventory_movements: [] as any[],
  system_settings: [
    { setting_key: 'company_name', setting_value: 'NKB Manufacturing Corp.' },
    { setting_key: 'currency', setting_value: 'PHP' },
    { setting_key: 'low_stock_threshold', setting_value: '20' },
    { setting_key: 'ocr_confidence_threshold', setting_value: '60' },
    { setting_key: 'profit_warning_threshold', setting_value: '15.00' }
  ] as any[],
  audit_logs: [] as any[]
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
    keepAliveInitialDelay: 0
  });

  pool.getConnection()
    .then((conn) => {
      console.log('Database connected successfully. Running in MySQL mode.');
      isDatabaseOnline = true;
      conn.release();
    })
    .catch((err) => {
      console.warn('MySQL Offline. Starting in Sandboxed In-Memory Fallback mode.');
      isDatabaseOnline = false;
    });
} catch (err) {
  console.warn('MySQL Configuration missing. Starting in Sandboxed In-Memory Fallback mode.');
  isDatabaseOnline = false;
}

export const query = async (sql: string, params: any[] = []): Promise<any> => {
  if (isDatabaseOnline && pool) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (err) {
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
    } else {
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

  // Fallback defaults for writes and updates
  if (cleanedSql.startsWith('insert into') || cleanedSql.startsWith('update') || cleanedSql.startsWith('delete')) {
    return { affectedRows: 1, insertId: Date.now() };
  }

  return [];
};

export const executeTransaction = async <T>(
  callback: (connection: any) => Promise<T>
): Promise<T> => {
  if (isDatabaseOnline && pool) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Sandbox Transaction simulator (runs callback on mock connection)
  const connectionMock = {
    execute: async (sqlStr: string, parameters: any[] = []) => {
      const res = await query(sqlStr, parameters);
      return [res];
    }
  };
  return await callback(connectionMock as any);
};

export default pool;
