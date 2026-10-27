alter table riders
  add column if not exists identity_card_front_path text,
  add column if not exists identity_card_back_path text;

alter table guarantors
  add column if not exists identity_card_front_path text,
  add column if not exists identity_card_back_path text;
