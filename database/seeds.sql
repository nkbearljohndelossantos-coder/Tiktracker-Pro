-- TikTracker Pro Seed Data
USE tiktracker_pro;

-- 1. Insert Initial Users
-- Password for admin accounts: 'admin123'
-- Password for manager accounts: 'manager123'
-- Password for staff accounts: 'staff123'
-- Password for viewer accounts: 'viewer123'
INSERT INTO users (id, username, password_hash, email, role) VALUES
(1, 'admin', '$2a$10$lthiuG3Kty8/Xq4OSpSIoOAyk5KzKqbYZUnNpHqmWHWmIHJyceVo2', 'admin@tiktrackerpro.com', 'SUPER_ADMIN'),
(2, 'manager', '$2a$10$BRYpAHzDHGWX8cgNwTR2vupfXUHCRbxrVIJYcVRSm4R5H9McbJpWy', 'manager@tiktrackerpro.com', 'MANAGER'),
(3, 'staff', '$2a$10$lrmtQO9N0Ap7OI1VL4FwtO8.86.vBC6yMSA0d23acUBzZG1fhbJKm', 'staff@tiktrackerpro.com', 'STAFF'),
(4, 'viewer', '$2a$10$5faUN3XJsnypHt09WXENBuomI7.oYi0fBMh6GW2A39fzeVkQ7sXbe', 'viewer@tiktrackerpro.com', 'VIEWER')
ON DUPLICATE KEY UPDATE id=id;

-- 2. Insert System Settings
('company_name', 'NKB Manufacturing Corp.'),
('currency', 'PHP'),
('low_stock_threshold', '20'),
('ocr_confidence_threshold', '60'),
('profit_warning_threshold', '15.00')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- 3. Insert Initial Products (SKU & cost metrics)
INSERT INTO products (sku, name, supplier, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses, inventory_qty) VALUES
('SKU-MUG-001', 'TikTracker Dynamic Ceramic Mug - Matte Black', 'Apex Supplier Ltd.', 120.00, 15.00, 5.00, 2.00, 1.50, 10.00, 1.50, 150),
('SKU-SHIRT-002', 'TikTracker Tech Premium Cotton Shirt - Navy Blue', 'Vibrant Loom Co.', 180.00, 10.00, 2.00, 1.00, 1.50, 10.00, 0.50, 240),
('SKU-HOODIE-003', 'TikTracker Oversized Fleece Hoodie - Sand', 'Vibrant Loom Co.', 350.00, 20.00, 4.00, 2.00, 1.50, 15.00, 2.50, 95),
('SKU-CAP-004', 'TikTracker Pro Retro Dad Cap - Pitch Black', 'TopCap Manufacturer', 85.00, 8.00, 1.50, 1.00, 1.50, 8.00, 0.00, 45),
('SKU-BOTTLE-005', 'TikTracker Insulated Steel Flask - 750ml Forest Green', 'HydroMakers Co.', 280.00, 25.00, 8.00, 2.50, 1.50, 12.00, 3.00, 18)
ON DUPLICATE KEY UPDATE sku=sku;

-- 4. Initial Product Cost History
INSERT INTO product_cost_history (sku, purchase_cost, packaging_cost, bubble_wrap_cost, tape_cost, sticker_cost, labor_cost, other_expenses, changed_by) VALUES
('SKU-MUG-001', 120.00, 15.00, 5.00, 2.00, 1.50, 10.00, 1.50, 1),
('SKU-SHIRT-002', 180.00, 10.00, 2.00, 1.00, 1.50, 10.00, 0.50, 1),
('SKU-HOODIE-003', 350.00, 20.00, 4.00, 2.00, 1.50, 15.00, 2.50, 1),
('SKU-CAP-004', 85.00, 8.00, 1.50, 1.00, 1.50, 8.00, 0.00, 1),
('SKU-BOTTLE-005', 280.00, 25.00, 8.00, 2.50, 1.50, 12.00, 3.00, 1)
ON DUPLICATE KEY UPDATE sku=sku;

