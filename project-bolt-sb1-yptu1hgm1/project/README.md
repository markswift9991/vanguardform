# Vanguard Velocity Rider Applications

The application, administrator accounts/sessions, and private documents are
stored in Aiven PostgreSQL. The production backend is native PHP and has no
Supabase or Node.js runtime dependency.

## Local setup

1. Use PHP 8.1+ with `pdo_pgsql`, `openssl`, and `fileinfo`, plus Node.js 20+
   and npm for the frontend build.
2. Copy `.env.example` to `.env` and configure the Aiven connection. Never add
   server secrets to `VITE_` variables.
3. The Aiven CA certificate is in `server/certs/aiven-ca.pem`; verified TLS is
   required.
4. Apply the numbered schema migrations with `npm run db:migrate`.
5. Build the frontend with `npm run build`, then run both local servers with
   `npm run dev:all`. Vite serves the frontend and proxies `/api` to PHP.
6. Create the first admin account from `/admin/login`. Initial registration is
   available only when there are no admins; later account creation requires an
   authenticated admin. Passwords are stored as bcrypt hashes.

For cPanel deployment, run `npm run build:cpanel` and follow
[CPANEL-DEPLOY.md](./CPANEL-DEPLOY.md). The archive has the static frontend at
its root and needs Apache with PHP, not a Node.js application.

## Application features

Rider and guarantor submissions, administrator authentication and review,
form-content editing, company branding, private document storage, and Telegram
notifications use the same PHP/PostgreSQL API. Uploaded documents are stored
as private `bytea` records in Aiven, with a 50 MB per-file limit. Riders and
guarantors must provide an exactly 11-digit NIN and scan their NIN document;
riders scan both sides of their identity card, while guarantors scan the front,
in addition to required video verification. Only an authenticated
administrator can retrieve uploaded documents.

Location is requested only when a rider or guarantor submits the form.
Submission is blocked if browser location permission is unavailable or
declined. Rider and guarantor forms capture residential state/city and state of
origin/city/address. Address suggestions are provided by Photon
(OpenStreetMap); typed searches are sent to that service, and selecting a
suggestion is optional.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `php -l api/index.php`
- `php -l api/migrate.php`
