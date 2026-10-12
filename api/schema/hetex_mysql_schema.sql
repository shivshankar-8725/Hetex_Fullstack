-- =====================================================================
-- Hetex Courier - Complete MySQL Database Schema
-- Compatible with Hostinger MySQL 8.0+ / MariaDB 10.5+
-- Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL UNIQUE,
  `phone` VARCHAR(32) NOT NULL UNIQUE,
  `role` ENUM('SELLER', 'ADMIN') NOT NULL DEFAULT 'SELLER',
  `business_name` VARCHAR(191) NULL,
  `kyc_status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `pan_number` VARCHAR(32) NULL,
  `gst_number` VARCHAR(32) NULL,
  `password_hash` VARCHAR(255) NULL,
  `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. WALLETS TABLE
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `wallet_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NULL,
  `type` ENUM('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `balance_before` DECIMAL(12,2) NOT NULL,
  `balance_after` DECIMAL(12,2) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `order_id` VARCHAR(36) NULL,
  `payment_provider` VARCHAR(64) NULL,
  `payment_reference` VARCHAR(191) NULL UNIQUE,
  `payment_status` ENUM('PENDING', 'SUCCESS', 'FAILED') NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_wallet_tx_wallet` (`wallet_id`),
  INDEX `idx_wallet_tx_user` (`user_id`),
  INDEX `idx_wallet_tx_ref` (`payment_reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('PICKUP', 'DELIVERY', 'RTO') NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `contact_name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `address_line1` VARCHAR(255) NOT NULL,
  `address_line2` VARCHAR(255) NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `pincode` VARCHAR(16) NOT NULL,
  `country` VARCHAR(64) NOT NULL DEFAULT 'India',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_addr_user` (`user_id`),
  INDEX `idx_addr_pincode` (`pincode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. COURIERS TABLE
CREATE TABLE IF NOT EXISTS `couriers` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `logo_color` VARCHAR(20) NOT NULL DEFAULT '#2563eb',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `base_rate_per_kg` DECIMAL(10,2) NOT NULL,
  `cod_charge_flat` DECIMAL(10,2) NOT NULL DEFAULT 25.00,
  `cod_charge_percent` DECIMAL(5,2) NOT NULL DEFAULT 1.50,
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 4.00,
  `eta_min_days` INT NOT NULL DEFAULT 2,
  `eta_max_days` INT NOT NULL DEFAULT 5,
  `rto_risk_percent` DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. COMMISSION RULES TABLE
CREATE TABLE IF NOT EXISTS `commission_rules` (
  `id` VARCHAR(36) NOT NULL,
  `courier_id` VARCHAR(36) NULL,
  `min_weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `max_weight` DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  `margin_type` ENUM('PERCENT', 'FLAT') NOT NULL DEFAULT 'PERCENT',
  `margin_value` DECIMAL(10,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_commission_courier` (`courier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(36) NOT NULL,
  `order_number` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` VARCHAR(36) NOT NULL,
  `pickup_address_id` VARCHAR(36) NOT NULL,
  `buyer_address_id` VARCHAR(36) NOT NULL,
  `item_description` VARCHAR(255) NOT NULL,
  `declared_value` DECIMAL(12,2) NOT NULL,
  `weight` DECIMAL(10,3) NOT NULL,
  `length` DECIMAL(10,2) NOT NULL,
  `width` DECIMAL(10,2) NOT NULL,
  `height` DECIMAL(10,2) NOT NULL,
  `volumetric_weight` DECIMAL(10,3) NOT NULL,
  `billable_weight` DECIMAL(10,3) NOT NULL,
  `payment_mode` ENUM('PREPAID', 'COD') NOT NULL,
  `cod_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RTO') NOT NULL DEFAULT 'DRAFT',
  `source` VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order_user` (`user_id`),
  INDEX `idx_order_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS `shipments` (
  `id` VARCHAR(36) NOT NULL,
  `order_id` VARCHAR(36) NOT NULL UNIQUE,
  `courier_id` VARCHAR(36) NOT NULL,
  `awb_number` VARCHAR(100) NOT NULL UNIQUE,
  `rate_charged` DECIMAL(12,2) NOT NULL,
  `margin_earned` DECIMAL(12,2) NOT NULL,
  `status` ENUM(
    'READY_TO_SHIP', 'MANIFESTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
    'DELIVERED', 'NDR', 'RTO_INITIATED', 'RTO_DELIVERED', 'LOST', 'CANCELLED'
  ) NOT NULL DEFAULT 'READY_TO_SHIP',
  `current_location` VARCHAR(191) NOT NULL DEFAULT 'Origin Hub',
  `label_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_shipment_awb` (`awb_number`),
  INDEX `idx_shipment_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TRACKING EVENTS TABLE
CREATE TABLE IF NOT EXISTS `tracking_events` (
  `id` VARCHAR(36) NOT NULL,
  `shipment_id` VARCHAR(36) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `location` VARCHAR(191) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tracking_shipment` (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. NDR RECORDS TABLE
CREATE TABLE IF NOT EXISTS `ndr_records` (
  `id` VARCHAR(36) NOT NULL,
  `shipment_id` VARCHAR(36) NOT NULL,
  `attempt_number` INT NOT NULL DEFAULT 1,
  `reason` VARCHAR(255) NOT NULL,
  `buyer_response` VARCHAR(255) NULL,
  `action` ENUM('PENDING', 'REATTEMPT', 'RTO', 'CONTACT_BUYER') NOT NULL DEFAULT 'PENDING',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ndr_shipment` (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. WEIGHT DISPUTES TABLE
CREATE TABLE IF NOT EXISTS `weight_disputes` (
  `id` VARCHAR(36) NOT NULL,
  `shipment_id` VARCHAR(36) NOT NULL UNIQUE,
  `declared_weight` DECIMAL(10,3) NOT NULL,
  `courier_weight` DECIMAL(10,3) NOT NULL,
  `extra_charge` DECIMAL(10,2) NOT NULL,
  `status` ENUM('OPEN', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
  `resolution_note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. COD REMITTANCES TABLE
CREATE TABLE IF NOT EXISTS `cod_remittances` (
  `id` VARCHAR(36) NOT NULL,
  `shipment_id` VARCHAR(36) NOT NULL UNIQUE,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING', 'SETTLED', 'ON_HOLD') NOT NULL DEFAULT 'PENDING',
  `settled_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `order_id` VARCHAR(36) NOT NULL,
  `courier_id` VARCHAR(36) NOT NULL,
  `awb_number` VARCHAR(100) NULL,
  `vendor_ticket_id` VARCHAR(100) NULL,
  `vendor_status` VARCHAR(50) NULL,
  `vendor_api_supported` TINYINT(1) NOT NULL DEFAULT 0,
  `vendor_notes` TEXT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ticket_user` (`user_id`),
  INDEX `idx_ticket_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. TICKET MESSAGES TABLE
CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` VARCHAR(36) NOT NULL,
  `ticket_id` VARCHAR(36) NOT NULL,
  `sender_role` ENUM('USER', 'ADMIN', 'COURIER') NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_msg_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `channel` ENUM('SMS', 'EMAIL', 'WHATSAPP') NOT NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `order_id` VARCHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notif_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. OTP CODES TABLE
CREATE TABLE IF NOT EXISTS `otp_codes` (
  `id` VARCHAR(36) NOT NULL,
  `identifier` VARCHAR(191) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `consumed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_otp_identifier` (`identifier`, `consumed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. TRACKING PAGE CONFIGS TABLE
CREATE TABLE IF NOT EXISTS `tracking_page_configs` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `brand_name` VARCHAR(100) NOT NULL DEFAULT 'HetEx',
  `primary_color` VARCHAR(20) NOT NULL DEFAULT '#2c3958',
  `logo_url` VARCHAR(255) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. MARKETPLACE CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS `marketplace_connections` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `platform` ENUM('SHOPIFY', 'WOOCOMMERCE', 'AMAZON') NOT NULL,
  `store_name` VARCHAR(191) NOT NULL,
  `connected` TINYINT(1) NOT NULL DEFAULT 1,
  `connected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_market_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SEED INITIAL DATA (ADMIN, DEFAULT COURIERS, DEFAULT COMMISSION)
-- =====================================================================

-- Default Admin User (Password: admin123, BCRYPT hash)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `phone`, `role`, `business_name`, `kyc_status`, `password_hash`, `email_verified`)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Hetex Administrator',
  'admin@hetex.in',
  '+919999999999',
  'ADMIN',
  'Hetex Logistics Corp',
  'VERIFIED',
  '$2y$10$w85R7Z52p7v.vjUaJm7yweo82x0a.gV6f2QjY5kGvh2q8Qk5d4EFe',
  1
);

-- Default Admin Wallet
INSERT IGNORE INTO `wallets` (`id`, `user_id`, `balance`)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 50000.00);

-- Default Active Couriers
INSERT IGNORE INTO `couriers` (`id`, `name`, `code`, `logo_color`, `active`, `base_rate_per_kg`, `cod_charge_flat`, `cod_charge_percent`, `rating`, `eta_min_days`, `eta_max_days`, `rto_risk_percent`)
VALUES 
  ('c1000000-0000-0000-0000-000000000001', 'Delhivery Surface', 'DELHIVERY_SURFACE', '#000000', 1, 42.00, 25.00, 1.50, 4.30, 3, 5, 6.50),
  ('c1000000-0000-0000-0000-000000000002', 'Delhivery Express', 'DELHIVERY_EXPRESS', '#e11d48', 1, 65.00, 30.00, 1.80, 4.60, 1, 3, 4.20),
  ('c1000000-0000-0000-0000-000000000003', 'Shipmozo Standard', 'SHIPMOZO_STD', '#2563eb', 1, 39.00, 22.00, 1.40, 4.20, 3, 6, 7.00),
  ('c1000000-0000-0000-0000-000000000004', 'BlueDart Express', 'BLUEDART_EXP', '#0284c7', 1, 78.00, 35.00, 2.00, 4.70, 1, 2, 3.50);

-- Default Fallback Commission Rule (10% platform markup)
INSERT IGNORE INTO `commission_rules` (`id`, `courier_id`, `min_weight`, `max_weight`, `margin_type`, `margin_value`)
VALUES ('r1000000-0000-0000-0000-000000000001', NULL, 0.00, 1000.00, 'PERCENT', 10.00);

SET FOREIGN_KEY_CHECKS = 1;
