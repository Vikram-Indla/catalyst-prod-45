-- Release Operations admin config: option lists + module settings.
-- All values non-PII config. Writes gated by rh_is_manager(auth.uid()).
-- Backs the /admin/release-ops panel + the create modals + settings page.

create table if not exists public.rh_config_options (
  id uuid primary key default gen_random_uuid(),
  config_key text not null,
  value text not null,
  label text not null,
  color_category text check (color_category in ('todo','in_progress','done','terminal')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (config_key, value)
);
create index if not exists rh_config_options_key_idx on public.rh_config_options (config_key, sort_order);

create table if not exists public.rh_config_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now()
);

-- updated_at maintenance (moddatetime extension is enabled per baseline)
drop trigger if exists rh_config_options_set_updated on public.rh_config_options;
create trigger rh_config_options_set_updated before update on public.rh_config_options
  for each row execute function moddatetime (updated_at);
drop trigger if exists rh_config_settings_set_updated on public.rh_config_settings;
create trigger rh_config_settings_set_updated before update on public.rh_config_settings
  for each row execute function moddatetime (updated_at);

alter table public.rh_config_options enable row level security;
alter table public.rh_config_settings enable row level security;

-- SELECT: any authenticated user (config drives UI everywhere). Non-PII.
drop policy if exists rh_config_options_select on public.rh_config_options;
create policy rh_config_options_select on public.rh_config_options
  for select to authenticated using (true);
drop policy if exists rh_config_settings_select on public.rh_config_settings;
create policy rh_config_settings_select on public.rh_config_settings
  for select to authenticated using (true);

-- WRITE: release/change managers only, via SECURITY DEFINER helper rh_is_manager.
drop policy if exists rh_config_options_write on public.rh_config_options;
create policy rh_config_options_write on public.rh_config_options
  for all to authenticated
  using (public.rh_is_manager(auth.uid()))
  with check (public.rh_is_manager(auth.uid()));
drop policy if exists rh_config_settings_write on public.rh_config_settings;
create policy rh_config_settings_write on public.rh_config_settings
  for all to authenticated
  using (public.rh_is_manager(auth.uid()))
  with check (public.rh_is_manager(auth.uid()));

-- Seed option lists (label = initcap of value with underscores spaced).
insert into public.rh_config_options (config_key, value, label, color_category, sort_order, is_system)
select v.config_key, v.value,
       initcap(replace(v.value, '_', ' ')) as label,
       v.color_category, v.sort_order, v.is_system
from (values
  -- release_type
  ('release_type','regular',null,1,false),
  ('release_type','minor',null,2,false),
  ('release_type','major',null,3,false),
  ('release_type','hotfix',null,4,false),
  ('release_type','emergency',null,5,false),
  -- change_type
  ('change_type','standard',null,1,false),
  ('change_type','normal',null,2,false),
  ('change_type','emergency',null,3,false),
  ('change_type','hotfix',null,4,false),
  -- target_env
  ('target_env','qa',null,1,false),
  ('target_env','beta',null,2,false),
  ('target_env','staging',null,3,false),
  ('target_env','production',null,4,false),
  -- deployment_category
  ('deployment_category','frontend',null,1,false),
  ('deployment_category','backend',null,2,false),
  ('deployment_category','integration',null,3,false),
  ('deployment_category','database',null,4,false),
  ('deployment_category','full_stack',null,5,false),
  ('deployment_category','configuration',null,6,false),
  -- risk_level
  ('risk_level','low',null,1,false),
  ('risk_level','medium',null,2,false),
  ('risk_level','high',null,3,false),
  ('risk_level','critical',null,4,false),
  -- approval_role
  ('approval_role','qa',null,1,false),
  ('approval_role','uat',null,2,false),
  ('approval_role','product_owner',null,3,false),
  ('approval_role','project_manager',null,4,false),
  ('approval_role','change_manager',null,5,false),
  -- sop_step_type
  ('sop_step_type','manual',null,1,false),
  ('sop_step_type','script',null,2,false),
  ('sop_step_type','deployment',null,3,false),
  ('sop_step_type','validation',null,4,false),
  ('sop_step_type','communication',null,5,false),
  ('sop_step_type','rollback',null,6,false),
  -- release_status (9 canonical stages + 2 terminal)
  ('release_status','draft','todo',1,true),
  ('release_status','planned','todo',2,true),
  ('release_status','in_readiness','todo',3,true),
  ('release_status','ready_for_signoff','todo',4,true),
  ('release_status','approved','in_progress',5,true),
  ('release_status','scheduled','in_progress',6,true),
  ('release_status','deploying','in_progress',7,true),
  ('release_status','monitoring','in_progress',8,true),
  ('release_status','completed','done',9,true),
  ('release_status','rolled_back','terminal',10,false),
  ('release_status','cancelled','terminal',11,false),
  -- change_status (9 canonical stages + 2 terminal)
  ('change_status','draft','todo',1,true),
  ('change_status','assessing','todo',2,true),
  ('change_status','ready_for_approval','todo',3,true),
  ('change_status','approved','in_progress',4,true),
  ('change_status','scheduled','in_progress',5,true),
  ('change_status','implementing','in_progress',6,true),
  ('change_status','validating','in_progress',7,true),
  ('change_status','implemented','done',8,true),
  ('change_status','closed','done',9,true),
  ('change_status','failed','terminal',10,false),
  ('change_status','rolled_back','terminal',11,false),
  -- signoff_status
  ('signoff_status','pending','todo',1,false),
  ('signoff_status','waiting','todo',2,false),
  ('signoff_status','approved','done',3,false),
  ('signoff_status','rejected','terminal',4,false),
  -- freeze_status
  ('freeze_status','scheduled','todo',1,false),
  ('freeze_status','active','in_progress',2,false),
  ('freeze_status','lifted','done',3,false),
  -- override_policy
  ('override_policy','blocked',null,1,false),
  ('override_policy','approval_required',null,2,false),
  ('override_policy','allowed',null,3,false),
  -- applicability
  ('applicability','all_envs',null,1,false),
  ('applicability','production_only',null,2,false),
  ('applicability','by_product',null,3,false),
  -- event_type
  ('event_type','deployment',null,1,false),
  ('event_type','hotfix',null,2,false),
  ('event_type','rollback',null,3,false),
  -- deployment_result
  ('deployment_result','success','done',1,false),
  ('deployment_result','partial','in_progress',2,false),
  ('deployment_result','failed','terminal',3,false)
) as v(config_key, value, color_category, sort_order, is_system)
on conflict (config_key, value) do nothing;

-- Module settings
insert into public.rh_config_settings (key, value, description) values
  ('change_number_prefix', '"CAT-CHG-"'::jsonb, 'Prefix for Catalyst-created change numbers'),
  ('change_number_padding', '4'::jsonb, 'Zero-pad width for the change sequence'),
  ('notify_on_status_change', 'true'::jsonb, 'Notify subscribers on every lifecycle status transition'),
  ('notify_on_create', 'true'::jsonb, 'Notify subscribers when a release/change is created'),
  ('risk_role_map', '{"low":["qa"],"medium":["qa","uat"],"high":["qa","uat","change_manager"],"critical":["qa","uat","change_manager","product_owner"]}'::jsonb, 'Required sign-off roles per risk level')
on conflict (key) do nothing;
