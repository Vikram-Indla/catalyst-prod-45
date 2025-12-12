-- Ensure profiles table has correct defaults and constraints
-- Update handle_new_user trigger to set PENDING_APPROVAL

-- Drop and recreate the trigger function with correct defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    role,
    approval_status,
    requested_at,
    signup_attempts_count
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',  -- ALWAYS default to 'user', never admin
    'PENDING_APPROVAL',  -- ALWAYS start as pending
    now(),
    1
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$;

-- Create helper function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND approval_status = 'APPROVED'
  );
$$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND approval_status = 'APPROVED'
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Update any existing profiles with null approval_status to PENDING_APPROVAL
UPDATE public.profiles 
SET approval_status = 'PENDING_APPROVAL' 
WHERE approval_status IS NULL;

-- Update any profiles with null role to 'user'
UPDATE public.profiles 
SET role = 'user' 
WHERE role IS NULL;

-- Add RLS policies for profiles table that enforce approval
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Users can only view their own profile (even if not approved, for status check)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own profile if approved
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id AND is_user_approved(auth.uid()))
WITH CHECK (auth.uid() = id AND is_user_approved(auth.uid()));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_user_admin(auth.uid()));

-- Admins can update all profiles (for approval workflow)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_user_admin(auth.uid()));

-- Add approval enforcement to critical tables
-- Example for epics table (add similar for all tables with user data)

-- Create a function that can be used in RLS to check approval
CREATE OR REPLACE FUNCTION public.current_user_is_approved()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT approval_status = 'APPROVED' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;