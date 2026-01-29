-- Drop v2 functions and create with original names
DROP FUNCTION IF EXISTS get_module_matrix_v2(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_module_permission_v2(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_permission_stats_v2(TEXT);
DROP FUNCTION IF EXISTS get_module_groups_v2();
DROP FUNCTION IF EXISTS bulk_update_permissions_v2(TEXT[], TEXT[], TEXT);

-- Also drop any old versions
DROP FUNCTION IF EXISTS get_module_matrix(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_module_matrix();
DROP FUNCTION IF EXISTS update_module_permission(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_permission_stats(TEXT);
DROP FUNCTION IF EXISTS get_permission_stats();
DROP FUNCTION IF EXISTS get_module_groups();
DROP FUNCTION IF EXISTS bulk_update_permissions(TEXT[], TEXT[], TEXT);

-- ============================================
-- RPC 1: Get grouped matrix data
-- ============================================
CREATE OR REPLACE FUNCTION get_module_matrix(
  p_role_code TEXT DEFAULT NULL,
  p_group_name TEXT DEFAULT NULL,
  p_access_level TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  module_key TEXT,
  module_name TEXT,
  group_name TEXT,
  sort_order INT,
  role_code TEXT,
  role_name TEXT,
  is_system_role BOOLEAN,
  access_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    anm.module_key::TEXT,
    anm.name::TEXT as module_name,
    anm.group_name::TEXT,
    anm.sort_order,
    pr.code::TEXT as role_code,
    pr.name::TEXT as role_name,
    (pr.code = 'super_admin')::BOOLEAN as is_system_role,
    COALESCE(rmp.access_level, 'hidden')::TEXT as access_level
  FROM admin_nav_modules anm
  CROSS JOIN product_roles pr
  LEFT JOIN admin_role_module_permissions rmp 
    ON rmp.module_key = anm.module_key AND rmp.role_code = pr.code
  WHERE anm.is_active = true 
    AND pr.is_active = true
    AND (p_role_code IS NULL OR pr.code = p_role_code)
    AND (p_group_name IS NULL OR anm.group_name = p_group_name)
    AND (p_access_level IS NULL OR COALESCE(rmp.access_level, 'hidden') = p_access_level)
    AND (p_search IS NULL OR anm.name ILIKE '%' || p_search || '%')
  ORDER BY anm.sort_order, pr.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC 2: Update single permission
-- ============================================
CREATE OR REPLACE FUNCTION update_module_permission(
  p_role_code TEXT,
  p_module_key TEXT,
  p_access_level TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_old_level TEXT;
BEGIN
  IF p_role_code = 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify Super Admin');
  END IF;
  
  SELECT access_level INTO v_old_level 
  FROM admin_role_module_permissions 
  WHERE role_code = p_role_code AND module_key = p_module_key;
  
  INSERT INTO admin_role_module_permissions (role_code, module_key, access_level, updated_at, updated_by)
  VALUES (p_role_code, p_module_key, p_access_level, NOW(), auth.uid())
  ON CONFLICT (role_code, module_key) 
  DO UPDATE SET access_level = p_access_level, updated_at = NOW(), updated_by = auth.uid();
  
  INSERT INTO admin_permission_audit (admin_user_id, role_code, module_key, old_access_level, new_access_level)
  VALUES (auth.uid(), p_role_code, p_module_key, v_old_level, p_access_level);
  
  RETURN jsonb_build_object('success', true, 'old', v_old_level, 'new', p_access_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 3: Get permission stats
-- ============================================
CREATE OR REPLACE FUNCTION get_permission_stats(p_role_code TEXT DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_modules', (SELECT COUNT(*) FROM admin_nav_modules WHERE is_active = true),
      'total_roles', (SELECT COUNT(*) FROM product_roles WHERE is_active = true),
      'full_count', COUNT(*) FILTER (WHERE access_level = 'full'),
      'view_count', COUNT(*) FILTER (WHERE access_level = 'view'),
      'hidden_count', COUNT(*) FILTER (WHERE access_level = 'hidden')
    )
    FROM admin_role_module_permissions rmp
    WHERE (p_role_code IS NULL OR rmp.role_code = p_role_code)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC 4: Get distinct groups
-- ============================================
CREATE OR REPLACE FUNCTION get_module_groups()
RETURNS TABLE (group_name TEXT, module_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT anm.group_name::TEXT, COUNT(*)::BIGINT
  FROM admin_nav_modules anm
  WHERE anm.is_active = true
  GROUP BY anm.group_name
  ORDER BY MIN(anm.sort_order);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC 5: Bulk update
-- ============================================
CREATE OR REPLACE FUNCTION bulk_update_permissions(
  p_module_keys TEXT[],
  p_role_codes TEXT[],
  p_access_level TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_count INT := 0;
  v_module TEXT;
  v_role TEXT;
BEGIN
  FOREACH v_module IN ARRAY p_module_keys LOOP
    FOREACH v_role IN ARRAY p_role_codes LOOP
      IF v_role != 'super_admin' THEN
        PERFORM update_module_permission(v_role, v_module, p_access_level);
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_module_matrix TO authenticated;
GRANT EXECUTE ON FUNCTION update_module_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_permission_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_module_groups TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_permissions TO authenticated;