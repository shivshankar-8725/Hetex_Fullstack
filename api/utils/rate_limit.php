<?php
/**
 * Rate Limiting Middleware
 * Tracks attempts by client IP and action to prevent brute-force attacks.
 */

class RateLimiter {
    private static string $storageDir = __DIR__ . '/../cache/rate_limits';

    /**
     * Checks if current IP has exceeded maximum attempts.
     * If exceeded, terminates request with HTTP 429 and Retry-After header.
     *
     * @param string $action Action key (e.g. 'login', 'forgot_password')
     * @param int $maxAttempts Maximum allowed attempts within time window
     * @param int $decaySeconds Window duration in seconds
     */
    public static function check(string $action, int $maxAttempts = 5, int $decaySeconds = 60): void {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
            ?? $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['REMOTE_ADDR']
            ?? '127.0.0.1';

        // Extract first IP in comma-separated list
        if (str_contains($ip, ',')) {
            $ip = trim(explode(',', $ip)[0]);
        }

        $ipHash = md5($ip . '_' . $action);
        $file = self::getStoragePath() . '/' . $ipHash . '.json';

        $now = time();
        $data = ['count' => 0, 'first_attempt' => $now];

        if (file_exists($file)) {
            $content = @file_get_contents($file);
            if ($content) {
                $decoded = json_decode($content, true);
                if (is_array($decoded) && isset($decoded['first_attempt'])) {
                    if (($now - $decoded['first_attempt']) < $decaySeconds) {
                        $data = $decoded;
                    }
                }
            }
        }

        $data['count'] = ($data['count'] ?? 0) + 1;
        @file_put_contents($file, json_encode($data), LOCK_EX);

        if ($data['count'] > $maxAttempts) {
            $retryAfter = max(1, $decaySeconds - ($now - $data['first_attempt']));
            http_response_code(429);
            header('Content-Type: application/json; charset=utf-8');
            header("Retry-After: {$retryAfter}");
            echo json_encode([
                'success' => false,
                'error' => "Too many attempts. Please try again after {$retryAfter} seconds.",
                'retryAfter' => $retryAfter
            ]);
            exit;
        }
    }

    /**
     * Clears rate limit counter on successful action (e.g. valid login)
     */
    public static function clear(string $action): void {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
            ?? $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['REMOTE_ADDR']
            ?? '127.0.0.1';
        if (str_contains($ip, ',')) {
            $ip = trim(explode(',', $ip)[0]);
        }
        $ipHash = md5($ip . '_' . $action);
        $file = self::getStoragePath() . '/' . $ipHash . '.json';
        if (file_exists($file)) {
            @unlink($file);
        }
    }

    private static function getStoragePath(): string {
        if (!is_dir(self::$storageDir)) {
            @mkdir(self::$storageDir, 0755, true);
        }
        return self::$storageDir;
    }
}
