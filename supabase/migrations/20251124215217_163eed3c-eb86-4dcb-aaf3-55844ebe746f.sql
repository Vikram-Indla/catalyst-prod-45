-- ============================================
-- PHASE 3: Enhancements & Data Consistency
-- ============================================

-- ============================================
-- PART 1: Role Change History Tracking
-- ============================================

-- Create role history table
CREATE TABLE IF NOT EXISTS public.user_role_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  action text NOT NULL CHECK (action IN ('assigned', 'removed')),
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.user_role_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admins can view all role history
CREATE POLICY "Admins can view all role history"
  ON public.user_role_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS policy: Users can view their own role history
CREATE POLICY "Users can view their own role history"
  ON public.user_role_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_role_history (user_id, role, action, changed_by)
    VALUES (NEW.user_id, NEW.role, 'assigned', auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_role_history (user_id, role, action, changed_by)
    VALUES (OLD.user_id, OLD.role, 'removed', auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to log role changes
CREATE TRIGGER log_user_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- ============================================
-- PART 2: Permission Check Functions
-- ============================================

-- Function to check entity-level permissions
CREATE OR REPLACE FUNCTION public.check_permission(
  _user_id uuid,
  _entity_type text,
  _action permission_action,
  _scope_type permission_scope DEFAULT 'global',
  _scope_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user has admin role (full access)
  SELECT CASE
    WHEN has_role(_user_id, 'admin') THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.permission_grants pg ON pg.role_id IN (
        SELECT id FROM public.permission_roles pr
        WHERE pr.name = (
          SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1
        )
      )
      WHERE ur.user_id = _user_id
        AND pg.entity_type = _entity_type
        AND pg.action = _action
        AND pg.scope_type = _scope_type
        AND (pg.scope_id IS NULL OR pg.scope_id = _scope_id)
        AND pg.allowed = true
    )
  END;
$$;

-- ============================================
-- PART 3: Orphaned Data Cleanup
-- ============================================

-- Function to handle user deletion and orphaned data
CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reassign or nullify owner_id and assignee_id fields
  UPDATE public.strategic_themes SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.initiatives SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.business_requests SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.epics SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.features SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.stories SET assignee_id = NULL WHERE assignee_id = OLD.id;
  UPDATE public.stories SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.subtasks SET assignee_id = NULL WHERE assignee_id = OLD.id;
  UPDATE public.risks SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.portfolios SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.programs SET rte_id = NULL WHERE rte_id = OLD.id;
  UPDATE public.objectives SET owner_id = NULL WHERE owner_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Trigger to cleanup orphaned data when profile is deleted
CREATE TRIGGER cleanup_on_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_data();

-- ============================================
-- PART 4: Comment & Attachment Permissions
-- ============================================

-- Enhanced RLS for comments - check entity permissions
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    check_permission(auth.uid(), entity_type, 'edit'::permission_action)
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    check_permission(auth.uid(), entity_type, 'edit'::permission_action)
  );

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    check_permission(auth.uid(), entity_type, 'delete'::permission_action)
  );

-- Enhanced RLS for attachments - check entity permissions
DROP POLICY IF EXISTS "Users can upload attachments" ON public.attachments;
CREATE POLICY "Users can upload attachments"
  ON public.attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    check_permission(auth.uid(), entity_type, 'edit'::permission_action)
  );

DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.attachments;
CREATE POLICY "Users can delete their own attachments"
  ON public.attachments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by AND
    check_permission(auth.uid(), entity_type, 'delete'::permission_action)
  );

-- ============================================
-- PART 5: Bulk Assignment Permissions
-- ============================================

-- Function to bulk assign roles
CREATE OR REPLACE FUNCTION public.bulk_assign_roles(
  _user_ids uuid[],
  _role app_role,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Only admins can bulk assign roles
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can bulk assign roles';
  END IF;

  -- Assign role to each user
  FOREACH _user_id IN ARRAY _user_ids
  LOOP
    -- Insert role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the change with notes
    INSERT INTO public.user_role_history (user_id, role, action, changed_by, notes)
    VALUES (_user_id, _role, 'assigned', auth.uid(), _notes);
  END LOOP;
END;
$$;

-- Function to bulk remove roles
CREATE OR REPLACE FUNCTION public.bulk_remove_roles(
  _user_ids uuid[],
  _role app_role,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Only admins can bulk remove roles
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can bulk remove roles';
  END IF;

  -- Remove role from each user
  FOREACH _user_id IN ARRAY _user_ids
  LOOP
    -- Delete role
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = _role;
    
    -- Log the change with notes
    INSERT INTO public.user_role_history (user_id, role, action, changed_by, notes)
    VALUES (_user_id, _role, 'removed', auth.uid(), _notes);
  END LOOP;
END;
$$;