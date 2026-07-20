-- USE tiktracker_pro;

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
INSERT INTO system_settings (setting_key, setting_value) VALUES
('company_name', 'NKB Manufacturing Corp.'),
('currency', 'PHP'),
('low_stock_threshold', '20'),
('ocr_confidence_threshold', '60'),
('profit_warning_threshold', '15.00')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- 3. Insert Initial Products (SKU & cost metrics)
-- 3. Insert Initial Audit Log for Production Preparation
INSERT INTO audit_logs (user_id, action, module, details, ip_address) VALUES
(1, 'PRODUCTION_SETUP', 'SYSTEM', 'Database initialized and prepared for production with a clean data state.', '127.0.0.1');
