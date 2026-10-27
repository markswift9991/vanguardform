alter table riders
  add column if not exists residential_state text not null default '',
  add column if not exists residential_city text not null default '',
  add column if not exists residential_postal_code text not null default '';

alter table guarantors
  add column if not exists guarantor_state text not null default '',
  add column if not exists guarantor_city text not null default '',
  add column if not exists guarantor_postal_code text not null default '';
