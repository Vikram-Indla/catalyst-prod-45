-- Fix EA Review Required default to false
ALTER TABLE public.business_requests 
ALTER COLUMN ea_review_required SET DEFAULT false;