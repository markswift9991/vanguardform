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

create index if not exists admin_sessions_expiry_idx on admin_sessions (expires_at);

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
  residential_address text not null default '',
  phone_number text not null,
  email_address text not null default '',
  marital_status text not null default '',
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
  video_path text,
  location_latitude double precision,
  location_longitude double precision,
  location_accuracy_meters double precision,
  location_captured_at timestamptz,
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
  guarantor_phone_confirmed text not null default '',
  relationship text not null default '',
  occupation text not null default '',
  nin text not null default '',
  nin_document_path text,
  video_path text,
  digital_signature text not null default '',
  confirmation boolean not null default false,
  location_latitude double precision,
  location_longitude double precision,
  location_accuracy_meters double precision,
  location_captured_at timestamptz
);

create index if not exists guarantors_rider_id_idx on guarantors (rider_id);
create index if not exists riders_created_at_idx on riders (created_at desc);
