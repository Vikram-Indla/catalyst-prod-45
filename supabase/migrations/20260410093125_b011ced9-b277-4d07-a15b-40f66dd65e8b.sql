
-- ═══════════════════════════════════════════
-- WATCHING SYSTEM
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.issue_watchers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id      UUID NOT NULL REFERENCES public.catalyst_issues(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watched_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(issue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_watchers_issue ON public.issue_watchers(issue_id);
CREATE INDEX IF NOT EXISTS idx_watchers_user  ON public.issue_watchers(user_id);

-- Watching activity feed
CREATE TABLE IF NOT EXISTS public.watch_activity (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id      UUID NOT NULL REFERENCES public.catalyst_issues(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  comment_body  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wact_issue   ON public.watch_activity(issue_id);
CREATE INDEX IF NOT EXISTS idx_wact_created ON public.watch_activity(created_at DESC);

-- Trigger: generate watch_activity on catalyst_issues UPDATE
CREATE OR REPLACE FUNCTION public.fn_track_issue_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.watch_activity(issue_id, actor_id, activity_type, old_value, new_value)
    VALUES(NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
  END IF;

  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.watch_activity(issue_id, actor_id, activity_type, old_value, new_value)
    VALUES(NEW.id, auth.uid(), 'assignee_changed', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.watch_activity(issue_id, actor_id, activity_type, old_value, new_value)
    VALUES(NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_issue_changes ON public.catalyst_issues;
CREATE TRIGGER trg_track_issue_changes
  AFTER UPDATE ON public.catalyst_issues
  FOR EACH ROW EXECUTE FUNCTION public.fn_track_issue_changes();

-- Notifications fan-out to all watchers on each watch_activity INSERT
CREATE OR REPLACE FUNCTION public.fn_notify_watchers()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_issue_key TEXT;
  v_issue_title TEXT;
BEGIN
  -- Resolve issue details for notification
  SELECT issue_key, title INTO v_issue_key, v_issue_title
  FROM public.catalyst_issues WHERE id = NEW.issue_id;

  INSERT INTO public.notifications(
    recipient_user_id, notification_type, entity_id, entity_key,
    entity_title, entity_type, entity_icon_type, hub_source,
    actor_user_id, status_type, tab, metadata
  )
  SELECT
    iw.user_id,
    CASE NEW.activity_type
      WHEN 'status_changed'   THEN 'status_changed'
      WHEN 'comment_added'    THEN 'commented_on_work_item'
      WHEN 'assignee_changed' THEN 'assigned_to_work_item'
      WHEN 'priority_changed' THEN 'status_changed'
      ELSE 'status_changed'
    END,
    NEW.issue_id::TEXT,
    COALESCE(v_issue_key, ''),
    COALESCE(v_issue_title, ''),
    'issue',
    'story',
    'ProjectHub',
    NEW.actor_id,
    'info',
    'direct',
    jsonb_build_object(
      'activity_type', NEW.activity_type,
      'old_value', NEW.old_value,
      'new_value', NEW.new_value,
      'source', 'watching'
    )
  FROM public.issue_watchers iw
  WHERE iw.issue_id = NEW.issue_id
    AND iw.user_id != COALESCE(NEW.actor_id, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_watchers ON public.watch_activity;
CREATE TRIGGER trg_notify_watchers
  AFTER INSERT ON public.watch_activity
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_watchers();

-- RLS for issue_watchers
ALTER TABLE public.issue_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_watches"
  ON public.issue_watchers FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS for watch_activity
ALTER TABLE public.watch_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchers_see_activity"
  ON public.watch_activity FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.issue_watchers
    WHERE issue_watchers.issue_id = watch_activity.issue_id
      AND issue_watchers.user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════
-- GOVERNANCE / AI CLEANUP
-- ═══════════════════════════════════════════

ALTER TABLE public.catalyst_issues
  ADD COLUMN IF NOT EXISTS closure_method      TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS force_closed_by     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS force_closed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS force_close_reason  TEXT,
  ADD COLUMN IF NOT EXISTS restore_deadline    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS governance_category INT;

CREATE TABLE IF NOT EXISTS public.governance_score (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id),
  scan_date           DATE NOT NULL,
  stale_count         INT  DEFAULT 0,
  breach_streak_days  INT  DEFAULT 0,
  rag_status          TEXT DEFAULT 'green',
  score_pct           INT  DEFAULT 100,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scan_date)
);

ALTER TABLE public.governance_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_governance_score"
  ON public.governance_score FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "own_governance_score_insert"
  ON public.governance_score FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.governance_closure_log (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key            TEXT NOT NULL,
  issue_id            UUID REFERENCES public.catalyst_issues(id),
  closed_by           UUID REFERENCES auth.users(id),
  closed_at           TIMESTAMPTZ DEFAULT now(),
  governance_category INT,
  stale_days          INT,
  reporter_notified   BOOLEAN DEFAULT false,
  restore_deadline    TIMESTAMPTZ,
  restored_at         TIMESTAMPTZ,
  restored_by         UUID REFERENCES auth.users(id),
  closure_reason      TEXT,
  metadata            JSONB
);

ALTER TABLE public.governance_closure_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_closure_log"
  ON public.governance_closure_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_closure_log"
  ON public.governance_closure_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
