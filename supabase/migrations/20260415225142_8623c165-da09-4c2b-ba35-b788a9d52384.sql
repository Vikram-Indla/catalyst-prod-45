-- Board status mappings: maps workflow statuses to board columns
CREATE TABLE public.board_status_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  status_id uuid NOT NULL REFERENCES public.catalyst_workflow_statuses(id) ON DELETE CASCADE,
  status_name text NOT NULL,
  bucket_type text NOT NULL DEFAULT 'unmapped' CHECK (bucket_type IN ('column', 'backlog', 'unmapped')),
  column_id uuid REFERENCES public.board_columns(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, status_id)
);

-- Enable RLS
ALTER TABLE public.board_status_mappings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view board status mappings"
  ON public.board_status_mappings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert board status mappings"
  ON public.board_status_mappings FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update board status mappings"
  ON public.board_status_mappings FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete board status mappings"
  ON public.board_status_mappings FOR DELETE
  TO authenticated USING (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_board_status_mappings_updated_at
  BEFORE UPDATE ON public.board_status_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();