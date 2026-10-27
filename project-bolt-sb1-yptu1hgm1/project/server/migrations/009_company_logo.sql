create table if not exists company_branding (
  id smallint primary key check (id = 1),
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  image_data bytea not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);
