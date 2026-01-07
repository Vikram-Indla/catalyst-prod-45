-- Fix search path for AI Assist functions
CREATE OR REPLACE FUNCTION public.generate_ai_assist_draft_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.draft_key IS NULL OR NEW.draft_key = '' THEN
    NEW.draft_key := 'AID-' || LPAD(nextval('ai_assist_draft_key_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_ai_assist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;