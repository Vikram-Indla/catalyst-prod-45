-- Add the Release Operations config tables to the supabase_realtime publication
-- so admin edits (rh_config_options / rh_config_settings) propagate live to
-- every open surface via the useReleaseConfigRealtime() subscription.
-- Idempotent: skip if a table is already a member of the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rh_config_options'
  ) then
    alter publication supabase_realtime add table public.rh_config_options;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rh_config_settings'
  ) then
    alter publication supabase_realtime add table public.rh_config_settings;
  end if;
end $$;
