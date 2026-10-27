<?php
declare(strict_types=1);

const API_SESSION_COOKIE = 'vanguard_admin_session';
const API_SESSION_SECONDS = 43200;
const API_MAX_UPLOAD_BYTES = 52428800;

function api_load_environment(): void
{
    $envFile = dirname(__DIR__) . '/.env';
    if (!is_file($envFile) || !is_readable($envFile)) {
        return;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) {
        throw new RuntimeException('Could not read the .env file.');
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $separator = strpos($line, '=');
        if ($separator === false) {
            throw new RuntimeException('Invalid .env entry. Expected KEY=value.');
        }
        $key = trim(substr($line, 0, $separator));
        $value = trim(substr($line, $separator + 1));
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $key)) {
            throw new RuntimeException('Invalid environment variable name in .env.');
        }
        if (strlen($value) >= 2 && (($value[0] === '"' && str_ends_with($value, '"'))
            || ($value[0] === "'" && str_ends_with($value, "'")))) {
            $value = substr($value, 1, -1);
        }
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

function api_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value !== false) {
        return $value;
    }
    return $_ENV[$key] ?? $default;
}

function api_database_missing(): array
{
    $missing = [];
    foreach (['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'] as $name) {
        if (api_env($name) === null || api_env($name) === '') {
            $missing[] = $name;
        }
    }
    if (!extension_loaded('pdo_pgsql')) {
        $missing[] = 'PHP PDO PostgreSQL extension (pdo_pgsql)';
    }
    foreach (['fileinfo', 'openssl'] as $extension) {
        if (!extension_loaded($extension)) {
            $missing[] = 'PHP ' . $extension . ' extension';
        }
    }
    $caSetting = api_env('PG_CA_CERT_PATH', 'server/certs/aiven-ca.pem');
    $caPath = str_starts_with((string)$caSetting, '/') ? (string)$caSetting : dirname(__DIR__) . '/' . $caSetting;
    if (!is_file($caPath) || !is_readable($caPath)) {
        $missing[] = 'PG_CA_CERT_PATH';
    }
    return $missing;
}

function api_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $missing = api_database_missing();
    if ($missing !== []) {
        throw new ApiException(503, 'Aiven connection is not configured. Check ' . implode(', ', $missing) . '.');
    }
    $caSetting = api_env('PG_CA_CERT_PATH', 'server/certs/aiven-ca.pem');
    $caPath = str_starts_with((string)$caSetting, '/') ? (string)$caSetting : dirname(__DIR__) . '/' . $caSetting;
    $host = (string)api_env('PGHOST');
    $port = (string)api_env('PGPORT', '25042');
    $database = (string)api_env('PGDATABASE');
    $dsn = 'pgsql:host=' . $host . ';port=' . $port . ';dbname=' . $database
        . ';sslmode=verify-full;sslrootcert=' . $caPath;
    $pdo = new PDO($dsn, (string)api_env('PGUSER'), (string)api_env('PGPASSWORD'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => false,
    ]);
    return $pdo;
}

final class ApiException extends RuntimeException
{
    public function __construct(public readonly int $statusCode, string $message)
    {
        parent::__construct($message);
    }
}

function api_require(bool $condition, string $message, int $status = 400): void
{
    if (!$condition) {
        throw new ApiException($status, $message);
    }
}

function api_json(mixed $value, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function api_error(int $status, string $message): never
{
    api_json(['error' => $message], $status);
}

function api_read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    if (strlen($raw) > 1024 * 1024) {
        throw new ApiException(413, 'Request body is too large.');
    }
    try {
        $body = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new ApiException(400, 'Request body must contain valid JSON.');
    }
    if (!is_array($body)) {
        throw new ApiException(400, 'Request body must be an object.');
    }
    return $body;
}

function api_cookie_token(): string
{
    $token = $_COOKIE[API_SESSION_COOKIE] ?? '';
    return is_string($token) ? $token : '';
}

function api_token_hash(string $token): string
{
    return hash('sha256', $token);
}

function api_set_session_cookie(string $token, int $maxAge): void
{
    $secure = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    setcookie(API_SESSION_COOKIE, $token, [
        'expires' => time() + $maxAge,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function api_clear_session_cookie(): void
{
    $secure = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    setcookie(API_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function api_ensure_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $fetchSite = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($origin === '') {
        if ($fetchSite === 'cross-site') {
            throw new ApiException(403, 'Cross-origin requests are not allowed.');
        }
        return;
    }
    $originHost = parse_url($origin, PHP_URL_HOST);
    $originPort = parse_url($origin, PHP_URL_PORT);
    $originScheme = parse_url($origin, PHP_URL_SCHEME);
    $host = strtolower(trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? ''), 2)[0]));
    $host = preg_replace('/:\d+$/', '', $host) ?? $host;
    $effectivePort = $originPort ?? ($originScheme === 'https' ? 443 : 80);
    $requestHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $requestPort = str_contains($requestHost, ':') ? (int)substr(strrchr($requestHost, ':'), 1) : ($originScheme === 'https' ? 443 : 80);
    if (!is_string($originHost) || strtolower($originHost) !== $host
        || ($effectivePort !== $requestPort && $fetchSite !== 'same-origin')) {
        throw new ApiException(403, 'Cross-origin requests are not allowed.');
    }
}

function api_require_admin(): array
{
    $token = api_cookie_token();
    if ($token === '') {
        throw new ApiException(401, 'Administrator sign-in is required.');
    }
    $statement = api_db()->prepare(
        'select u.id, u.email from admin_sessions s join admin_users u on u.id = s.admin_user_id
         where s.session_hash = :hash and s.expires_at > now()'
    );
    $statement->execute(['hash' => api_token_hash($token)]);
    $admin = $statement->fetch();
    if (!$admin) {
        api_clear_session_cookie();
        throw new ApiException(401, 'Administrator session expired. Please sign in again.');
    }
    return $admin;
}

function api_rate_limit(): void
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $path = sys_get_temp_dir() . '/vanguard-admin-rate-' . hash('sha256', $ip) . '.json';
    $handle = fopen($path, 'c+');
    if ($handle === false) {
        throw new ApiException(503, 'Could not check sign-in rate limit.');
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            throw new ApiException(503, 'Could not check sign-in rate limit.');
        }
        $content = stream_get_contents($handle);
        $attempts = is_string($content) ? json_decode($content, true) : [];
        $cutoff = time() - 900;
        $attempts = is_array($attempts) ? array_values(array_filter($attempts, static fn($time) => is_int($time) && $time > $cutoff)) : [];
        if (count($attempts) >= 10) {
            throw new ApiException(429, 'Too many sign-in attempts. Try again later.');
        }
        $attempts[] = time();
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($attempts));
        fflush($handle);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
