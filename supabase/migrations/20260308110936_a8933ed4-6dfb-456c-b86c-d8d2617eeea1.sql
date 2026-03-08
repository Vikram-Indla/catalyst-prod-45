
-- Board tables parity migration (fully idempotent)
-- Creates board tables + RLS only if they don't exist

-- Functions (CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION public.board_not_deleted(_board_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM boards WHERE id = _board_id AND deleted_at IS NULL); $$;

CREATE OR REPLACE FUNCTION public.can_view_board(_board_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (
    SELECT 1 FROM boards b WHERE b.id = _board_id AND b.deleted_at IS NULL
      AND (b.visibility = 'global' OR (b.visibility = 'private' AND b.created_by = _user_id)
        OR (b.project_id IS NOT NULL AND b.visibility <> 'private' AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = b.project_id AND pm.user_id = _user_id))
        OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = _user_id))
  ); $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text,
  icon text DEFAULT '📋', color text DEFAULT '#2563EB', project_id uuid,
  is_personal boolean NOT NULL DEFAULT false, visibility text NOT NULL DEFAULT 'project',
  filter_project_ids uuid[] NOT NULL DEFAULT '{}', filter_config jsonb NOT NULL DEFAULT '{}',
  board_type text NOT NULL DEFAULT 'kanban', swimlane_type text NOT NULL DEFAULT 'none',
  show_swimlanes boolean NOT NULL DEFAULT true, is_starred boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0, last_viewed_at timestamptz,
  created_by uuid NOT NULL, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, jira_board_id text, jira_project_key text,
  last_jira_sync timestamptz, jira_sync_enabled boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), board_id uuid NOT NULL,
  name text NOT NULL, position integer NOT NULL, color text,
  status_ids uuid[] NOT NULL DEFAULT '{}', is_backlog boolean NOT NULL DEFAULT false,
  is_done boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), jira_mapped boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.board_issue_rank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), board_id uuid NOT NULL,
  work_item_id uuid NOT NULL, rank_value text NOT NULL, column_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), board_id uuid NOT NULL,
  user_id uuid NOT NULL, role text NOT NULL DEFAULT 'viewer',
  is_starred boolean NOT NULL DEFAULT false, last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_quick_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), board_id uuid NOT NULL,
  name text NOT NULL, filter_type text NOT NULL,
  filter_value jsonb NOT NULL DEFAULT '{}', is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);

-- Constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='boards_jira_board_id_key') THEN ALTER TABLE public.boards ADD CONSTRAINT boards_jira_board_id_key UNIQUE (jira_board_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_columns_board_id_position_key') THEN ALTER TABLE public.board_columns ADD CONSTRAINT board_columns_board_id_position_key UNIQUE (board_id, position); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_columns_board_id_name_key') THEN ALTER TABLE public.board_columns ADD CONSTRAINT board_columns_board_id_name_key UNIQUE (board_id, name); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_issue_rank_board_id_work_item_id_key') THEN ALTER TABLE public.board_issue_rank ADD CONSTRAINT board_issue_rank_board_id_work_item_id_key UNIQUE (board_id, work_item_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_members_board_id_user_id_key') THEN ALTER TABLE public.board_members ADD CONSTRAINT board_members_board_id_user_id_key UNIQUE (board_id, user_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='boards_project_id_fkey') THEN ALTER TABLE public.boards ADD CONSTRAINT boards_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_columns_board_id_fkey') THEN ALTER TABLE public.board_columns ADD CONSTRAINT board_columns_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_issue_rank_board_id_fkey') THEN ALTER TABLE public.board_issue_rank ADD CONSTRAINT board_issue_rank_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_issue_rank_column_id_fkey') THEN ALTER TABLE public.board_issue_rank ADD CONSTRAINT board_issue_rank_column_id_fkey FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE SET NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_members_board_id_fkey') THEN ALTER TABLE public.board_members ADD CONSTRAINT board_members_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='board_quick_filters_board_id_fkey') THEN ALTER TABLE public.board_quick_filters ADD CONSTRAINT board_quick_filters_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE; END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boards_project_id ON public.boards (project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boards_created_by ON public.boards (created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boards_jira_id ON public.boards (jira_board_id) WHERE jira_board_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_board_columns_board ON public.board_columns (board_id, position);
CREATE INDEX IF NOT EXISTS idx_issue_rank_board ON public.board_issue_rank (board_id, rank_value);
CREATE INDEX IF NOT EXISTS idx_board_members_user ON public.board_members (user_id);

-- RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_issue_rank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_quick_filters ENABLE ROW LEVEL SECURITY;

-- Policies (drop if exist, then create)
DROP POLICY IF EXISTS boards_select ON public.boards;
DROP POLICY IF EXISTS boards_insert ON public.boards;
DROP POLICY IF EXISTS boards_update ON public.boards;
CREATE POLICY boards_select ON public.boards FOR SELECT TO authenticated USING (can_view_board(id, auth.uid()));
CREATE POLICY boards_insert ON public.boards FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY boards_update ON public.boards FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = boards.id AND bm.user_id = auth.uid() AND bm.role = 'admin'));

