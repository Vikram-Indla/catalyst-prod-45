-- Fix security warnings: Add search_path to functions missing it

-- Fix calculate_feature_wsjf function
CREATE OR REPLACE FUNCTION public.calculate_feature_wsjf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Calculate WSJF score: (BV + TC + RR) / JS
  -- Only calculate if all components are present and job_size > 0
  IF NEW.business_value IS NOT NULL 
     AND NEW.time_criticality IS NOT NULL 
     AND NEW.risk_reduction IS NOT NULL 
     AND NEW.job_size IS NOT NULL 
     AND NEW.job_size > 0 THEN
    NEW.wsjf_score := ROUND(
      (NEW.business_value + NEW.time_criticality + NEW.risk_reduction)::NUMERIC / NEW.job_size::NUMERIC, 
      2
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_user_epic_backlog_preferences_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_epic_backlog_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;