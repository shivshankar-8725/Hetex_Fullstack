<?php
/**
 * Hetex Courier - Database Connection (Hostinger MySQL / MariaDB)
 */

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // Read from environment or fallback to defaults
            $host = getenv('DB_HOST') ?: 'localhost';
            $port = getenv('DB_PORT') ?: '3306';
            $db   = getenv('DB_NAME') ?: 'u969244453_hetex';
            $user = getenv('DB_USER') ?: 'u969244453_hetexuser';
            $pass = getenv('DB_PASS') ?: 'Piyush@1197';
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
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