DROP POLICY IF EXISTS board_columns_select ON public.board_columns;
DROP POLICY IF EXISTS board_columns_insert ON public.board_columns;
DROP POLICY IF EXISTS board_columns_update ON public.board_columns;
DROP POLICY IF EXISTS board_columns_delete ON public.board_columns;
CREATE POLICY board_columns_select ON public.board_columns FOR SELECT TO authenticated USING (board_not_deleted(board_id));
CREATE POLICY board_columns_insert ON public.board_columns FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_columns.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role = ANY (ARRAY['admin','editor'])))));
CREATE POLICY board_columns_update ON public.board_columns FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_columns.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role = ANY (ARRAY['admin','editor'])))));
CREATE POLICY board_columns_delete ON public.board_columns FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_columns.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role = 'admin'))));

DROP POLICY IF EXISTS issue_rank_select ON public.board_issue_rank;
DROP POLICY IF EXISTS issue_rank_insert ON public.board_issue_rank;
DROP POLICY IF EXISTS issue_rank_update ON public.board_issue_rank;
DROP POLICY IF EXISTS issue_rank_delete ON public.board_issue_rank;
CREATE POLICY issue_rank_select ON public.board_issue_rank FOR SELECT TO authenticated USING (board_not_deleted(board_id));
CREATE POLICY issue_rank_insert ON public.board_issue_rank FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_issue_rank.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid()))));
CREATE POLICY issue_rank_update ON public.board_issue_rank FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_issue_rank.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid()))));
CREATE POLICY issue_rank_delete ON public.board_issue_rank FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_issue_rank.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid()))));

DROP POLICY IF EXISTS board_members_select ON public.board_members;
DROP POLICY IF EXISTS board_members_insert ON public.board_members;
DROP POLICY IF EXISTS board_members_update ON public.board_members;
DROP POLICY IF EXISTS board_members_delete ON public.board_members;
CREATE POLICY board_members_select ON public.board_members FOR SELECT TO authenticated USING (board_not_deleted(board_id));
CREATE POLICY board_members_insert ON public.board_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_members.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role = 'admin'))));
CREATE POLICY board_members_update ON public.board_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_members.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role = 'admin'))));
CREATE POLICY board_members_delete ON public.board_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_members.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role = 'admin'))));

DROP POLICY IF EXISTS board_quick_filters_select ON public.board_quick_filters;
DROP POLICY IF EXISTS board_quick_filters_insert ON public.board_quick_filters;
CREATE POLICY board_quick_filters_select ON public.board_quick_filters FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_quick_filters.board_id AND b.deleted_at IS NULL));
CREATE POLICY board_quick_filters_insert ON public.board_quick_filters FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_quick_filters.board_id AND (b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role = ANY (ARRAY['admin','editor'])))));
