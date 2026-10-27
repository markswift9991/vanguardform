<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

api_load_environment();

try {
    $missing = api_database_missing();
    if ($missing !== []) {
        throw new RuntimeException('Aiven connection is not configured. Check ' . implode(', ', $missing) . '.');
    }

    $db = api_db();
    $db->exec(
        'create table if not exists schema_migrations (
            version text primary key,
            applied_at timestamptz not null default now()
        )'
    );
    $migrationDirectory = dirname(__DIR__) . '/server/migrations';
    $files = glob($migrationDirectory . '/*.sql');
    if (!is_array($files)) {
        throw new RuntimeException('Could not read the PostgreSQL migration directory.');
    }
    sort($files, SORT_STRING);

    foreach ($files as $file) {
        $filename = basename($file);
        if (!preg_match('/^\d{3}_[a-z0-9_]+\.sql$/', $filename)) {
            continue;
        }
        $version = substr($filename, 0, -4);
        $statement = $db->prepare('select 1 from schema_migrations where version = ?');
        $statement->execute([$version]);
        if ($statement->fetchColumn()) {
            fwrite(STDOUT, "Migration {$version} is already applied.\n");
            continue;
        }
        if ($version === '001_initial') {
            $existing = $db->query(
                "select to_regclass('public.riders') as riders,
                        to_regclass('public.guarantors') as guarantors,
                        to_regclass('public.admin_users') as admin_users"
            )->fetch();
            if (is_array($existing) && array_filter($existing, static fn($value): bool => $value !== null) !== []) {
                throw new RuntimeException('Target tables already exist without this migration record; refusing to alter an unverified database.');
            }
        }

        $sql = file_get_contents($file);
        if (!is_string($sql) || trim($sql) === '') {
            throw new RuntimeException("Migration {$version} is empty or unreadable.");
        }
        try {
            $db->beginTransaction();
            $db->exec($sql);
            $statement = $db->prepare('insert into schema_migrations (version) values (?)');
            $statement->execute([$version]);
            $db->commit();
            fwrite(STDOUT, "Migration {$version} applied successfully.\n");
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
    }
} catch (Throwable $error) {
    error_log('Aiven schema migration failed: ' . get_class($error));
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
