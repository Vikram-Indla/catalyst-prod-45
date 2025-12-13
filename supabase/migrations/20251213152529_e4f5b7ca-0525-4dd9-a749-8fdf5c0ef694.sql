-- Create kanban_board_settings table for storing Kanban configuration
CREATE TABLE public.kanban_board_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'product', -- 'product', 'program', 'project', 'team'
  scope_id UUID, -- NULL for global/default settings
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create unique constraint for scope + scope_id combination
CREATE UNIQUE INDEX kanban_board_settings_scope_idx ON public.kanban_board_settings(scope, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Enable RLS
ALTER TABLE public.kanban_board_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - approved users can read, admins can write
CREATE POLICY "Approved users can view kanban settings"
  ON public.kanban_board_settings
  FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage kanban settings"
  ON public.kanban_board_settings
  FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_kanban_board_settings_updated_at
  BEFORE UPDATE ON public.kanban_board_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default product kanban settings
INSERT INTO public.kanban_board_settings (scope, scope_id, settings_json) VALUES (
  'product',
  NULL,
  '{
    "columns": [
      {"id": "col_new", "name": "New Request", "color": "#9ca3af", "category": "todo", "statuses": ["NEW_REQUEST", "NEW_DEMAND"], "wipLimit": null, "sortOrder": 0},
      {"id": "col_analyse", "name": "Analyse", "color": "#3b82f6", "category": "in_progress", "statuses": ["IN_REVIEW", "ANALYSE"], "wipLimit": null, "sortOrder": 1},
      {"id": "col_approved", "name": "Approved", "color": "#22c55e", "category": "in_progress", "statuses": ["APPROVED"], "wipLimit": null, "sortOrder": 2},
      {"id": "col_ready", "name": "Ready to Implement", "color": "#8b5cf6", "category": "in_progress", "statuses": ["READY_TO_IMPLEMENT"], "wipLimit": null, "sortOrder": 3},
      {"id": "col_implement", "name": "Implement", "color": "#f59e0b", "category": "in_progress", "statuses": ["IMPLEMENT"], "wipLimit": null, "sortOrder": 4},
      {"id": "col_closed", "name": "Closed", "color": "#10b981", "category": "done", "statuses": ["CLOSED"], "wipLimit": null, "sortOrder": 5},
      {"id": "col_rejected", "name": "Rejected", "color": "#ef4444", "category": "done", "statuses": ["REJECTED"], "wipLimit": null, "sortOrder": 6},
      {"id": "col_onhold", "name": "On-Hold", "color": "#6b7280", "category": "blocked", "statuses": ["ON_HOLD"], "wipLimit": null, "sortOrder": 7}
    ],
    "swimlaneConfig": {
      "method": "none",
      "queries": []
    },
    "quickFilters": [
      {"id": "qf_my_items", "name": "My Items", "query": "assignee:me", "enabled": true, "sortOrder": 0},
      {"id": "qf_high_priority", "name": "High Priority", "query": "priority:high", "enabled": true, "sortOrder": 1},
      {"id": "qf_overdue", "name": "Overdue", "query": "due:<today", "enabled": true, "sortOrder": 2}
    ],
    "cardLayout": {
      "visibleFields": ["priority", "assignee", "due_date", "score"]
    },
    "cardColors": {
      "method": "priority",
      "priorityColors": {
        "critical": "#ef4444",
        "high": "#f97316",
        "medium": "#eab308",
        "low": "#22c55e"
      }
    }
  }'::jsonb
);