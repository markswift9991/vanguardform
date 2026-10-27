alter table riders
  add column if not exists state_of_origin_city text not null default '',
  add column if not exists state_of_origin_address text not null default '';

alter table guarantors
  add column if not exists state_of_origin text not null default '',
  add column if not exists state_of_origin_city text not null default '',
  add column if not exists state_of_origin_address text not null default '';
