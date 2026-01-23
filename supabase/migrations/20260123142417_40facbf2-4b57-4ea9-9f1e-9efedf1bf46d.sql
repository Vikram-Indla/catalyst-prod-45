-- Fix views to use SECURITY INVOKER
DROP VIEW IF EXISTS public.resource_current_cost;
DROP VIEW IF EXISTS public.license_allocation_totals;

-- Recreate with SECURITY INVOKER
CREATE VIEW public.resource_current_cost 
WITH (security_invoker = true) AS
SELECT DISTINCT ON (resource_id) 
    id,
    resource_id,
    resource_type,
    monthly_cost,
    monthly_cost * 12 as annual_cost,
    effective_from,
    effective_to,
    created_at,
    created_by
FROM public.resource_cost_history
WHERE effective_from <= CURRENT_DATE
  AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
ORDER BY resource_id, effective_from DESC;

CREATE VIEW public.license_allocation_totals 
WITH (security_invoker = true) AS
SELECT 
    license_id,
    SUM(allocation_percent) as total_allocated,
    CASE 
        WHEN SUM(allocation_percent) = 100 THEN 'complete'
        WHEN SUM(allocation_percent) < 100 THEN 'partial'
        ELSE 'over'
    END as allocation_status
FROM public.assignment_license_allocations
GROUP BY license_id;

-- Fix function search path
CREATE OR REPLACE FUNCTION public.close_previous_cost_record()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.resource_cost_history
    SET effective_to = NEW.effective_from - INTERVAL '1 day',
        updated_at = NOW()
    WHERE resource_id = NEW.resource_id
      AND effective_to IS NULL
      AND id != NEW.id
      AND effective_from < NEW.effective_from;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;