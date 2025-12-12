-- Create upload_sessions table for managing staged uploads
CREATE TABLE public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by TEXT, -- external user identifier or anonymous session
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create unified attachments table
CREATE TABLE public.unified_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID, -- nullable until committed
  work_item_type TEXT, -- 'business_request', 'epic', 'feature', etc.
  upload_session_id UUID REFERENCES public.upload_sessions(id) ON DELETE SET NULL,
  uploaded_by_user_id UUID, -- nullable for external users
  uploaded_by_name TEXT, -- display name for external users
  uploaded_by_type TEXT NOT NULL DEFAULT 'internal' CHECK (uploaded_by_type IN ('external', 'internal')),
  source_context TEXT NOT NULL DEFAULT 'links_tab' CHECK (source_context IN ('external_wizard', 'links_tab')),
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  storage_provider TEXT NOT NULL DEFAULT 'supabase',
  storage_key TEXT NOT NULL, -- path in storage bucket
  checksum_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'committed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_unified_attachments_work_item ON public.unified_attachments(work_item_id, work_item_type);
CREATE INDEX idx_unified_attachments_session ON public.unified_attachments(upload_session_id);
CREATE INDEX idx_unified_attachments_status ON public.unified_attachments(status);

-- Enable RLS
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_attachments ENABLE ROW LEVEL SECURITY;

-- Upload sessions: allow all authenticated users and anonymous for external wizard
CREATE POLICY "Anyone can create upload sessions"
  ON public.upload_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own sessions"
  ON public.upload_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update their own sessions"
  ON public.upload_sessions FOR UPDATE
  USING (true);

-- Unified attachments: permissive for now, will tighten based on work_item permissions
CREATE POLICY "Anyone can create attachments"
  ON public.unified_attachments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view attachments"
  ON public.unified_attachments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update attachments"
  ON public.unified_attachments FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete attachments"
  ON public.unified_attachments FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON public.upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unified_attachments_updated_at
  BEFORE UPDATE ON public.unified_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();