-- Add vendor/contract/country metadata fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS country_flag_svg_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.vendor IS 'Vendor organization name (e.g., Thiqah, ELM, BMC, Freelance)';
COMMENT ON COLUMN public.profiles.contract_end_date IS 'Contract end date for the user';
COMMENT ON COLUMN public.profiles.country IS 'Country name (e.g., Egypt, Pakistan, KSA)';
COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., EG, PK, SA)';
COMMENT ON COLUMN public.profiles.country_flag_svg_url IS 'Path to flag SVG asset';
COMMENT ON COLUMN public.profiles.location IS 'Work location type (Onsite, Off-Shore, On-Site)';

-- Create indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_profiles_vendor ON public.profiles(vendor);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_contract_end_date ON public.profiles(contract_end_date);

-- Ensure email has an index (if not already present)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create user_bulk_update_audit table for tracking bulk updates
CREATE TABLE IF NOT EXISTS public.user_bulk_update_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES public.profiles(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_updated INTEGER NOT NULL DEFAULT 0,
  total_skipped INTEGER NOT NULL DEFAULT 0,
  total_mismatched INTEGER NOT NULL DEFAULT 0,
  mapping_input JSONB,
  results_summary JSONB
);

-- Create user_field_change_log for per-user field changes
CREATE TABLE IF NOT EXISTS public.user_field_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  bulk_update_id UUID REFERENCES public.user_bulk_update_audit(id)
);

-- Enable RLS on new tables
ALTER TABLE public.user_bulk_update_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_field_change_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_bulk_update_audit (only admins can read/write)
CREATE POLICY "Admins can view bulk update audit"
  ON public.user_bulk_update_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert bulk update audit"
  ON public.user_bulk_update_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for user_field_change_log (only admins can read/write)
CREATE POLICY "Admins can view field change log"
  ON public.user_field_change_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert field change log"
  ON public.user_field_change_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for the new audit tables
CREATE INDEX IF NOT EXISTS idx_user_field_change_log_user_id ON public.user_field_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_field_change_log_bulk_update_id ON public.user_field_change_log(bulk_update_id);
CREATE INDEX IF NOT EXISTS idx_user_bulk_update_audit_triggered_at ON public.user_bulk_update_audit(triggered_at DESC);