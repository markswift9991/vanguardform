# cPanel PHP deployment

The production bundle serves the built React frontend from Apache and routes
same-origin `/api/...` requests to the native PHP API. No Node.js application
or Node runtime is required on cPanel. Node.js is used only to build the static
frontend locally.

## 1. Build the upload archive

Use Node.js 20+ and npm on the build machine:

```sh
npm ci
npm run build:cpanel
```

This creates `vanguard-velocity-php-cpanel.zip` in the workspace parent
directory. It contains the frontend files at its root, the PHP API, PostgreSQL
migrations, the Aiven CA certificate, and Apache/PHP configuration. It excludes
`.env`, dependency folders, and the unused legacy Node backend.

## 2. Configure cPanel

1. Select PHP 8.1 or newer for the domain's document root.
2. Ensure `pdo_pgsql`, `openssl`, and `fileinfo` are enabled. PHP cURL is
   recommended for Telegram notifications.
3. Ensure Apache `mod_rewrite` and `.htaccess` overrides are enabled.
4. Upload and extract the archive directly into the domain's **document root**.
   The root must contain `index.html`, `assets/`, `.htaccess`, and `api/`.
   Do not extract the archive into a nested directory unless that directory is
   configured as the domain document root.
5. Copy `.env.example` to `.env` and set your server-only values. Keep the
   database password and Telegram encryption key out of frontend variables.
6. Configure PHP upload settings from `.user.ini` if cPanel does not apply the
   included values. The maximum upload size is 50 MB per file and the request
   limit is set to 210 MB for the four-file rider submission.

The `.htaccess` routes `/api/...` requests to PHP, serves existing static files
directly, and falls back to `index.html` for SPA paths such as `/admin/login`.
It also denies web access to `.env`, the database migrations, and internal PHP
bootstrap scripts.

## 3. Configure and migrate Aiven PostgreSQL

Set these variables in cPanel's PHP application environment or in `.env` in the
document root:

- `PGHOST`: Aiven PostgreSQL hostname
- `PGPORT`: Aiven PostgreSQL port
- `PGDATABASE`: database name
- `PGUSER`: database user
- `PGPASSWORD`: current database password
- `PG_CA_CERT_PATH`: `server/certs/aiven-ca.pem`
- `TELEGRAM_SETTINGS_ENCRYPTION_KEY`: persistent base64-encoded random 32-byte
  key generated once with `openssl rand -base64 32`

The packaged Aiven CA certificate is used for verified TLS (`verify-full`).
Do not disable certificate verification. Never store database credentials or
the Telegram encryption key in `VITE_` variables. Keep the encryption key
unchanged and backed up; Telegram credentials saved with the key cannot be
decrypted if it is lost or replaced.

From cPanel Terminal, run the migration command from the document root:

```sh
php api/migrate.php
```

This applies the numbered SQL migrations in order and skips applied versions.
If the database already has project tables without migration records, the
runner stops rather than guessing how to alter that database. The complete
schema remains available in `server/schema.sql`.

## 4. Verify and create the administrator

Open and verify:

- `https://your-domain.example/` — rider application
- `https://your-domain.example/api/health` — JSON health and schema status
- `https://your-domain.example/admin/login` — administrator sign-in

Create the first administrator from `/admin/login` only while there are no
administrator accounts. After the first account is created, only a signed-in
administrator can create additional accounts. Passwords are stored as bcrypt
hashes; admin sessions are random, hashed in the database, and expire after
12 hours.

The admin panel's **Notifications** section configures the Telegram bot and
destination. The credentials are AES-256-GCM encrypted in PostgreSQL. A
notification delivery failure does not undo a rider submission.

### Troubleshooting

- An HTML 404 for `/api/health` means the request is not reaching the PHP
  rewrite. Confirm the domain document root, `.htaccess`, and `mod_rewrite`.
- A JSON 503 means PHP is running but a database setting, extension, certificate,
  credential, network allowlist, permission, or migration needs attention. The
  health response now gives a safe diagnostic category; it never includes the
  database password. SQLSTATE details are also written to the cPanel PHP error
  log.
- A PHP database connection error mentioning the driver means `pdo_pgsql` is
  not enabled for the selected PHP version.

The production archive uses Apache and PHP only. Vite/Node is needed on the
build machine; it is not needed to run the deployed site.
