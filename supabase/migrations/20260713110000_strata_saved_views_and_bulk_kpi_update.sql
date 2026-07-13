-- CAT-STRATA-IMPL-20260712-001 · Phase 2 · slice 2C-2a
-- KPI & OKR Library (anchor 16) backend:
--   1. strata_saved_views       — per-user named filter/column view configs (canonical BasicFilterBar).
--   2. strata_bulk_update_kpis   — governed bulk owner / threshold-scheme reassignment that LOOPS the
--      existing strata_update_kpi. Draft/pending KPIs are edited in place (they still route through the
--      normal draft → pending_approval → approved lifecycle before going live); approved KPIs return the
--      honest per-row rejection ("retire and recreate to change an approved KPI"). No new versioning
--      subsystem is introduced (session-007 decision — approved-KPI revision is a separate feature).

-- ============================================================================
-- 1. strata_saved_views  (per-user, private; NOT URL-navigated → no slug contract)
-- ============================================================================
create table if not exists public.strata_saved_views (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id         uuid not null default auth.uid(),
  entity          text not null default 'kpi',
  name            text not null,
  config          jsonb not null default '{}'::jsonb,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint strata_saved_views_entity_ck check (entity in ('kpi')),
  constraint strata_saved_views_name_ck   check (btrim(name) <> ''),
  unique (user_id, entity, name)
);

comment on table public.strata_saved_views is
  'Per-user named view configs (filters + columns + sort) for STRATA list surfaces. Private per user; not URL-navigated (no slug).';

create index if not exists strata_saved_views_user_entity_idx
  on public.strata_saved_views (user_id, entity);

alter table public.strata_saved_views enable row level security;

-- Per-user private config: a user sees and manages ONLY their own views.
create policy strata_saved_views_select on public.strata_saved_views
  for select using (user_id = auth.uid());
create policy strata_saved_views_insert on public.strata_saved_views
  for insert with check (user_id = auth.uid());
create policy strata_saved_views_update on public.strata_saved_views
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy strata_saved_views_delete on public.strata_saved_views
  for delete using (user_id = auth.uid());

create trigger trg_strata_saved_views_touch
  before update on public.strata_saved_views
  for each row execute function public.strata_touch_updated_at();

-- ============================================================================
-- 2. strata_bulk_update_kpis  (governed bulk owner / threshold-scheme reassignment)
-- ============================================================================
create or replace function public.strata_bulk_update_kpis(
  p_kpi_ids           uuid[],
  p_accountable_owner uuid default null,
  p_threshold_scheme  uuid default null,
  p_reason            text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id      uuid;
  v_results jsonb := '[]'::jsonb;
  v_err     text;
begin
  if p_kpi_ids is null or array_length(p_kpi_ids, 1) is null then
    raise exception 'no KPIs selected';
  end if;
  if p_accountable_owner is null and p_threshold_scheme is null then
    raise exception 'nothing to change: provide an owner or a threshold scheme';
  end if;
  -- Fail fast on the same role gate strata_update_kpi enforces (admins satisfy strata_has_role).
  if not public.strata_has_role(array['strategy_office','kpi_owner']) then
    raise exception 'bulk KPI update requires strategy_office, kpi_owner or admin role';
  end if;

  -- Per-KPI subtransaction: one blocked (e.g. approved) KPI never aborts the rest of the batch.
  foreach v_id in array p_kpi_ids loop
    begin
      perform public.strata_update_kpi(
        p_kpi               => v_id,
        p_accountable_owner => p_accountable_owner,
        p_threshold_scheme  => p_threshold_scheme
      );
      v_results := v_results || jsonb_build_object('kpi_id', v_id, 'ok', true);
    exception when others then
      v_err := sqlerrm;
      v_results := v_results || jsonb_build_object('kpi_id', v_id, 'ok', false, 'error', v_err);
    end;
  end loop;

  insert into public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  values ('strata_kpis', null, 'RPC:bulk_update_kpis', auth.uid(),
          coalesce(nullif(btrim(p_reason), ''), 'bulk KPI owner/threshold reassignment'));

  return jsonb_build_object(
    'applied', (select count(*) from jsonb_array_elements(v_results) e where (e->>'ok')::boolean),
    'failed',  (select count(*) from jsonb_array_elements(v_results) e where not (e->>'ok')::boolean),
    'results', v_results
  );
end;
$function$;
