-- Add vendor_code to resource_vendors (V01, V02, etc.)
ALTER TABLE public.resource_vendors 
ADD COLUMN vendor_code TEXT UNIQUE;

-- Add department_code to departments (D01, D02, etc.)
ALTER TABLE public.departments 
ADD COLUMN department_code TEXT UNIQUE;

-- Create function to generate next vendor code
CREATE OR REPLACE FUNCTION public.generate_vendor_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(vendor_code FROM 2) AS INTEGER)), 0) + 1
  INTO next_num
  FROM resource_vendors
  WHERE vendor_code IS NOT NULL;
  
  NEW.vendor_code := 'V' || LPAD(next_num::TEXT, 2, '0');
  RETURN NEW;
END;
$$;

-- Create function to generate next department code
CREATE OR REPLACE FUNCTION public.generate_department_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(department_code FROM 2) AS INTEGER)), 0) + 1
  INTO next_num
  FROM departments
  WHERE department_code IS NOT NULL;
  
  NEW.department_code := 'D' || LPAD(next_num::TEXT, 2, '0');
  RETURN NEW;
END;
$$;

-- Create trigger for vendor_code auto-generation
CREATE TRIGGER trigger_generate_vendor_code
  BEFORE INSERT ON public.resource_vendors
  FOR EACH ROW
  WHEN (NEW.vendor_code IS NULL)
  EXECUTE FUNCTION public.generate_vendor_code();

-- Create trigger for department_code auto-generation
CREATE TRIGGER trigger_generate_department_code
  BEFORE INSERT ON public.departments
  FOR EACH ROW
  WHEN (NEW.department_code IS NULL)
  EXECUTE FUNCTION public.generate_department_code();