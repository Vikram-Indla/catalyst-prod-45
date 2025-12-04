
-- Update the function to generate sequential MIM-XXX format
CREATE OR REPLACE FUNCTION public.generate_business_request_key()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  max_num INTEGER;
  new_num INTEGER;
BEGIN
  -- Find the highest existing MIM number
  SELECT COALESCE(MAX(
    CASE 
      WHEN request_key ~ '^MIM-[0-9]+$' 
      THEN CAST(SUBSTRING(request_key FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO max_num
  FROM business_requests;
  
  -- Increment by 1
  new_num := max_num + 1;
  
  -- Format as MIM-XXX (3 digits, zero-padded)
  NEW.request_key := 'MIM-' || LPAD(new_num::TEXT, 3, '0');
  
  RETURN NEW;
END;
$function$;
