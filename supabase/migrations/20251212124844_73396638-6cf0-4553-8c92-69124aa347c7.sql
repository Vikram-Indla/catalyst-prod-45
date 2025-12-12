-- Drop existing milestone policies that only support epic_id
DROP POLICY IF EXISTS "Users can create milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can update milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can view milestones in their portfolio" ON public.milestones;

-- Create new policies that support both epic_id and business_request_id
CREATE POLICY "Users can create milestones" ON public.milestones
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND current_user_is_approved() AND (
    epic_id IS NOT NULL OR business_request_id IS NOT NULL
  )
);

CREATE POLICY "Users can update milestones" ON public.milestones
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND current_user_is_approved()
);

CREATE POLICY "Users can delete milestones" ON public.milestones
FOR DELETE USING (
  auth.uid() IS NOT NULL AND current_user_is_approved()
);