-- Drop existing conflicting SELECT policies for portfolios
DROP POLICY IF EXISTS "Users can view portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Program managers can view portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Team leads can view portfolios" ON public.portfolios;

-- Drop existing conflicting SELECT policies for programs  
DROP POLICY IF EXISTS "Users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Team leads can view programs" ON public.programs;

-- Create simple authenticated read policies
CREATE POLICY "Authenticated users can read portfolios"
ON public.portfolios
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read programs"
ON public.programs
FOR SELECT
TO authenticated
USING (true);