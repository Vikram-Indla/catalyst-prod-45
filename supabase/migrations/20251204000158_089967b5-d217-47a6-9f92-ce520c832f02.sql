-- Drop existing trigger first with correct name
DROP TRIGGER IF EXISTS set_business_request_key ON public.business_requests;
DROP FUNCTION IF EXISTS public.generate_business_request_key() CASCADE;

-- Create new function with MIM-YY-MM-XXX format
CREATE OR REPLACE FUNCTION public.generate_business_request_key()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  year_part TEXT;
  month_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  month_part := TO_CHAR(NOW(), 'MM');
  random_part := LPAD((FLOOR(RANDOM() * 900) + 100)::TEXT, 3, '0');
  NEW.request_key := 'MIM-' || year_part || '-' || month_part || '-' || random_part;
  RETURN NEW;
END;
$function$;

-- Recreate trigger
CREATE TRIGGER set_business_request_key
  BEFORE INSERT ON public.business_requests
  FOR EACH ROW
  WHEN (NEW.request_key IS NULL)
  EXECUTE FUNCTION public.generate_business_request_key();

-- Update existing records with new MIM format using a CTE
WITH numbered AS (
  SELECT id, created_at, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.business_requests
  WHERE request_key LIKE 'BR-%' OR request_key LIKE 'MDT-%'
)
UPDATE public.business_requests br
SET request_key = 'MIM-' || TO_CHAR(n.created_at, 'YY') || '-' || TO_CHAR(n.created_at, 'MM') || '-' || LPAD(n.rn::TEXT, 3, '0')
FROM numbered n
WHERE br.id = n.id;