create table if not exists form_content (
  id smallint primary key check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);

insert into form_content (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
