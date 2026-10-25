-- =====================================================================
-- Migration: Website Improvements & Parity Updates
-- Adds user_code (HET000001, etc.), E-Way Bill & GST, Shipping Payment Status,
-- and Courier Audit Measurements / Weight Reconciliation
-- Compatible with Hostinger MySQL 8.0+ / MariaDB 10.5+
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Add user_code, rate_margin_percent, and rate_margin_type to users table
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `user_code` VARCHAR(16) NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `rate_margin_percent` DECIMAL(5,2) NULL DEFAULT NULL AFTER `role`,
  ADD COLUMN IF NOT EXISTS `rate_margin_type` ENUM('PERCENT', 'FLAT') NOT NULL DEFAULT 'PERCENT' AFTER `rate_margin_percent`;

-- Populate user_code for existing users if NULL
UPDATE `users` SET `user_code` = 'HET000001' WHERE `role` = 'ADMIN' AND (`user_code` IS NULL OR `user_code` = '');

-- Assign sequential HET IDs for sellers
SET @row_num = 1;
UPDATE `users` 
SET `user_code` = CONCAT('HET', LPAD((@row_num := @row_num + 1), 6, '0'))
WHERE `role` = 'SELLER' AND (`user_code` IS NULL OR `user_code` = '');

-- Ensure UNIQUE index on user_code (safe for both MySQL 8.0 and MariaDB)
SET @exist_idx := (
  SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_user_code'
);
SET @sql_idx := IF(@exist_idx = 0, 'ALTER TABLE `users` ADD UNIQUE INDEX `idx_users_user_code` (`user_code`)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- 2. Add user_code, package_type, to related transaction and operational tables
ALTER TABLE `orders` 
  ADD COLUMN IF NOT EXISTS `user_code` VARCHAR(16) NULL AFTER `user_id`,
  ADD COLUMN IF NOT EXISTS `package_type` ENUM('SMALL', 'LARGE') NOT NULL DEFAULT 'SMALL' AFTER `user_code`,
  ADD COLUMN IF NOT EXISTS `eway_bill_number` VARCHAR(32) NULL AFTER `declared_value`,
  ADD COLUMN IF NOT EXISTS `gst_number` VARCHAR(32) NULL AFTER `eway_bill_number`,
  ADD COLUMN IF NOT EXISTS `shipping_charges` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `cod_amount`,
  ADD COLUMN IF NOT EXISTS `shipping_payment_status` ENUM('PAID', 'PENDING', 'UNPAID') NOT NULL DEFAULT 'PENDING' AFTER `shipping_charges`,
  ADD COLUMN IF NOT EXISTS `courier_weight` DECIMAL(10,3) NULL AFTER `billable_weight`,
  ADD COLUMN IF NOT EXISTS `courier_length` DECIMAL(10,2) NULL AFTER `courier_weight`,
  ADD COLUMN IF NOT EXISTS `courier_width` DECIMAL(10,2) NULL AFTER `courier_length`,
  ADD COLUMN IF NOT EXISTS `courier_height` DECIMAL(10,2) NULL AFTER `courier_width`,
  ADD COLUMN IF NOT EXISTS `courier_billable_weight` DECIMAL(10,3) NULL AFTER `courier_height`,
  ADD COLUMN IF NOT EXISTS `weight_dispute_status` ENUM('NO_DISPUTE', 'OPEN', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'NO_DISPUTE' AFTER `courier_billable_weight`,
  ADD COLUMN IF NOT EXISTS `weight_dispute_note` TEXT NULL AFTER `weight_dispute_status`,
  ADD COLUMN IF NOT EXISTS `discrepancy_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `weight_dispute_note`;

ALTER TABLE `wallet_transactions`
  ADD COLUMN IF NOT EXISTS `user_code` VARCHAR(16) NULL AFTER `user_id`;

ALTER TABLE `wallet_recharges`
  ADD COLUMN IF NOT EXISTS `user_code` VARCHAR(16) NULL AFTER `user_id`;

ALTER TABLE `support_tickets`
  ADD COLUMN IF NOT EXISTS `user_code` VARCHAR(16) NULL AFTER `user_id`;

ALTER TABLE `cod_remittances`
  ADD COLUMN IF NOT EXISTS `user_id` VARCHAR(36) NULL AFTER `shipment_id`,
  ADD COLUMN IF NOT EXISTS `user_code` VARCHAR(16) NULL AFTER `user_id`,
  ADD COLUMN IF NOT EXISTS `bank_utr` VARCHAR(100) NULL AFTER `status`;

-- Backfill user_code on existing orders from users
UPDATE `orders` o 
JOIN `users` u ON o.user_id = u.id 
SET o.user_code = u.user_code 
WHERE o.user_code IS NULL;

-- Backfill user_code on existing transactions from users
UPDATE `wallet_transactions` t 
JOIN `users` u ON t.user_id = u.id 
SET t.user_code = u.user_code 
WHERE t.user_code IS NULL;

-- Backfill user_code on existing recharges from users
UPDATE `wallet_recharges` r 
JOIN `users` u ON r.user_id = u.id 
SET r.user_code = u.user_code 
WHERE r.user_code IS NULL;

-- Backfill user_code on existing support tickets from users
UPDATE `support_tickets` t 
JOIN `users` u ON t.user_id = u.id 
SET t.user_code = u.user_code 
WHERE t.user_code IS NULL;

-- Backfill user_code on existing cod remittances from shipments -> orders -> users
UPDATE `cod_remittances` cr
JOIN `shipments` s ON cr.shipment_id = s.id
JOIN `orders` o ON s.order_id = o.id
JOIN `users` u ON o.user_id = u.id
SET cr.user_id = u.id, cr.user_code = u.user_code
WHERE cr.user_code IS NULL;

-- 3. Ensure order_items and shipmozo_references tables exist
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `quantity` INT NOT NULL DEFAULT 1,
  `declared_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `weight` DECIMAL(10,3) NOT NULL DEFAULT 0.500,
  `length` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  `width` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  `height` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_items_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shipmozo_references` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(36) NOT NULL,
  `shipment_id` VARCHAR(36) NOT NULL,
  `shipmozo_order_id` VARCHAR(100) NULL,
  `shipmozo_reference_id` VARCHAR(100) NULL,
  `shipmozo_awb` VARCHAR(100) NULL,
  `shipmozo_courier` VARCHAR(200) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sm_order` (`order_id`),
  INDEX `idx_sm_awb` (`shipmozo_awb`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Ensure addresses has label column and shipments has tracking_url/label_generated
ALTER TABLE `addresses`
  ADD COLUMN IF NOT EXISTS `label` VARCHAR(100) NOT NULL DEFAULT 'Warehouse' AFTER `type`;

ALTER TABLE `shipments`
  ADD COLUMN IF NOT EXISTS `tracking_url` VARCHAR(255) NULL AFTER `awb_number`,
  ADD COLUMN IF NOT EXISTS `label_generated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `current_location`;

-- 5. Ensure all 8 courier partners exist in database
INSERT IGNORE INTO `couriers` (`id`, `name`, `code`, `logo_color`, `active`, `base_rate_per_kg`, `cod_charge_flat`, `cod_charge_percent`, `rating`, `eta_min_days`, `eta_max_days`, `rto_risk_percent`)
VALUES 
  ('c1000000-0000-0000-0000-000000000001', 'Delhivery Surface', 'DELHIVERY_SURFACE', '#d90429', 1, 42.00, 25.00, 1.50, 4.30, 3, 5, 6.50),
  ('c1000000-0000-0000-0000-000000000002', 'Delhivery Express', 'DELHIVERY_EXPRESS', '#d90429', 1, 65.00, 30.00, 1.80, 4.60, 1, 3, 4.20),
  ('c1000000-0000-0000-0000-000000000003', 'DTDC Express', 'DTDC_EXP', '#0f2d59', 1, 52.00, 25.00, 1.50, 4.50, 2, 4, 5.50),
  ('c1000000-0000-0000-0000-000000000004', 'Blue Dart Express', 'BLUEDART_EXP', '#065dac', 1, 78.00, 35.00, 2.00, 4.70, 1, 2, 3.50),
  ('c1000000-0000-0000-0000-000000000005', 'Ekart Logistics', 'EKART_EXP', '#0062a9', 1, 46.00, 25.00, 1.50, 4.40, 2, 4, 5.00),
  ('c1000000-0000-0000-0000-000000000006', 'Shadowfax Technologies', 'SHADOWFAX_EXP', '#008d96', 1, 44.00, 25.00, 1.50, 4.20, 2, 5, 6.00),
  ('c1000000-0000-0000-0000-000000000007', 'Xpressbees Logistics', 'XPRESSBEES_EXP', '#e65100', 1, 45.00, 25.00, 1.50, 4.30, 2, 4, 5.80),
  ('c1000000-0000-0000-0000-000000000008', 'Amazon Shipping', 'AMAZON_SHIPPING', '#ea580c', 1, 58.00, 30.00, 1.60, 4.60, 1, 3, 4.00);

DELETE FROM `couriers` WHERE `code` = 'SHIPMOZO_STD';

-- 6. Audit Logs Table (TASK-P1-01)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `admin_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` VARCHAR(36) NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_admin` (`admin_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Notification Settings Table (TASK-P1-04)
CREATE TABLE IF NOT EXISTS `notification_settings` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `order_created_email` TINYINT(1) NOT NULL DEFAULT 1,
  `order_created_sms` TINYINT(1) NOT NULL DEFAULT 0,
  `shipped_email` TINYINT(1) NOT NULL DEFAULT 1,
  `shipped_sms` TINYINT(1) NOT NULL DEFAULT 1,
  `delivered_email` TINYINT(1) NOT NULL DEFAULT 1,
  `delivered_sms` TINYINT(1) NOT NULL DEFAULT 1,
  `ndr_email` TINYINT(1) NOT NULL DEFAULT 1,
  `ndr_sms` TINYINT(1) NOT NULL DEFAULT 1,
  `rto_email` TINYINT(1) NOT NULL DEFAULT 1,
  `rto_sms` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_notif_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bank Accounts Table for COD Remittance (TASK-P2-05)
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `account_holder` VARCHAR(191) NOT NULL,
  `account_number` VARCHAR(64) NOT NULL,
  `ifsc_code` VARCHAR(20) NOT NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_bank_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. API Keys Table (TASK-P2-07)
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `key_hash` VARCHAR(64) NOT NULL UNIQUE,
  `key_prefix` VARCHAR(10) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_apikey_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Outbound Webhooks Table (TASK-P2-07)
CREATE TABLE IF NOT EXISTS `webhooks` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `events` JSON NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `secret` VARCHAR(64) NOT NULL,
  `failure_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_webhook_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Reverse Shipments & Parent Linkage (TASK-P1-07)
ALTER TABLE `shipments`
  ADD COLUMN IF NOT EXISTS `shipment_type` ENUM('FORWARD','RETURN') NOT NULL DEFAULT 'FORWARD' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `parent_shipment_id` VARCHAR(36) NULL AFTER `shipment_type`,
  ADD COLUMN IF NOT EXISTS `pod_image_url` VARCHAR(500) NULL AFTER `tracking_url`;

-- 12. Courier Logo URL (TASK-P2-03)
ALTER TABLE `couriers`
  ADD COLUMN IF NOT EXISTS `logo_url` VARCHAR(255) NULL AFTER `logo_color`;

UPDATE `couriers` SET `logo_url` = 'https://assets.shipmozo.com/couriers/delhivery.png' WHERE `code` LIKE 'DELHIVERY%';
UPDATE `couriers` SET `logo_url` = 'https://assets.shipmozo.com/couriers/dtdc.png' WHERE `code` LIKE 'DTDC%';
UPDATE `couriers` SET `logo_url` = 'https://assets.shipmozo.com/couriers/bluedart.png' WHERE `code` LIKE 'BLUEDART%';
UPDATE `couriers` SET `logo_url` = 'https://assets.shipmozo.com/couriers/ekart.png' WHERE `code` LIKE 'EKART%';
UPDATE `couriers` SET `logo_url` = 'https://assets.shipmozo.com/couriers/shadowfax.png' WHERE `code` LIKE 'SHADOWFAX%';
UPDATE `couriers` SET `logo_url` = 'https://assets.shipmozo.com/couriers/xpressbees.png' WHERE `code` LIKE 'XPRESSBEES%';
UPDATE `couriers` SET `logo_url` = 'https://assets.shipmozo.com/couriers/amazon.png' WHERE `code` LIKE 'AMAZON%';

-- 13. Ticket Priority & Category (TASK-P3-01)
ALTER TABLE `support_tickets`
  ADD COLUMN IF NOT EXISTS `priority` ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `category` VARCHAR(100) NOT NULL DEFAULT 'General' AFTER `priority`;

SET FOREIGN_KEY_CHECKS = 1;

