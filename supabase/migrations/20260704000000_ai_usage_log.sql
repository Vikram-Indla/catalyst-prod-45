-- P2-S9 (AI-003): repo-wide logGovernance() helper in 11 AI edge functions
-- insert into ai_governance_audit_log with columns (payload/status/error_message/source)
-- that don't exist on that table (id/actor_id/contract_id/action/object_type/object_id/diff,
-- FK'd to ai_contracts — a contract-approval concept, not a call log). Every insert has
-- been silently failing since launch (table has 0 rows), swallowed by a catch-all.
-- ai_governance_audit_log is the wrong table for these features; this is the right one.
create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  action text not null,
  status text not null check (status in ('ok', 'error')),
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_log_source on ai_usage_log (source, created_at desc);

alter table ai_usage_log enable row level security;

-- service-role only (edge functions write with the service key; no direct client access)
create policy "service role full access" on ai_usage_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
