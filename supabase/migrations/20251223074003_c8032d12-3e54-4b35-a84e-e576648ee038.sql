-- Allow all authenticated users to view profiles for assignment purposes
-- This is needed so users can assign work items to other team members

CREATE POLICY "Authenticated users can view all profiles for assignment"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');