<?php
/**
 * Hetex Courier - Database Connection (Hostinger MySQL / MariaDB)
 */

require_once __DIR__ . '/credentials.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $host = Credentials::get('DB_HOST', 'localhost');
            $port = Credentials::get('DB_PORT', '3306');
            $db   = Credentials::get('DB_NAME', 'u969244453_hetex');
            $user = Credentials::get('DB_USER', 'u969244453_hetexuser');
            $pass = Credentials::get('DB_PASS', '');
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
                self::$instance->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");

                // Auto self-heal: Ensure essential tables exist so no query ever fails
                try {
                    self::$instance->exec("
                        CREATE TABLE IF NOT EXISTS `wallets` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `user_id` VARCHAR(36) NOT NULL UNIQUE,
                          `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          INDEX `idx_wallet_user` (`user_id`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `wallet_transactions` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `wallet_id` VARCHAR(36) NOT NULL,
                          `user_id` VARCHAR(36) NULL,
                          `type` ENUM('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT') NOT NULL,
                          `amount` DECIMAL(12,2) NOT NULL,
                          `balance_before` DECIMAL(12,2) NOT NULL,
                          `balance_after` DECIMAL(12,2) NOT NULL,
                          `reason` VARCHAR(255) NOT NULL,
                          `order_id` VARCHAR(36) NULL,
                          `payment_provider` VARCHAR(64) NULL,
                          `payment_reference` VARCHAR(191) NULL,
                          `payment_status` ENUM('PENDING', 'SUCCESS', 'FAILED') NULL DEFAULT 'SUCCESS',
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          INDEX `idx_tx_wallet` (`wallet_id`),
                          INDEX `idx_tx_user` (`user_id`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `support_tickets` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `user_id` VARCHAR(36) NOT NULL,
                          `order_id` VARCHAR(36) NULL,
                          `courier_id` VARCHAR(36) NULL,
                          `awb_number` VARCHAR(100) NULL,
                          `subject` VARCHAR(255) NOT NULL,
                          `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED') NOT NULL DEFAULT 'OPEN',
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          INDEX `idx_ticket_user` (`user_id`),
                          INDEX `idx_ticket_status` (`status`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `ticket_messages` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `ticket_id` VARCHAR(36) NOT NULL,
                          `sender_role` VARCHAR(32) NOT NULL DEFAULT 'USER',
                          `message` TEXT NOT NULL,
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          INDEX `idx_msg_ticket` (`ticket_id`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `wallet_recharges` (
                          `id` VARCHAR(64) NOT NULL PRIMARY KEY,
                          `user_id` VARCHAR(36) NOT NULL,
                          `user_code` VARCHAR(16) NULL,
                          `amount` DECIMAL(10,2) NOT NULL,
                          `payment_method` VARCHAR(32) NOT NULL DEFAULT 'UPI',
                          `upi_id` VARCHAR(128) NULL,
                          `utr_number` VARCHAR(64) NULL,
                          `status` ENUM('UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'UNDER_REVIEW',
                          `admin_notes` TEXT NULL,
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          `reviewed_at` DATETIME NULL,
                          INDEX `idx_recharge_user` (`user_id`),
                          INDEX `idx_recharge_status` (`status`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `addresses` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `user_id` VARCHAR(36) NOT NULL,
                          `type` ENUM('PICKUP', 'DELIVERY', 'RTO') NOT NULL DEFAULT 'PICKUP',
                          `label` VARCHAR(100) NOT NULL DEFAULT 'Warehouse',
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
                          INDEX `idx_addr_user` (`user_id`),
                          INDEX `idx_addr_pincode` (`pincode`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `couriers` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
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
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `commission_rules` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `courier_id` VARCHAR(36) NULL,
                          `min_weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                          `max_weight` DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
                          `margin_type` ENUM('PERCENT', 'FLAT') NOT NULL DEFAULT 'PERCENT',
                          `margin_value` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `orders` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `order_number` VARCHAR(64) NOT NULL UNIQUE,
                          `user_id` VARCHAR(36) NOT NULL,
                          `user_code` VARCHAR(16) NULL,
                          `pickup_address_id` VARCHAR(36) NOT NULL,
                          `buyer_address_id` VARCHAR(36) NOT NULL,
                          `item_description` VARCHAR(255) NOT NULL,
                          `declared_value` DECIMAL(12,2) NOT NULL DEFAULT 500.00,
                          `eway_bill_number` VARCHAR(32) NULL,
                          `gst_number` VARCHAR(32) NULL,
                          `weight` DECIMAL(10,3) NOT NULL DEFAULT 0.500,
                          `length` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
                          `width` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
                          `height` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
                          `volumetric_weight` DECIMAL(10,3) NOT NULL DEFAULT 0.200,
                          `billable_weight` DECIMAL(10,3) NOT NULL DEFAULT 0.500,
                          `payment_mode` ENUM('PREPAID', 'COD') NOT NULL DEFAULT 'PREPAID',
                          `cod_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                          `shipping_charges` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                          `shipping_payment_status` ENUM('PAID', 'PENDING', 'UNPAID') NOT NULL DEFAULT 'PENDING',
                          `courier_weight` DECIMAL(10,3) NULL,
                          `courier_length` DECIMAL(10,2) NULL,
                          `courier_width` DECIMAL(10,2) NULL,
                          `courier_height` DECIMAL(10,2) NULL,
                          `courier_billable_weight` DECIMAL(10,3) NULL,
                          `weight_dispute_status` ENUM('NO_DISPUTE', 'OPEN', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'NO_DISPUTE',
                          `weight_dispute_note` TEXT NULL,
                          `discrepancy_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                          `status` VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
                          `source` VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          INDEX `idx_order_user` (`user_id`),
                          INDEX `idx_order_status` (`status`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `shipments` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `order_id` VARCHAR(36) NOT NULL,
                          `courier_id` VARCHAR(36) NULL,
                          `awb_number` VARCHAR(100) NOT NULL UNIQUE,
                          `rate_charged` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                          `margin_earned` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                          `status` VARCHAR(50) NOT NULL DEFAULT 'READY_TO_SHIP',
                          `current_location` VARCHAR(100) NOT NULL DEFAULT 'Origin Hub',
                          `label_generated` TINYINT(1) NOT NULL DEFAULT 1,
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          INDEX `idx_shipment_order` (`order_id`),
                          INDEX `idx_shipment_awb` (`awb_number`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `tracking_events` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `shipment_id` VARCHAR(36) NOT NULL,
                          `status` VARCHAR(50) NOT NULL,
                          `description` TEXT NOT NULL,
                          `location` VARCHAR(100) NOT NULL,
                          `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          INDEX `idx_track_shipment` (`shipment_id`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
                    ");

                    // Seed default active couriers if table is empty
                    try {
                        $courierCount = (int)self::$instance->query("SELECT COUNT(*) FROM `couriers`")->fetchColumn();
                        if ($courierCount === 0) {
                            self::$instance->exec("
                                INSERT IGNORE INTO `couriers` (`id`, `name`, `code`, `logo_color`, `active`, `base_rate_per_kg`, `cod_charge_flat`, `cod_charge_percent`, `rating`, `eta_min_days`, `eta_max_days`, `rto_risk_percent`)
                                VALUES 
                                  ('c1000000-0000-0000-0000-000000000001', 'Delhivery Surface', 'DELHIVERY_SURFACE', '#000000', 1, 42.00, 25.00, 1.50, 4.30, 3, 5, 6.50),
                                  ('c1000000-0000-0000-0000-000000000002', 'Delhivery Express', 'DELHIVERY_EXPRESS', '#e11d48', 1, 65.00, 30.00, 1.80, 4.60, 1, 3, 4.20),
                                  ('c1000000-0000-0000-0000-000000000003', 'DTDC Priority', 'DTDC_EXP', '#ea580c', 1, 52.00, 25.00, 1.50, 4.50, 2, 4, 5.50),
                                  ('c1000000-0000-0000-0000-000000000004', 'BlueDart Express', 'BLUEDART_EXP', '#0284c7', 1, 78.00, 35.00, 2.00, 4.70, 1, 2, 3.50);
                            ");
                        }
                    } catch (Throwable $t) {}

                    // Seed default commission rule if empty
                    try {
                        $ruleCount = (int)self::$instance->query("SELECT COUNT(*) FROM `commission_rules`")->fetchColumn();
                        if ($ruleCount === 0) {
                            self::$instance->exec("
                                INSERT IGNORE INTO `commission_rules` (`id`, `courier_id`, `min_weight`, `max_weight`, `margin_type`, `margin_value`)
                                VALUES ('r1000000-0000-0000-0000-000000000001', NULL, 0.00, 1000.00, 'PERCENT', 10.00);
                            ");
                        }
                    } catch (Throwable $t) {}

                    // Ensure user_code column exists on relevant tables
                    try { self::$instance->exec("ALTER TABLE `users` ADD COLUMN `user_code` VARCHAR(16) NULL AFTER `id`"); } catch (Throwable $t) {}
                    try { self::$instance->exec("ALTER TABLE `wallet_recharges` ADD COLUMN `user_code` VARCHAR(16) NULL AFTER `user_id`"); } catch (Throwable $t) {}
                    try { self::$instance->exec("ALTER TABLE `wallet_transactions` ADD COLUMN `user_code` VARCHAR(16) NULL AFTER `user_id`"); } catch (Throwable $t) {}
                    try { self::$instance->exec("ALTER TABLE `orders` ADD COLUMN `user_code` VARCHAR(16) NULL AFTER `user_id`"); } catch (Throwable $t) {}
                    try { self::$instance->exec("ALTER TABLE `orders` MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED'"); } catch (Throwable $t) {}
                } catch (Throwable $ignore) {}

            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    'error' => 'Database connection failed. Please verify credentials in api/config/db.php',
                    'details' => $e->getMessage()
                ]);
                exit;
            }
        }

        return self::$instance;
    }
}
