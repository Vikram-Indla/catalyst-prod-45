-- ═══════════════════════════════════════════════════════════════════════════
-- Consolidate Jira-synced activity into Catalyst-native tables
--
-- Before: Jira comments/changelog lived ONLY in jira_sync_* tables,
--         requiring CatalystActivitySection to merge 4 sources at read time.
-- After:  Jira comments/changelog also land in ph_comments/ph_activity_log,
--         so reads query a single source. jira_sync_* tables retained as cache.
--
-- Strategy:
--   1. Extend ph_comments + ph_activity_log with jira_* columns
--   2. Make author_id / user_id nullable (unmapped Jira users stay NULL)
--   3. Add UNIQUE index on jira_comment_id / jira_history_id for dedup
--   4. Backfill existing jira_sync_* rows into ph_* tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ph_comments: add jira_* columns ─────────────────────────────────────────
ALTER TABLE public.ph_comments ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.ph_comments ADD COLUMN IF NOT EXISTS jira_comment_id TEXT;
ALTER TABLE public.ph_comments ADD COLUMN IF NOT EXISTS jira_author_account_id TEXT;
ALTER TABLE public.ph_comments ADD COLUMN IF NOT EXISTS jira_author_display_name TEXT;
ALTER TABLE public.ph_comments ADD COLUMN IF NOT EXISTS jira_author_avatar_url TEXT;
ALTER TABLE public.ph_comments ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'catalyst';
ALTER TABLE public.ph_comments ADD COLUMN IF NOT EXISTS jira_created_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ph_comments_jira_comment_id
  ON public.ph_comments(jira_comment_id)
  WHERE jira_comment_id IS NOT NULL;

-- ── ph_activity_log: add jira_* columns ─────────────────────────────────────
ALTER TABLE public.ph_activity_log ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.ph_activity_log ADD COLUMN IF NOT EXISTS jira_history_id TEXT;
ALTER TABLE public.ph_activity_log ADD COLUMN IF NOT EXISTS jira_author_account_id TEXT;
ALTER TABLE public.ph_activity_log ADD COLUMN IF NOT EXISTS jira_author_display_name TEXT;
ALTER TABLE public.ph_activity_log ADD COLUMN IF NOT EXISTS jira_author_avatar_url TEXT;
ALTER TABLE public.ph_activity_log ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'catalyst';
ALTER TABLE public.ph_activity_log ADD COLUMN IF NOT EXISTS jira_created_at TIMESTAMPTZ;
ALTER TABLE public.ph_activity_log ADD COLUMN IF NOT EXISTS field_type TEXT;

-- jira_history_id + field_name + issue_key is unique in source, but we key by
-- (jira_history_id, field_name) globally since history_id is per-event and may
-- have multiple field changes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ph_activity_log_jira_history
  ON public.ph_activity_log(jira_history_id, field_name)
  WHERE jira_history_id IS NOT NULL;

-- ── Relax INSERT policies to allow Jira-sourced rows (author_id NULL) ──────
-- Service role already bypasses RLS, but update the policy text to reflect intent.
DROP POLICY IF EXISTS "Members can create comments" ON public.ph_comments;
CREATE POLICY "Members can create comments" ON public.ph_comments
  FOR INSERT WITH CHECK (
    (author_id = auth.uid()) OR (source = 'jira' AND auth.role() = 'service_role')
  );

DROP POLICY IF EXISTS "System inserts activity" ON public.ph_activity_log;
CREATE POLICY "System inserts activity" ON public.ph_activity_log
  FOR INSERT WITH CHECK (
    (user_id = auth.uid()) OR (source = 'jira' AND auth.role() = 'service_role')
  );

-- ── Backfill: jira_sync_comments → ph_comments ─────────────────────────────
INSERT INTO public.ph_comments (
  work_item_id,
  author_id,
  body,
  created_at,
  updated_at,
  source,
  jira_comment_id,
  jira_author_account_id,
  jira_author_display_name,
  jira_author_avatar_url,
  jira_created_at
)
SELECT
  i.id AS work_item_id,
  m.catalyst_profile_id AS author_id,
  jsc.body,
  COALESCE(jsc.jira_created_at, jsc.created_at) AS created_at,
  COALESCE(jsc.jira_updated_at, jsc.updated_at) AS updated_at,
  'jira' AS source,
  jsc.jira_comment_id,
  jsc.author_account_id,
  jsc.author_display_name,
  jsc.author_avatar_url,
  jsc.jira_created_at
FROM public.jira_sync_comments jsc
JOIN public.ph_issues i ON i.issue_key = jsc.issue_key
LEFT JOIN public.ph_user_mapping m
  ON m.jira_account_id = jsc.author_account_id
  AND m.is_mapped = true
WHERE jsc.jira_comment_id IS NOT NULL
ON CONFLICT (jira_comment_id) WHERE jira_comment_id IS NOT NULL DO UPDATE SET
  body = EXCLUDED.body,
  updated_at = EXCLUDED.updated_at,
  jira_author_display_name = EXCLUDED.jira_author_display_name,
  jira_author_avatar_url = EXCLUDED.jira_author_avatar_url;

-- ── Backfill: jira_sync_changelog → ph_activity_log ────────────────────────
INSERT INTO public.ph_activity_log (
  work_item_id,
  user_id,
  action,
  field_name,
  field_type,
  old_value,
  new_value,
  created_at,
  source,
  jira_history_id,
  jira_author_account_id,
  jira_author_display_name,
  jira_author_avatar_url,
  jira_created_at
)
SELECT
  i.id AS work_item_id,
  m.catalyst_profile_id AS user_id,
  'update' AS action,
  jsc.field_name,
  jsc.field_type,
  COALESCE(jsc.from_string, jsc.from_value) AS old_value,
  COALESCE(jsc.to_string, jsc.to_value) AS new_value,
  COALESCE(jsc.jira_created_at, jsc.created_at) AS created_at,
  'jira' AS source,
  jsc.jira_history_id,
  jsc.author_account_id,
  jsc.author_display_name,
  jsc.author_avatar_url,
  jsc.jira_created_at
FROM public.jira_sync_changelog jsc
JOIN public.ph_issues i ON i.issue_key = jsc.issue_key
LEFT JOIN public.ph_user_mapping m
  ON m.jira_account_id = jsc.author_account_id
  AND m.is_mapped = true
WHERE jsc.jira_history_id IS NOT NULL
ON CONFLICT (jira_history_id, field_name) WHERE jira_history_id IS NOT NULL DO UPDATE SET
  old_value = EXCLUDED.old_value,
  new_value = EXCLUDED.new_value,
  jira_author_display_name = EXCLUDED.jira_author_display_name,
  jira_author_avatar_url = EXCLUDED.jira_author_avatar_url;
