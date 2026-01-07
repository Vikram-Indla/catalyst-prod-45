-- AI Assist Drafts table
CREATE TABLE public.ai_assist_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en', 'mixed')),
  dir TEXT NOT NULL DEFAULT 'rtl' CHECK (dir IN ('rtl', 'ltr')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'review', 'approved', 'published', 'archived')),
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 8),
  step_data JSONB DEFAULT '{}',
  prompt_pack_version TEXT,
  sources_pack_version TEXT,
  compliance_verdict TEXT CHECK (compliance_verdict IN ('pass', 'fail', 'pending', 'na')),
  quality_score NUMERIC(5,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- AI Assist Documents table (uploaded files metadata)
CREATE TABLE public.ai_assist_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.ai_assist_drafts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'ai-assist-documents',
  extracted_text TEXT,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  retention_until TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '2 years'),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Assist Runs table
CREATE TABLE public.ai_assist_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.ai_assist_drafts(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  canonical_text_hash TEXT,
  prompt_pack_version TEXT,
  sources_pack_version TEXT,
  model_id TEXT NOT NULL DEFAULT 'claude-opus-4-5',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0,
  top_p NUMERIC(3,2) NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(draft_id, run_number)
);

-- AI Assist Artifacts table
CREATE TABLE public.ai_assist_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.ai_assist_runs(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('epic', 'feature', 'story', 'acceptance_criteria', 'summary', 'compliance_report', 'quality_report')),
  content_json JSONB,
  content_html TEXT,
  content_hash TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Assist Audit Events table
CREATE TABLE public.ai_assist_audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.ai_assist_drafts(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.ai_assist_runs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'upload', 'extract', 'run_started', 'run_completed', 'content_changed',
    'compliance_noncompliant', 'justification_recorded', 'oq_answered',
    'br_linked', 'epics_published', 'export_pdf', 'admin_deleted',
    'draft_created', 'draft_updated', 'step_changed'
  )),
  actor_user_id UUID REFERENCES auth.users(id),
  payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Assist Links table (link to Business Request)
CREATE TABLE public.ai_assist_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.ai_assist_drafts(id) ON DELETE CASCADE,
  request_key TEXT NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  linked_by UUID REFERENCES auth.users(id),
  UNIQUE(draft_id, request_key)
);

-- AI Assist Published Epics table
CREATE TABLE public.ai_assist_published_epics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.ai_assist_drafts(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.ai_assist_runs(id) ON DELETE CASCADE,
  epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL,
  published_data JSONB NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_by UUID REFERENCES auth.users(id)
);

-- Create sequence for draft_key generation
CREATE SEQUENCE IF NOT EXISTS ai_assist_draft_key_seq START 1;

-- Function to generate draft_key
CREATE OR REPLACE FUNCTION public.generate_ai_assist_draft_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.draft_key IS NULL OR NEW.draft_key = '' THEN
    NEW.draft_key := 'AID-' || LPAD(nextval('ai_assist_draft_key_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate draft_key
CREATE TRIGGER trigger_generate_ai_assist_draft_key
  BEFORE INSERT ON public.ai_assist_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ai_assist_draft_key();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ai_assist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_ai_assist_drafts_updated_at
  BEFORE UPDATE ON public.ai_assist_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_assist_updated_at();

CREATE TRIGGER update_ai_assist_documents_updated_at
  BEFORE UPDATE ON public.ai_assist_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_assist_updated_at();

-- Enable RLS
ALTER TABLE public.ai_assist_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_published_epics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_assist_drafts
CREATE POLICY "Users can view all drafts" ON public.ai_assist_drafts
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can create drafts" ON public.ai_assist_drafts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update drafts" ON public.ai_assist_drafts
  FOR UPDATE USING (deleted_at IS NULL);

CREATE POLICY "Admins can delete drafts" ON public.ai_assist_drafts
  FOR DELETE USING (true);

-- RLS Policies for ai_assist_documents
CREATE POLICY "Users can view documents" ON public.ai_assist_documents
  FOR SELECT USING (true);

CREATE POLICY "Users can create documents" ON public.ai_assist_documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update documents" ON public.ai_assist_documents
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete documents" ON public.ai_assist_documents
  FOR DELETE USING (true);

-- RLS Policies for ai_assist_runs
CREATE POLICY "Users can view runs" ON public.ai_assist_runs
  FOR SELECT USING (true);

CREATE POLICY "Users can create runs" ON public.ai_assist_runs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update runs" ON public.ai_assist_runs
  FOR UPDATE USING (true);

-- RLS Policies for ai_assist_artifacts
CREATE POLICY "Users can view artifacts" ON public.ai_assist_artifacts
  FOR SELECT USING (true);

CREATE POLICY "Users can create artifacts" ON public.ai_assist_artifacts
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ai_assist_audit_events
CREATE POLICY "Users can view audit events" ON public.ai_assist_audit_events
  FOR SELECT USING (true);

CREATE POLICY "Users can create audit events" ON public.ai_assist_audit_events
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ai_assist_links
CREATE POLICY "Users can view links" ON public.ai_assist_links
  FOR SELECT USING (true);

CREATE POLICY "Users can create links" ON public.ai_assist_links
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete links" ON public.ai_assist_links
  FOR DELETE USING (true);

-- RLS Policies for ai_assist_published_epics
CREATE POLICY "Users can view published epics" ON public.ai_assist_published_epics
  FOR SELECT USING (true);

CREATE POLICY "Users can create published epics" ON public.ai_assist_published_epics
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_ai_assist_drafts_status ON public.ai_assist_drafts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_assist_drafts_created_by ON public.ai_assist_drafts(created_by);
CREATE INDEX idx_ai_assist_runs_draft_id ON public.ai_assist_runs(draft_id);
CREATE INDEX idx_ai_assist_artifacts_run_id ON public.ai_assist_artifacts(run_id);
CREATE INDEX idx_ai_assist_audit_events_draft_id ON public.ai_assist_audit_events(draft_id);
CREATE INDEX idx_ai_assist_links_draft_id ON public.ai_assist_links(draft_id);
CREATE INDEX idx_ai_assist_links_request_key ON public.ai_assist_links(request_key);

-- Create storage bucket for AI Assist documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-assist-documents',
  'ai-assist-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view AI Assist documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-assist-documents');

CREATE POLICY "Users can upload AI Assist documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ai-assist-documents');

CREATE POLICY "Users can delete AI Assist documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'ai-assist-documents');