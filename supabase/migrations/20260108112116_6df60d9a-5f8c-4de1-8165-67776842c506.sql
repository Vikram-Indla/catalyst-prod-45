-- ============================================================
-- V_RESOURCE_PROFILE: SINGLE SOURCE OF TRUTH VIEW
-- Joins profiles + resource_inventory + lookups + roles
-- Used by both /admin/users and Capacity Planner
-- ============================================================

CREATE OR REPLACE VIEW public.v_resource_profile AS
SELECT
  -- Primary key: prefer profile id, fallback to resource_inventory id
  COALESCE(p.id, ri.id) AS user_id,
  
  -- Profile fields
  p.id AS profile_id,
  ri.id AS resource_inventory_id,
  COALESCE(p.full_name, ri.name) AS full_name,
  p.email,
  p.avatar_url,
  p.approval_status,
  p.requested_at,
  p.approved_at,
  p.rejected_at,
  p.rejection_reason,
  p.signup_attempts_count,
  p.created_at,
  GREATEST(p.updated_at, ri.updated_at) AS updated_at,
  
  -- Resource inventory IDs (source of truth for resource data)
  ri.vendor_id,
  ri.department_id,
  ri.assignment_id,
  ri.location_id,
  ri.country_id,
  ri.contract_start_date,
  ri.contract_end_date,
  ri.role_name AS job_role,
  ri.default_capacity_percent,
  ri.is_active AS resource_is_active,
  
  -- Resolved lookup names
  rv.name AS vendor_name,
  cd.name AS department_name,
  ra.name AS assignment_name,
  rl.name AS location_name,
  rc.name AS country_name,
  rc.code AS country_code,
  
  -- Fallback values from profiles (for legacy compatibility)
  COALESCE(rv.name, ri.vendor_name, p.vendor) AS resolved_vendor,
  COALESCE(rc.name, p.country) AS resolved_country,
  COALESCE(rl.name, p.location) AS resolved_location,
  p.country_flag_svg_url

FROM public.resource_inventory ri
FULL OUTER JOIN public.profiles p ON ri.profile_id = p.id
LEFT JOIN public.resource_vendors rv ON ri.vendor_id = rv.id
LEFT JOIN public.capacity_departments cd ON ri.department_id = cd.id
LEFT JOIN public.resource_assignments ra ON ri.assignment_id = ra.id
LEFT JOIN public.resource_locations rl ON ri.location_id = rl.id
LEFT JOIN public.resource_countries rc ON ri.country_id = rc.id;

-- Grant read access
GRANT SELECT ON public.v_resource_profile TO authenticated;
GRANT SELECT ON public.v_resource_profile TO anon;

-- ============================================================
-- V_USER_ROLES: Aggregated roles per user
-- ============================================================

CREATE OR REPLACE VIEW public.v_user_roles AS
SELECT
  upr.user_id,
  array_agg(upr.role_id) AS role_ids,
  array_agg(pr.name) AS role_names,
  array_agg(pr.code) AS role_codes
FROM public.user_product_roles upr
JOIN public.product_roles pr ON upr.role_id = pr.id
GROUP BY upr.user_id;

GRANT SELECT ON public.v_user_roles TO authenticated;
GRANT SELECT ON public.v_user_roles TO anon;