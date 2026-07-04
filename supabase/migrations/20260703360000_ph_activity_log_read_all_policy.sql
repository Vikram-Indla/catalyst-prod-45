-- CAT-KANBAN-FLAG-COMMENT-20260703-001
-- History tab was empty because the sole SELECT policy on ph_activity_log
-- checks membership via ph_work_items → ph_project_members, but every real
-- work item (including Jira-synced BAU issues) lives in ph_issues, so the
-- predicate resolves to false and every row is filtered out.
-- ph_comments already carries a permissive wh_read_all counterpart which
-- keeps comments visible. Mirror that here so history rows are visible to
-- authenticated readers on the same terms as comments.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ph_activity_log' and policyname='wh_read_all'
  ) then
    create policy "wh_read_all" on public.ph_activity_log
      for select using (true);
  end if;
end$$;