-- 5. Insert Initial Sample Orders (Over past days)
INSERT INTO orders (order_id, tracking_number, customer_name, phone_number, shipping_address, courier, order_status, total_amount, created_at, updated_at) VALUES
('574919559123456789', 'JX123456789PH', 'Juan Dela Cruz', '+63 917 123 4567', 'Block 5 Lot 12, Moonwalk Phase 2, Paranaque City, Metro Manila', 'J&T Express', 'COMPLETED', 299.00, '2026-07-10 10:15:00', '2026-07-12 14:30:00'),
('574919559123456790', 'SPX987654321', 'Maria Clara', '+63 918 765 4321', '142 Rizal Street, Brgy. Central, Angeles City, Pampanga', 'Shopee Xpress', 'COMPLETED', 399.00, '2026-07-11 11:20:00', '2026-07-13 16:10:00'),
('574919559123456791', 'FLA555666777', 'Jose Rizal', '+63 919 999 8888', 'Calamba Plaza, Calamba City, Laguna', 'Flash Express', 'COMPLETED', 699.00, '2026-07-12 09:05:00', '2026-07-14 11:45:00'),
('574919559123456792', 'JX123456795PH', 'Andres Bonifacio', '+63 920 111 2222', 'Monumento Circle, Caloocan City, Metro Manila', 'J&T Express', 'COMPLETED', 199.00, '2026-07-13 13:40:00', '2026-07-15 15:20:00'),
('574919559123456793', 'JX123456796PH', 'Emilio Aguinaldo', '+63 921 333 4444', 'Aguinaldo Shrine, Kawit, Cavite', 'J&T Express', 'REFUNDED', 299.00, '2026-07-14 15:50:00', '2026-07-16 10:05:00'),
('574919559123456794', 'JX123456797PH', 'Gabriela Silang', '+63 922 555 6666', 'Vigan Plaza, Vigan City, Ilocos Sur', 'J&T Express', 'COMPLETED', 580.00, '2026-07-15 08:30:00', '2026-07-17 12:30:00')
ON DUPLICATE KEY UPDATE order_id=order_id;

-- 6. Insert Order Items
INSERT INTO order_items (order_id, sku, product_name, variation, quantity, price) VALUES
('574919559123456789', 'SKU-MUG-001', 'TikTracker Dynamic Ceramic Mug - Matte Black', 'Matte Black', 1, 299.00),
('574919559123456790', 'SKU-SHIRT-002', 'TikTracker Tech Premium Cotton Shirt - Navy Blue', 'Navy Blue - M', 1, 399.00),
('574919559123456791', 'SKU-HOODIE-003', 'TikTracker Oversized Fleece Hoodie - Sand', 'Sand - L', 1, 699.00),
('574919559123456792', 'SKU-CAP-004', 'TikTracker Pro Retro Dad Cap - Pitch Black', 'Default', 1, 199.00),
('574919559123456793', 'SKU-MUG-001', 'TikTracker Dynamic Ceramic Mug - Matte Black', 'Matte Black', 1, 299.00),
('574919559123456794', 'SKU-MUG-001', 'TikTracker Dynamic Ceramic Mug - Matte Black', 'Matte Black', 1, 299.00),
('574919559123456794', 'SKU-CAP-004', 'TikTracker Pro Retro Dad Cap - Pitch Black', 'Default', 1, 199.00)
ON DUPLICATE KEY UPDATE id=id;

-- 7. Insert Settlements (With TikTok Financial breakdowns)
-- Formula reminders for Profit Engine:
-- Mug Cost COGS: 120 + 15 + 5 + 2 + 1.5 + 10 + 1.5 = 155.00
-- Shirt Cost COGS: 180 + 10 + 2 + 1 + 1.5 + 10 + 0.5 = 205.00
-- Hoodie Cost COGS: 350 + 20 + 4 + 2 + 1.5 + 15 + 2.5 = 415.00
-- Cap Cost COGS: 85 + 8 + 1.5 + 1 + 1.5 + 8 + 0 = 105.00

