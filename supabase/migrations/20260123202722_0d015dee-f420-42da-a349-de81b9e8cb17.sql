-- Fix the get_folder_tree function - array type mismatch
CREATE OR REPLACE FUNCTION public.get_folder_tree(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    WITH RECURSIVE folder_tree AS (
      SELECT 
        f.id,
        f.name,
        f.description,
        f.parent_id,
        f.sort_order,
        f.created_by,
        f.created_at,
        0 as depth,
        ARRAY[f.sort_order] as sort_path
      FROM test_folders f
      WHERE f.project_id = p_project_id
      AND f.parent_id IS NULL
      
      UNION ALL
      
      SELECT 
        f.id,
        f.name,
        f.description,
        f.parent_id,
        f.sort_order,
        f.created_by,
        f.created_at,
        ft.depth + 1,
        ft.sort_path || ARRAY[f.sort_order]
      FROM test_folders f
      INNER JOIN folder_tree ft ON f.parent_id = ft.id
      WHERE ft.depth < 10
    ),
    folder_counts AS (
      SELECT 
        folder_id,
        COUNT(*)::INTEGER as test_case_count
      FROM test_cases
      WHERE project_id = p_project_id
      AND folder_id IS NOT NULL
      GROUP BY folder_id
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ft.id,
          'name', ft.name,
          'description', ft.description,
          'parentId', ft.parent_id,
          'sortOrder', ft.sort_order,
          'depth', ft.depth,
          'count', COALESCE(fc.test_case_count, 0),
          'createdBy', ft.created_by,
          'createdAt', ft.created_at
        ) ORDER BY ft.sort_path, ft.name
      ),
      '[]'::jsonb
    )
    FROM folder_tree ft
    LEFT JOIN folder_counts fc ON fc.folder_id = ft.id
  );
END;
$$;