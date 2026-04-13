
-- ══════════════════════════════════════════════════════════════
-- ProjectHub List/AllWork — ph_list_items + ph_list_comments
-- ══════════════════════════════════════════════════════════════

-- 1. Main work items table
CREATE TABLE IF NOT EXISTS public.ph_list_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id         UUID REFERENCES public.ph_list_items(id) ON DELETE SET NULL,
  parent_key        TEXT,
  jira_key          TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('epic', 'story', 'bug', 'task', 'subtask', 'feature', 'improvement')),
  summary           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'backlog',
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('highest', 'high', 'medium', 'low', 'lowest')),
  assignee_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fix_version       TEXT,
  comments_count    INTEGER NOT NULL DEFAULT 0,
  description       TEXT,
  jira_sync_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ph_list_items_project_id  ON public.ph_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_ph_list_items_parent_id   ON public.ph_list_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_ph_list_items_type        ON public.ph_list_items(type);
CREATE INDEX IF NOT EXISTS idx_ph_list_items_status      ON public.ph_list_items(status);
CREATE INDEX IF NOT EXISTS idx_ph_list_items_assignee    ON public.ph_list_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_ph_list_items_jira_key    ON public.ph_list_items(jira_key);
CREATE INDEX IF NOT EXISTS idx_ph_list_items_created     ON public.ph_list_items(created_at DESC);

-- 2. Comments table
CREATE TABLE IF NOT EXISTS public.ph_list_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id    UUID NOT NULL REFERENCES public.ph_list_items(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_list_comments_item ON public.ph_list_comments(work_item_id);

-- 3. Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ph_list_items_updated_at ON public.ph_list_items;
CREATE TRIGGER set_ph_list_items_updated_at
  BEFORE UPDATE ON public.ph_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_ph_list_comments_updated_at ON public.ph_list_comments;
CREATE TRIGGER set_ph_list_comments_updated_at
  BEFORE UPDATE ON public.ph_list_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Comments count trigger
CREATE OR REPLACE FUNCTION public.update_ph_list_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ph_list_items SET comments_count = comments_count + 1 WHERE id = NEW.work_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ph_list_items SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.work_item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ph_list_comments_count ON public.ph_list_comments;
CREATE TRIGGER trigger_ph_list_comments_count
  AFTER INSERT OR DELETE ON public.ph_list_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_ph_list_comments_count();

-- 5. Aggregation view
CREATE OR REPLACE VIEW public.v_project_epics AS
SELECT
  wi.*,
  COUNT(children.id)                                                   AS total_children,
  COUNT(children.id) FILTER (WHERE children.status = 'done')          AS done_children,
  COUNT(children.id) FILTER (WHERE children.status IN ('in_progress', 'in_dev', 'in_qa', 'in_uat', 'in_production', 'ready_for_qa')) AS inprog_children,
  CASE
    WHEN COUNT(children.id) = 0 THEN 0
    ELSE ROUND((COUNT(children.id) FILTER (WHERE children.status = 'done'))::NUMERIC / COUNT(children.id) * 100)
  END AS pct_done
FROM public.ph_list_items wi
LEFT JOIN public.ph_list_items children ON children.parent_id = wi.id
WHERE wi.type = 'epic'
GROUP BY wi.id;

-- 6. RLS
ALTER TABLE public.ph_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_list_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_list_items_select" ON public.ph_list_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_list_items_insert" ON public.ph_list_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ph_list_items_update" ON public.ph_list_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ph_list_items_delete" ON public.ph_list_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "ph_list_comments_select" ON public.ph_list_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_list_comments_insert" ON public.ph_list_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ph_list_comments_update" ON public.ph_list_comments FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "ph_list_comments_delete" ON public.ph_list_comments FOR DELETE TO authenticated USING (author_id = auth.uid());

-- 7. Seed data for Senaei BAU project
DO $$
DECLARE
  proj_id UUID := '92977543-5aa4-484c-9b8d-36f1bb615b4f';
  epic1   UUID := gen_random_uuid();
  epic2   UUID := gen_random_uuid();
  epic3   UUID := gen_random_uuid();
  epic4   UUID := gen_random_uuid();
  epic5   UUID := gen_random_uuid();
BEGIN
-- Epics
INSERT INTO public.ph_list_items (id, project_id, jira_key, type, summary, status, priority, comments_count)
VALUES
  (epic1, proj_id, 'BAU-101', 'epic', 'Industrial Licensing Platform',        'in_progress', 'high',    0),
  (epic2, proj_id, 'BAU-102', 'epic', 'Mobile App — Senaei Revamp',            'in_progress', 'highest', 1),
  (epic3, proj_id, 'BAU-103', 'epic', 'Chemical Permits Digital Workflow',     'backlog',     'medium',  0),
  (epic4, proj_id, 'BAU-104', 'epic', 'Factory Screen Modernisation',          'done',        'medium',  2),
  (epic5, proj_id, 'BAU-105', 'epic', 'Investor Relations Portal',             'backlog',     'low',     0),
  (gen_random_uuid(), proj_id, 'BAU-106', 'epic', 'Certificate Management — National',  'in_progress', 'high',   1),
  (gen_random_uuid(), proj_id, 'BAU-107', 'epic', 'Senaei Onboarding Experience',       'backlog',     'medium', 0),
  (gen_random_uuid(), proj_id, 'BAU-108', 'epic', 'DGA Compliance Dashboard',           'done',        'high',   0),
  (gen_random_uuid(), proj_id, 'BAU-109', 'epic', 'Technical Foundation — API Layer',   'in_progress', 'highest',3),
  (gen_random_uuid(), proj_id, 'BAU-110', 'epic', 'Know Your Journey — Citizen Path',   'done',        'medium', 0);

-- Stories under epic1
INSERT INTO public.ph_list_items (project_id, parent_id, parent_key, jira_key, type, summary, status, priority)
VALUES
  (proj_id, epic1, 'BAU-101', 'BAU-201', 'story', 'License application form — Arabic RTL',        'done',       'high'),
  (proj_id, epic1, 'BAU-101', 'BAU-202', 'story', 'License renewal workflow',                     'in_progress','high'),
  (proj_id, epic1, 'BAU-101', 'BAU-203', 'story', 'Inspector dashboard — real-time status',       'in_progress','medium'),
  (proj_id, epic1, 'BAU-101', 'BAU-204', 'story', 'Approval notifications — SMS + email',         'backlog',    'low');

-- Bugs under epic1
INSERT INTO public.ph_list_items (project_id, parent_id, parent_key, jira_key, type, summary, status, priority)
VALUES
  (proj_id, epic1, 'BAU-101', 'BAU-301', 'bug', 'License status not updating after approval',     'ready_for_qa', 'high'),
  (proj_id, epic1, 'BAU-101', 'BAU-302', 'bug', 'Pagination breaks on Arabic characters in key', 'in_progress',  'medium');

-- Stories under epic2
INSERT INTO public.ph_list_items (project_id, parent_id, parent_key, jira_key, type, summary, status, priority)
VALUES
  (proj_id, epic2, 'BAU-102', 'BAU-205', 'story', 'Login screen — biometric auth',                'done',       'highest'),
  (proj_id, epic2, 'BAU-102', 'BAU-206', 'story', 'Push notifications — permit reminders',        'in_progress','high'),
  (proj_id, epic2, 'BAU-102', 'BAU-207', 'story', 'Offline mode — cached permit view',            'backlog',    'medium');
END $$;
