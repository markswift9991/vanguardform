create table if not exists telegram_settings (
  id smallint primary key check (id = 1),
  encrypted_credentials bytea not null,
  nonce bytea not null,
  auth_tag bytea not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);
