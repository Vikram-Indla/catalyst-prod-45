-- Recreate ph_designs — the table went missing from the remote schema
-- (PGRST205 on any select/insert). Same shape as the original
-- 20260607180000_create_ph_designs migration.
create table if not exists public.ph_designs (
  id            uuid primary key default gen_random_uuid(),
  work_item_id  uuid not null,
  url           text not null check (length(url) > 0 and length(url) <= 2048),
  created_by    uuid null references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_ph_designs_work_item_id
  on public.ph_designs (work_item_id, created_at desc);

alter table public.ph_designs enable row level security;

drop policy if exists ph_designs_select on public.ph_designs;
create policy ph_designs_select on public.ph_designs
  for select to authenticated using (true);

drop policy if exists ph_designs_insert on public.ph_designs;
create policy ph_designs_insert on public.ph_designs
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists ph_designs_delete on public.ph_designs;
create policy ph_designs_delete on public.ph_designs
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'::public.app_role
    )
  );

drop policy if exists ph_designs_update on public.ph_designs;
create policy ph_designs_update on public.ph_designs
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Realtime — useDesigns subscribes to postgres_changes on this table.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='ph_designs'
  ) then
    alter publication supabase_realtime add table public.ph_designs;
  end if;
end $$;

comment on table public.ph_designs is
  'Figma URL attachments rendered by the Designs section in every CatalystView* detail view.';
