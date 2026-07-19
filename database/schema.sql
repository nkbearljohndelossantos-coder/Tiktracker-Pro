-- TikTracker Pro Database Schema
-- Target Database: MySQL (InnoDB)

-- CREATE DATABASE IF NOT EXISTS tiktracker_pro;
-- USE tiktracker_pro;

-- 1. Users Table (Auth & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Products Table (Product Cost Module)
CREATE TABLE IF NOT EXISTS products (
    sku VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    supplier VARCHAR(100),
    purchase_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    packaging_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    bubble_wrap_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tape_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    sticker_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    labor_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    other_expenses DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    inventory_qty INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Cost History Table (Audit/Historical references)
CREATE TABLE IF NOT EXISTS product_cost_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    purchase_cost DECIMAL(10, 2) NOT NULL,
    packaging_cost DECIMAL(10, 2) NOT NULL,
    bubble_wrap_cost DECIMAL(10, 2) NOT NULL,
    tape_cost DECIMAL(10, 2) NOT NULL,
    sticker_cost DECIMAL(10, 2) NOT NULL,
    labor_cost DECIMAL(10, 2) NOT NULL,
    other_expenses DECIMAL(10, 2) NOT NULL,
    changed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Orders Table (Imported from Tik Tok Order Reports)
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(100) PRIMARY KEY,
    tracking_number VARCHAR(100),
    customer_name VARCHAR(100),
    phone_number VARCHAR(50),
    shipping_address TEXT,
    courier VARCHAR(50),
    order_status VARCHAR(50),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NULL, -- TikTok order creation date
    updated_at TIMESTAMP NULL, -- TikTok order update date
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tracking (tracking_number),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    variation VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Settlements Table (Imported from TikTok Settlement reports)
CREATE TABLE IF NOT EXISTS settlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    settlement_id VARCHAR(100) NOT NULL,
    order_id VARCHAR(100),
    statement_date TIMESTAMP NULL,
    gross_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tiktok_fees DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- sum of commissions, transaction fees, etc.
    affiliate_commission DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    shipping_fee_subsidy DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    shipping_fee_actual DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    platform_discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    adjustments DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    refund DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    return_loss DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    statement_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- raw Net Payout from TikTok
    net_profit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,       -- calculated profit after COGS
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data_json TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
    UNIQUE KEY uq_settlement_order (settlement_id, order_id),
    INDEX idx_settlement_id (settlement_id),
    INDEX idx_order_id (order_id),
    INDEX idx_statement_date (statement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Waybills Table (OCR extracted details)
CREATE TABLE IF NOT EXISTS waybills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(100),
    tracking_number VARCHAR(100) NOT NULL UNIQUE,
    customer_name VARCHAR(100),
    phone_number VARCHAR(50),
    shipping_address TEXT,
    courier VARCHAR(50),
    barcode_data VARCHAR(255),
    qr_data VARCHAR(255),
    file_path VARCHAR(255),
    ocr_text TEXT,
    is_matched BOOLEAN DEFAULT FALSE,
    matched_method VARCHAR(50), -- e.g., 'ORDER_ID', 'TRACKING_NUMBER', 'MANUAL'
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_tracking (tracking_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Waybill Review Queue (Unmatched or OCR-failed waybills)
CREATE TABLE IF NOT EXISTS waybill_review_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    waybill_id INT NOT NULL,
    tracking_number VARCHAR(100),
    ocr_text TEXT,
    reason VARCHAR(255),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by INT,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (waybill_id) REFERENCES waybills(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_waybill_id (waybill_id),
    INDEX idx_resolved (is_resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Returns Table (Returns Module)
CREATE TABLE IF NOT EXISTS returns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    return_id VARCHAR(100) NOT NULL UNIQUE,
    order_id VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    tracking_number VARCHAR(100),
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    condition_status ENUM('GOOD', 'DAMAGED_SELLABLE', 'DAMAGED_UNSELLABLE') NOT NULL DEFAULT 'GOOD',
    image_paths TEXT, -- JSON array of file paths
    return_shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    refunded_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    returned_to_inventory BOOLEAN DEFAULT FALSE,
    recorded_by INT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_sku (sku),
    INDEX idx_tracking (tracking_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Inventory Movements Table (Tracks Stock In/Out)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    movement_type ENUM('IMPORT', 'SALE', 'RETURN', 'MANUAL_ADJUSTMENT', 'CANCEL') NOT NULL,
    quantity INT NOT NULL, -- positive for IN, negative for OUT
    notes VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Audit Logs Table (Logging all operations)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('INFO', 'WARNING', 'ERROR', 'SUCCESS') NOT NULL DEFAULT 'INFO',
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
