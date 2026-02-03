-- ═══════════════════════════════════════════════════════════════════════════
-- TASK¹⁰ DATABASE LAYER - PROMPT 1
-- Tables: t10_lists, t10_weeks, t10_items, t10_activity, t10_ai_suggestions
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 1: t10_lists
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.t10_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_key VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_t10_lists_created_by ON public.t10_lists(created_by);
CREATE INDEX idx_t10_lists_status ON public.t10_lists(status);

-- Sequence for auto-generating list keys (T10-001, T10-002, etc.)
CREATE SEQUENCE IF NOT EXISTS t10_list_key_seq START 1;

-- Function to generate list_key
CREATE OR REPLACE FUNCTION generate_t10_list_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.list_key IS NULL OR NEW.list_key = '' THEN
    NEW.list_key := 'T10-' || LPAD(nextval('t10_list_key_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_t10_list_key
  BEFORE INSERT ON public.t10_lists
  FOR EACH ROW
  EXECUTE FUNCTION generate_t10_list_key();

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 2: t10_weeks
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.t10_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.t10_lists(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  is_checked_out BOOLEAN NOT NULL DEFAULT false,
  checked_out_by UUID REFERENCES public.profiles(id),
  checked_out_at TIMESTAMPTZ,
  closed_count INTEGER NOT NULL DEFAULT 0,
  carried_count INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, week_start_date)
);

CREATE INDEX idx_t10_weeks_list_id ON public.t10_weeks(list_id);
CREATE INDEX idx_t10_weeks_week_start ON public.t10_weeks(week_start_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 3: t10_items
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.t10_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES public.t10_weeks(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 20),
  title VARCHAR(500) NOT NULL,
  taskhub_key VARCHAR(20),
  assignee_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  label VARCHAR(50),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done', 'resolved', 'removed')),
  carryover_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_t10_items_week_id ON public.t10_items(week_id);
CREATE INDEX idx_t10_items_assignee ON public.t10_items(assignee_id);
CREATE INDEX idx_t10_items_status ON public.t10_items(status);
CREATE INDEX idx_t10_items_rank ON public.t10_items(week_id, rank);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 4: t10_activity
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.t10_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.t10_items(id) ON DELETE CASCADE,
  activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN (
    'created', 'completed', 'reopened', 'rank_changed', 
    'assigned', 'unassigned', 'title_updated', 'due_date_changed',
    'label_changed', 'description_updated', 'carried_over', 'removed', 'resolved'
  )),
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_t10_activity_item_id ON public.t10_activity(item_id);
CREATE INDEX idx_t10_activity_performed_at ON public.t10_activity(performed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 5: t10_ai_suggestions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.t10_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.t10_lists(id) ON DELETE CASCADE,
  taskhub_key VARCHAR(20),
  title VARCHAR(500) NOT NULL,
  assignee_id UUID REFERENCES public.profiles(id),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  due_date DATE,
  is_added BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_t10_ai_suggestions_list_id ON public.t10_ai_suggestions(list_id);
CREATE INDEX idx_t10_ai_suggestions_is_added ON public.t10_ai_suggestions(is_added);

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_t10_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_t10_lists_updated_at
  BEFORE UPDATE ON public.t10_lists
  FOR EACH ROW EXECUTE FUNCTION update_t10_updated_at();

CREATE TRIGGER trigger_t10_weeks_updated_at
  BEFORE UPDATE ON public.t10_weeks
  FOR EACH ROW EXECUTE FUNCTION update_t10_updated_at();

CREATE TRIGGER trigger_t10_items_updated_at
  BEFORE UPDATE ON public.t10_items
  FOR EACH ROW EXECUTE FUNCTION update_t10_updated_at();

CREATE TRIGGER trigger_t10_ai_suggestions_updated_at
  BEFORE UPDATE ON public.t10_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_t10_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.t10_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t10_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t10_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t10_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t10_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- t10_lists policies (authenticated users can view/create, creators can modify)
CREATE POLICY "Authenticated users can view lists"
  ON public.t10_lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create lists"
  ON public.t10_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their lists"
  ON public.t10_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their lists"
  ON public.t10_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- t10_weeks policies (accessible via list access)
CREATE POLICY "Authenticated users can view weeks"
  ON public.t10_weeks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_lists WHERE id = t10_weeks.list_id
  ));

CREATE POLICY "Authenticated users can create weeks"
  ON public.t10_weeks FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.t10_lists WHERE id = t10_weeks.list_id
  ));

CREATE POLICY "Authenticated users can update weeks"
  ON public.t10_weeks FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_lists WHERE id = t10_weeks.list_id
  ));

-- t10_items policies (accessible via week/list access)
CREATE POLICY "Authenticated users can view items"
  ON public.t10_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_weeks w
    JOIN public.t10_lists l ON w.list_id = l.id
    WHERE w.id = t10_items.week_id
  ));

CREATE POLICY "Authenticated users can create items"
  ON public.t10_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.t10_weeks w
    JOIN public.t10_lists l ON w.list_id = l.id
    WHERE w.id = t10_items.week_id
  ));

CREATE POLICY "Authenticated users can update items"
  ON public.t10_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_weeks w
    JOIN public.t10_lists l ON w.list_id = l.id
    WHERE w.id = t10_items.week_id
  ));

CREATE POLICY "Authenticated users can delete items"
  ON public.t10_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_weeks w
    JOIN public.t10_lists l ON w.list_id = l.id
    WHERE w.id = t10_items.week_id
  ));

-- t10_activity policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view activity"
  ON public.t10_activity FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_items i
    JOIN public.t10_weeks w ON i.week_id = w.id
    JOIN public.t10_lists l ON w.list_id = l.id
    WHERE i.id = t10_activity.item_id
  ));

CREATE POLICY "Authenticated users can create activity"
  ON public.t10_activity FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.t10_items i
    JOIN public.t10_weeks w ON i.week_id = w.id
    JOIN public.t10_lists l ON w.list_id = l.id
    WHERE i.id = t10_activity.item_id
  ));

-- t10_ai_suggestions policies
CREATE POLICY "Authenticated users can view suggestions"
  ON public.t10_ai_suggestions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_lists WHERE id = t10_ai_suggestions.list_id
  ));

CREATE POLICY "Authenticated users can update suggestions"
  ON public.t10_ai_suggestions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t10_lists WHERE id = t10_ai_suggestions.list_id
  ));

CREATE POLICY "Authenticated users can create suggestions"
  ON public.t10_ai_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.t10_lists WHERE id = t10_ai_suggestions.list_id
  ));