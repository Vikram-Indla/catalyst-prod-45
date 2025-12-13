-- Add public SELECT policies for external form access
-- These are reference/lookup tables with non-sensitive data

-- Allow anyone to view active departments (for external form)
CREATE POLICY "Anyone can view active departments"
ON public.departments
FOR SELECT
USING (is_active = true);

-- Allow anyone to view active business owners (for external form)
CREATE POLICY "Anyone can view active business owners"
ON public.business_owners
FOR SELECT
USING (is_active = true);

-- Allow anyone to view department-owner mappings (for external form auto-fill)
CREATE POLICY "Anyone can view department owner mapping"
ON public.department_owner_mapping
FOR SELECT
USING (true);