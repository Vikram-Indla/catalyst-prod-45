-- CAT-DEF-005 (1b): self-healing auth provisioning for APPROVED profiles that have
-- no auth.users row (legacy 2025-12-25 seed created ~37 orphaned profiles).
-- Called on-demand by send-login-otp / send-password-reset when the gap is detected.
-- Inserts auth.users + auth.identities with id = profiles.id (FK-aligned), no password,
-- email confirmed => the user signs in via the existing OTP send-code flow.
--
-- Column shape verified against a known-good login (auth.users): instance_id sentinel,
-- aud/role 'authenticated', the four no-default token columns set to '' (GoTrue NULL-scan
-- gotcha), identities.email is GENERATED and identities.provider_id = user id (modern
-- GoTrue convention). confirmed_at and identities.email are generated columns — never inserted.

CREATE OR REPLACE FUNCTION public.provision_auth_for_profile(p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email     text;
  v_status    text;
  v_full_name text;
BEGIN
  SELECT lower(email), approval_status, full_name
    INTO v_email, v_status, v_full_name
  FROM public.profiles
  WHERE id = p_profile_id;

  IF v_email IS NULL THEN
    RETURN 'profile_not_found';
  END IF;

  IF v_status IS DISTINCT FROM 'APPROVED' THEN
    RETURN 'not_approved';
  END IF;

  -- Idempotent: nothing to do if the auth account already exists.
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_profile_id) THEN
    RETURN 'already_has_auth';
  END IF;

  -- Safety: never collide with a different auth.users that already owns this email
  -- (the duplicate-record reconciliation case is handled separately, not here).
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RETURN 'email_taken';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    is_sso_user, is_anonymous,
    created_at, updated_at
  ) VALUES (
    p_profile_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_email,
    NULL, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name, 'name', v_full_name),
    '', '', '', '',
    false, false,
    now(), now()
  );

  INSERT INTO auth.identities (
    user_id, provider, provider_id, identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    p_profile_id, 'email', p_profile_id::text,
    jsonb_build_object(
      'sub', p_profile_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    NULL, now(), now()
  );

  RETURN 'provisioned';
END;
$$;

REVOKE ALL ON FUNCTION public.provision_auth_for_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_auth_for_profile(uuid) TO service_role;

-- Observability: surfaces any APPROVED human profile with no auth account so this
-- never silently rots again. service_role only (exposes emails).
CREATE OR REPLACE VIEW public.v_orphaned_approved_profiles AS
SELECT pr.id, pr.email, pr.full_name, pr.created_at
FROM public.profiles pr
LEFT JOIN auth.users au ON au.id = pr.id
WHERE pr.approval_status = 'APPROVED'
  AND au.id IS NULL
  AND pr.email NOT LIKE '%@catalyst.internal';

REVOKE ALL ON public.v_orphaned_approved_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_orphaned_approved_profiles TO service_role;
