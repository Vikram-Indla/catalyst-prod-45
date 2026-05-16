-- user_widget_settings: columns match useWidgetSettings.ts (user_id, dashboard_id, widget_id, config)
create table if not exists user_widget_settings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  dashboard_id text not null,
  widget_id    text not null,
  config       jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, dashboard_id, widget_id)
);

alter table user_widget_settings enable row level security;

create policy "Users manage own widget settings"
  on user_widget_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- dashboard_widget_defaults: columns match useWidgetSettings.ts (dashboard_id, widget_id, default_config)
create table if not exists dashboard_widget_defaults (
  id             uuid primary key default gen_random_uuid(),
  dashboard_id   text not null,
  widget_id      text not null,
  default_config jsonb not null default '{}',
  created_at     timestamptz not null default now(),
  unique (dashboard_id, widget_id)
);

alter table dashboard_widget_defaults enable row level security;

create policy "Anyone can read widget defaults"
  on dashboard_widget_defaults
  for select
  using (true);

-- intervention_active column on business_requests
alter table business_requests
  add column if not exists intervention_active boolean not null default false;

create index if not exists idx_business_requests_intervention_active
  on business_requests (intervention_active)
  where intervention_active = true;
