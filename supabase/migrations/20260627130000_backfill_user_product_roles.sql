-- CAT-RBAC-RESOLVE-20260627-001 — Phase 0: backfill user_product_roles from profiles.role
--
-- WHY: user_roles is effectively dead (2 rows / 61). The only per-user role signal is the legacy
-- profiles.role (text). The product-role model (user_product_roles) is the target source of truth,
-- but 59/61 users have no row. This backfills one product role per profile so a later RPC cutover
-- (Phase 2) does not deny every non-admin.
--
-- MAPPING (profiles.role text -> product_roles.code):
--   admin            -> super_admin        (the only all-Allow role; preserves admin power)
--   team_lead        -> team_lead
--   Backend Architect-> backend_architect
--   Product Owner    -> product_owner
--   everything else  -> developer          (baseline; includes user / program_manager / Frontend Developer)
--
-- SAFETY / PARITY: every target except super_admin carries 32 Deny / 0 Allow rows in
-- product_role_permissions. So this backfill grants real permissions to the admin user ONLY; all
-- other users resolve to all-Deny — identical to the current admin-binary check_permission gate.
-- Effective-permission parity is therefore preserved. Additive only (no deletes). Idempotent via
-- the user_product_roles_user_role_unique (user_id, role_id) constraint.

INSERT INTO public.user_product_roles (user_id, role_id, business_lines)
SELECT p.id,
       pr.id,
       '{}'::text[]
FROM public.profiles p
JOIN public.product_roles pr
  ON pr.code = CASE p.role
       WHEN 'admin'             THEN 'super_admin'
       WHEN 'team_lead'         THEN 'team_lead'
       WHEN 'Backend Architect' THEN 'backend_architect'
       WHEN 'Product Owner'     THEN 'product_owner'
       ELSE 'developer'
     END
ON CONFLICT (user_id, role_id) DO NOTHING;
