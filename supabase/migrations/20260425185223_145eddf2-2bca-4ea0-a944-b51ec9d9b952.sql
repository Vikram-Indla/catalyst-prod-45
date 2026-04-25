
-- ============================================================
-- 1. Soft-delete on catalyst_issues
-- ============================================================
ALTER TABLE public.catalyst_issues
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_catalyst_issues_not_deleted
  ON public.catalyst_issues (project_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 2. catalyst_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catalyst_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.catalyst_issues(id) ON DELETE CASCADE,
  body        text NOT NULL,
  body_adf    jsonb,
  author_id   uuid NOT NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catalyst_comments_work_item
  ON public.catalyst_comments(work_item_id, created_at);

ALTER TABLE public.catalyst_comments ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of the project that owns this issue?
CREATE OR REPLACE FUNCTION public.is_member_of_catalyst_issue(_issue_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.catalyst_issues ci
    JOIN public.ph_projects p   ON p.id = ci.project_id OR (p.key = split_part(ci.issue_key,'-',1))
    JOIN public.ph_project_members m ON m.project_id = p.id
    WHERE ci.id = _issue_id AND m.user_id = auth.uid()
  );
$$;

CREATE POLICY "catalyst_comments_select_members"
  ON public.catalyst_comments FOR SELECT TO authenticated
  USING (public.is_member_of_catalyst_issue(work_item_id));

CREATE POLICY "catalyst_comments_insert_members"
  ON public.catalyst_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_member_of_catalyst_issue(work_item_id));

CREATE POLICY "catalyst_comments_update_author"
  ON public.catalyst_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "catalyst_comments_delete_author"
  ON public.catalyst_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- ============================================================
-- 3. catalyst_attachments + storage bucket
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catalyst_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.catalyst_issues(id) ON DELETE CASCADE,
  uploaded_by  uuid NOT NULL DEFAULT auth.uid(),
  file_name    text NOT NULL,
  file_size    bigint NOT NULL,
  mime_type    text NOT NULL,
  storage_path text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catalyst_attachments_work_item
  ON public.catalyst_attachments(work_item_id, created_at DESC);

ALTER TABLE public.catalyst_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalyst_attachments_select_members"
  ON public.catalyst_attachments FOR SELECT TO authenticated
  USING (public.is_member_of_catalyst_issue(work_item_id));

CREATE POLICY "catalyst_attachments_insert_members"
  ON public.catalyst_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_member_of_catalyst_issue(work_item_id));

CREATE POLICY "catalyst_attachments_delete_uploader_or_admin"
  ON public.catalyst_attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.catalyst_issues ci
      JOIN public.ph_projects p ON p.id = ci.project_id
      JOIN public.ph_project_members m ON m.project_id = p.id
      WHERE ci.id = catalyst_attachments.work_item_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin','owner')
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('catalyst-attachments','catalyst-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "catalyst_attach_obj_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'catalyst-attachments'
    AND EXISTS (
      SELECT 1 FROM public.catalyst_attachments a
      WHERE a.storage_path = storage.objects.name
        AND public.is_member_of_catalyst_issue(a.work_item_id)
    )
  );

CREATE POLICY "catalyst_attach_obj_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalyst-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "catalyst_attach_obj_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'catalyst-attachments'
    AND EXISTS (
      SELECT 1 FROM public.catalyst_attachments a
      WHERE a.storage_path = storage.objects.name
        AND (a.uploaded_by = auth.uid()
             OR EXISTS (
               SELECT 1 FROM public.catalyst_issues ci
               JOIN public.ph_projects p ON p.id = ci.project_id
               JOIN public.ph_project_members m ON m.project_id = p.id
               WHERE ci.id = a.work_item_id AND m.user_id = auth.uid() AND m.role IN ('admin','owner')
             ))
    )
  );

-- ============================================================
-- 4. catalyst_activity_log + triggers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catalyst_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.catalyst_issues(id) ON DELETE CASCADE,
  action       text NOT NULL,                -- created | updated | comment_added | comment_edited | comment_deleted | deleted | restored
  field_name   text,
  old_value    text,
  new_value    text,
  user_id      uuid DEFAULT auth.uid(),
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catalyst_activity_work_item
  ON public.catalyst_activity_log(work_item_id, created_at DESC);

ALTER TABLE public.catalyst_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalyst_activity_select_members"
  ON public.catalyst_activity_log FOR SELECT TO authenticated
  USING (public.is_member_of_catalyst_issue(work_item_id));

-- Issue trigger: log INSERT + per-field UPDATE + soft delete
CREATE OR REPLACE FUNCTION public.tg_catalyst_issue_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  f text;
  fields text[] := ARRAY['title','description','status','priority','assignee_id','reporter_id','parent_id','story_points','sprint_name','release_id','tags','issue_type'];
  oldv text; newv text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.catalyst_activity_log(work_item_id, action, user_id)
    VALUES (NEW.id, 'created', COALESCE(auth.uid(), NEW.reporter_id));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- soft delete / restore
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      INSERT INTO public.catalyst_activity_log(work_item_id, action, user_id)
      VALUES (NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'restored' ELSE 'deleted' END, auth.uid());
    END IF;

    FOREACH f IN ARRAY fields LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f)
        INTO oldv, newv USING OLD, NEW;
      IF oldv IS DISTINCT FROM newv THEN
        INSERT INTO public.catalyst_activity_log(work_item_id, action, field_name, old_value, new_value, user_id)
        VALUES (NEW.id, 'updated', f, oldv, newv, auth.uid());
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS catalyst_issue_audit ON public.catalyst_issues;
CREATE TRIGGER catalyst_issue_audit
  AFTER INSERT OR UPDATE ON public.catalyst_issues
  FOR EACH ROW EXECUTE FUNCTION public.tg_catalyst_issue_audit();

-- Comment trigger: log adds/edits/deletes
CREATE OR REPLACE FUNCTION public.tg_catalyst_comment_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.catalyst_activity_log(work_item_id, action, user_id, metadata)
    VALUES (NEW.work_item_id, 'comment_added', NEW.author_id, jsonb_build_object('comment_id', NEW.id));
  ELSIF TG_OP = 'UPDATE' AND OLD.body IS DISTINCT FROM NEW.body THEN
    INSERT INTO public.catalyst_activity_log(work_item_id, action, user_id, metadata)
    VALUES (NEW.work_item_id, 'comment_edited', auth.uid(), jsonb_build_object('comment_id', NEW.id));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.catalyst_activity_log(work_item_id, action, user_id, metadata)
    VALUES (OLD.work_item_id, 'comment_deleted', auth.uid(), jsonb_build_object('comment_id', OLD.id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS catalyst_comment_audit ON public.catalyst_comments;
CREATE TRIGGER catalyst_comment_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.catalyst_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_catalyst_comment_audit();

-- updated_at maintenance for comments
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS catalyst_comments_touch_updated_at ON public.catalyst_comments;
CREATE TRIGGER catalyst_comments_touch_updated_at
  BEFORE UPDATE ON public.catalyst_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ============================================================
-- 5. ph_incidents.issue_key — link incidents to either source
-- ============================================================
ALTER TABLE public.ph_incidents
  ADD COLUMN IF NOT EXISTS issue_key text;
CREATE INDEX IF NOT EXISTS idx_ph_incidents_issue_key ON public.ph_incidents(issue_key);
