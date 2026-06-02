-- Board Settings: Jira parity columns
-- Adds fields required by the rewritten full-page board settings UI.

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS sub_filter_query        text,
  ADD COLUMN IF NOT EXISTS completed_issues_cutoff text    DEFAULT '-2w',
  ADD COLUMN IF NOT EXISTS working_days_config     jsonb   NOT NULL DEFAULT '{"region":"System default","timezone":"","workdays":[true,true,true,true,true,false,false],"nonWorkingDates":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline_enabled        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timeline_include_children boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_extra_fields       jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS days_in_column_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kanban_backlog_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS epic_display_mode       text    NOT NULL DEFAULT 'board',
  ADD COLUMN IF NOT EXISTS column_constraint_type  text    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS swimlane_jql            text;

ALTER TABLE public.board_columns
  ADD COLUMN IF NOT EXISTS constraint_min integer,
  ADD COLUMN IF NOT EXISTS constraint_max integer;

-- Add description + jql_query to quick filters to match Jira's Name/JQL/Description table
ALTER TABLE public.board_quick_filters
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS jql_query   text;

-- Populate jql_query from existing filter_value.jql (back-fill)
UPDATE public.board_quick_filters
SET jql_query = filter_value->>'jql'
WHERE jql_query IS NULL AND filter_value ? 'jql';

-- CHECK constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boards_epic_display_mode_check') THEN
    ALTER TABLE public.boards ADD CONSTRAINT boards_epic_display_mode_check
      CHECK (epic_display_mode IN ('board', 'panel'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boards_column_constraint_type_check') THEN
    ALTER TABLE public.boards ADD CONSTRAINT boards_column_constraint_type_check
      CHECK (column_constraint_type IN ('none', 'issue_count'));
  END IF;
END $$;
