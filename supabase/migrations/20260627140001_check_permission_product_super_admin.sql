-- CAT-RBAC-RESOLVE-20260627-001 — Phase 2: source the full-access (admin) gate from the product role
--
-- WHY: check_permission decided "full access" via has_role(_user_id,'admin'), reading the legacy
-- user_roles table. The admin UI assigns the product role super_admin (user_product_roles) which the
-- gate never read. This makes the super_admin product role actually grant full access, so /admin/roles
-- drives the runtime gate.
--
-- DUAL-READ / PARITY: legacy user_roles 'admin' is kept as a fallback (OR), so the change can only
-- preserve or add access, never remove it. On dev, super_admin holders = legacy admins = 1 (same
-- user), so effective access is unchanged at cutover.
--
-- SCOPE LIMIT (granular permissions NOT wired here): callers pass (entity_type, action[, scope]);
-- product_role_permissions is keyed by free-text permission_group ("Product: Create Story", …) with
-- NO mapping between the two vocabularies. Wiring the 832-row matrix to the gate requires an
-- (entity_type, action) -> permission_group mapping that does not exist and needs product input
-- (Phase 3, blocked). Until then the legacy granular branch is preserved byte-for-byte.
--
-- ROLLBACK: re-CREATE OR REPLACE with the previous body (has_role(_user_id,'admin') only).

CREATE OR REPLACE FUNCTION public.check_permission(
  _user_id uuid,
  _entity_type text,
  _action permission_action,
  _scope_type permission_scope DEFAULT 'global'::permission_scope,
  _scope_id uuid DEFAULT NULL::uuid
)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    -- Full access via the product-role model (the new source of truth).
    WHEN EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.role_id
      WHERE upr.user_id = _user_id
        AND pr.code = 'super_admin'
    ) THEN true
    -- Legacy fallback (dual-read) — never reduces access during the transition.
    WHEN has_role(_user_id, 'admin') THEN true
    -- Granular legacy branch, preserved unchanged (no product mapping yet).
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
$function$;
