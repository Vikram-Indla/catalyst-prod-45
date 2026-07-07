-- ============================================================================
-- STRATA RECOVERY — fix strata_is_admin platform-admin resolution
-- CAT-STRATA-20260705-001 · Session 004 · F-GOV-006 defect
--
-- The original check looked for product_roles named 'admin'/'owner'
-- (user_product_roles are JOB-TITLE roles: DEVOPS, Product Owner, …) so no
-- user on this deployment ever passed the platform-admin path — every
-- strata_has_role() guard silently collapsed to strata_role_assignments only,
-- and strata_role_assignments had zero rows. Result: nobody could author.
--
-- The platform's canonical admin check is public.is_admin(uid) →
-- user_roles.role = 'admin'. Use it (plus explicit strata_admin grants).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.strata_is_admin(p_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(p_user) OR EXISTS (
    SELECT 1 FROM public.strata_role_assignments ra
    WHERE ra.user_id = p_user AND ra.role = 'strata_admin'
  );
$$;

COMMENT ON FUNCTION public.strata_is_admin(uuid) IS
  'STRATA admin = platform admin (public.is_admin → user_roles.role=''admin'') OR an explicit strata_admin role assignment. Fixed 2026-07-06: previously checked job-title product_roles that never match.';
