-- Vanguard Velocity application schema for Aiven PostgreSQL.
-- Safe to run more than once against this project's database.
begin;

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  session_hash text primary key,
  admin_user_id uuid not null references admin_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists form_content (
  id smallint primary key check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);

create table if not exists company_branding (
  id smallint primary key check (id = 1),
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  image_data bytea not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);

create table if not exists telegram_settings (
  id smallint primary key check (id = 1),
  encrypted_credentials bytea not null,
  nonce bytea not null,
  auth_tag bytea not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);

create table if not exists application_files (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  file_data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists riders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  full_name text not null,
  date_of_birth date,
  place_of_birth text not null default '',
  state_of_origin text not null default '',
  state_of_origin_city text not null default '',
  state_of_origin_address text not null default '',
  residential_address text not null default '',
  phone_number text not null,
  email_address text not null default '',
  marital_status text not null default '',
  residential_state text not null default '',
  residential_city text not null default '',
  residential_postal_code text not null default '',
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  relationship_to_emergency_contact text not null default '',
  has_delivery_experience boolean not null default false,
  employment_history jsonb not null default '[]'::jsonb,
  communication_skills boolean not null default false,
  motorcycle_safety boolean not null default false,
  motorcycle_maintenance boolean not null default false,
  health_challenge boolean not null default false,
  health_details text not null default '',
  skills_experience text not null default '',
  nin text not null default '',
  nin_document_path text,
  identity_card_front_path text,
  identity_card_back_path text,
  video_path text,
  location_latitude double precision,
  location_longitude double precision,
  location_accuracy_meters double precision,
  location_captured_at timestamptz,
  work_policy_accepted boolean not null default false,
  terms_accepted boolean not null default false,
  terms_signature text not null default '',
  terms_signed_at timestamptz,
  company_representative_signature text not null default ''
);

create table if not exists guarantors (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  phone_number text not null,
  status text not null default 'pending'
    check (status in ('pending', 'submitted')),
  verification_token text not null unique default gen_random_uuid()::text,
  submitted_at timestamptz,
  guarantor_address text not null default '',
  guarantor_state text not null default '',
  guarantor_city text not null default '',
  guarantor_postal_code text not null default '',
  state_of_origin text not null default '',
  state_of_origin_city text not null default '',
  state_of_origin_address text not null default '',
  guarantor_phone_confirmed text not null default '',
  relationship text not null default '',
  occupation text not null default '',
  nin text not null default '',
  nin_document_path text,
  identity_card_front_path text,
  identity_card_back_path text,
  video_path text,
  digital_signature text not null default '',
  confirmation boolean not null default false,
  work_policy_accepted boolean not null default false,
  location_latitude double precision,
  location_longitude double precision,
  location_accuracy_meters double precision,
  location_captured_at timestamptz
);

alter table riders
  add column if not exists work_policy_accepted boolean not null default false;

alter table guarantors
  add column if not exists work_policy_accepted boolean not null default false;

alter table riders
  add column if not exists identity_card_front_path text,
  add column if not exists identity_card_back_path text;

alter table guarantors
  add column if not exists identity_card_front_path text,
  add column if not exists identity_card_back_path text;

alter table riders
  add column if not exists residential_state text not null default '',
  add column if not exists residential_city text not null default '',
  add column if not exists residential_postal_code text not null default '';

alter table guarantors
  add column if not exists guarantor_state text not null default '',
  add column if not exists guarantor_city text not null default '',
  add column if not exists guarantor_postal_code text not null default '';

alter table riders
  add column if not exists state_of_origin_city text not null default '',
  add column if not exists state_of_origin_address text not null default '';

alter table guarantors
  add column if not exists state_of_origin text not null default '',
  add column if not exists state_of_origin_city text not null default '',
  add column if not exists state_of_origin_address text not null default '';

create index if not exists admin_sessions_expiry_idx on admin_sessions (expires_at);
create index if not exists guarantors_rider_id_idx on guarantors (rider_id);
create index if not exists riders_created_at_idx on riders (created_at desc);

insert into schema_migrations (version)
values
  ('001_initial'),
  ('002_auth_and_files'),
  ('003_work_policy_acknowledgments'),
  ('004_identity_card_scans'),
  ('005_residential_locations'),
  ('006_state_of_origin_location'),
  ('007_state_of_origin_details'),
  ('008_admin_form_cms'),
  ('009_company_logo')
on conflict (version) do nothing;

commit;
