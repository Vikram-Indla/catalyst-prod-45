-- Create tm_users view that references profiles table
-- This allows the TM module edge functions to work correctly

CREATE OR REPLACE VIEW public.tm_users AS
SELECT 
  id,
  id as auth_user_id,
  full_name as display_name,
  email,
  avatar_url,
  role,
  created_at,
  updated_at
FROM public.profiles;

-- Grant permissions
GRANT SELECT ON public.tm_users TO anon, authenticated;