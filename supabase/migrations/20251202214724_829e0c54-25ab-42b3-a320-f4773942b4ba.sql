-- Create idea_group_members table for campaign admins and contributors
CREATE TABLE public.idea_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.idea_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'contributor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  UNIQUE(group_id, user_id, role)
);

-- Enable RLS
ALTER TABLE public.idea_group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all group members"
ON public.idea_group_members FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view group members"
ON public.idea_group_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Group admins can manage members"
ON public.idea_group_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.idea_group_members igm
    WHERE igm.group_id = idea_group_members.group_id
    AND igm.user_id = auth.uid()
    AND igm.role = 'admin'
  )
);

-- Create index for performance
CREATE INDEX idx_idea_group_members_group_id ON public.idea_group_members(group_id);
CREATE INDEX idx_idea_group_members_user_id ON public.idea_group_members(user_id);