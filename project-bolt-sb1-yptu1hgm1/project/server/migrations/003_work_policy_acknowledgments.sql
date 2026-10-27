alter table riders
  add column work_policy_accepted boolean not null default false;

alter table guarantors
  add column work_policy_accepted boolean not null default false;