INSERT INTO settlements (settlement_id, order_id, statement_date, gross_sales, tiktok_fees, affiliate_commission, shipping_fee_subsidy, shipping_fee_actual, platform_discount, adjustments, refund, return_loss, tax, statement_amount, net_profit) VALUES
('SET-2026-001', '574919559123456789', '2026-07-12 18:00:00', 299.00, 15.00, 15.00, 20.00, 20.00, 10.00, 0.00, 0.00, 0.00, 3.50, 245.50, 90.50), -- Net Profit = 245.50 (Statement) - 155.00 (COGS) = 90.50
('SET-2026-002', '574919559123456790', '2026-07-13 18:00:00', 399.00, 20.00, 0.00, 0.00, 35.00, 15.00, 0.00, 0.00, 0.00, 4.50, 324.50, 119.50), -- Net Profit = 324.50 - 205.00 = 119.50
('SET-2026-003', '574919559123456791', '2026-07-14 18:00:00', 699.00, 35.00, 35.00, 30.00, 40.00, 25.00, 0.00, 0.00, 0.00, 7.80, 556.20, 141.20), -- Net Profit = 556.20 - 415.00 = 141.20
('SET-2026-004', '574919559123456792', '2026-07-15 18:00:00', 199.00, 10.00, 10.00, 20.00, 20.00, 5.00, 0.00, 0.00, 0.00, 2.20, 151.80, 46.80),  -- Net Profit = 151.80 - 105.00 = 46.80
('SET-2026-005', '574919559123456793', '2026-07-16 18:00:00', 299.00, 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 299.00, 30.00, 0.00, -344.00, -499.00), -- Return Loss: -344.00 (Statement) - 155.00 (COGS lost) = -499.00
('SET-2026-006', '574919559123456794', '2026-07-17 18:00:00', 498.00, 25.00, 25.00, 20.00, 30.00, 15.00, 0.00, 0.00, 0.00, 5.50, 397.50, 137.50)  -- Net Profit = 397.50 - (155 + 105) = 137.50
ON DUPLICATE KEY UPDATE settlement_id=settlement_id;

-- 8. Insert Initial Waybill Record
INSERT INTO waybills (order_id, tracking_number, customer_name, phone_number, shipping_address, courier, barcode_data, qr_data, is_matched, matched_method) VALUES
('574919559123456789', 'JX123456789PH', 'Juan Dela Cruz', '+63 917 123 4567', 'Block 5 Lot 12, Moonwalk Phase 2, Paranaque City, Metro Manila', 'J&T Express', '574919559123456789', 'JX123456789PH', TRUE, 'ORDER_ID')
ON DUPLICATE KEY UPDATE tracking_number=tracking_number;

-- 9. Insert Initial Audit Logs
INSERT INTO audit_logs (user_id, action, module, details, ip_address) VALUES
(1, 'DATABASE_SEED', 'SYSTEM', 'Successfully loaded database seed records for standard operational sandbox testing.', '127.0.0.1');

-- 10. Insert Inventory Movements for Initial Stocks
INSERT INTO inventory_movements (sku, movement_type, quantity, notes, created_by) VALUES
('SKU-MUG-001', 'IMPORT', 150, 'Initial inventory seed import.', 1),
('SKU-SHIRT-002', 'IMPORT', 240, 'Initial inventory seed import.', 1),
('SKU-HOODIE-003', 'IMPORT', 95, 'Initial inventory seed import.', 1),
('SKU-CAP-004', 'IMPORT', 45, 'Initial inventory seed import.', 1),
('SKU-BOTTLE-005', 'IMPORT', 18, 'Initial inventory seed import.', 1)
ON DUPLICATE KEY UPDATE id=id;
