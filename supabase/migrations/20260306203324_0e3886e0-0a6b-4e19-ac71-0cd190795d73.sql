CREATE TABLE IF NOT EXISTS public.ra_jira_tickets (
  id BIGSERIAL PRIMARY KEY,
  project_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  ticket_key TEXT NOT NULL UNIQUE,
  ticket_summary TEXT NOT NULL,
  ticket_type TEXT DEFAULT 'Story',
  has_pdf BOOLEAN DEFAULT false,
  pdf_filename TEXT,
  page_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ra_jira_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ra_jira_tickets"
  ON public.ra_jira_tickets FOR SELECT
  TO authenticated USING (true);