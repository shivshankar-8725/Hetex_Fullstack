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
            $pass = Credentials::get('DB_PASS', 'Piyush@1197');
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);

                // Auto self-heal: Ensure essential tables exist so no query ever fails
                try {
                    self::$instance->exec("
                        CREATE TABLE IF NOT EXISTS `order_items` (
                          `id` VARCHAR(36) NOT NULL,
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
                          PRIMARY KEY (`id`),
                          INDEX `idx_items_order` (`order_id`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `platform_settings` (
                          `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
                          `setting_value` TEXT NOT NULL,
                          `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS `wallet_recharges` (
                          `id` VARCHAR(64) NOT NULL PRIMARY KEY,
                          `user_id` VARCHAR(36) NOT NULL,
                          `amount` DECIMAL(10,2) NOT NULL,
                          `payment_method` VARCHAR(32) NOT NULL DEFAULT 'UPI',
                          `upi_id` VARCHAR(128) NULL,
                          `utr_number` VARCHAR(64) NULL,
                          `status` ENUM('UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'UNDER_REVIEW',
                          `admin_notes` TEXT NULL,
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          `reviewed_at` DATETIME NULL
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                    ");
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
