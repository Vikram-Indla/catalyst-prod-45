
-- Drop and recreate both functions with profiles instead of auth.users
DROP FUNCTION IF EXISTS hi_get_project_work_items(uuid, int, uuid, int, int);
DROP FUNCTION IF EXISTS hi_get_hierarchy_tree(uuid);

-- Recreate hi_get_project_work_items
CREATE OR REPLACE FUNCTION hi_get_project_work_items(
    p_project_id uuid, p_hierarchy_level int default null,
    p_status_id uuid default null, p_limit int default 100, p_offset int default 0
)
RETURNS TABLE (
    id uuid, key text, title text, hierarchy_level int, hierarchy_name text,
    hierarchy_color text, hierarchy_color_text text, parent_id uuid, parent_key text,
    status_id uuid, status_name text, status_color text, status_color_text text, status_is_terminal boolean,
    assignee_id uuid, assignee_email text, assignee_display_name text,
    priority_id uuid, priority_name text, priority_color text, priority_color_text text,
    fix_version_id uuid, fix_version_name text,
    total_descendants bigint, completed_count bigint,
    due_date date, labels text[], created_at timestamptz, updated_at timestamptz
) AS $$
SELECT wi.id, wi.key, wi.title, wi.hierarchy_level,
    hl.name, hl.color, hl.color_text, wi.parent_id,
    pw.key as parent_key,
    wi.status_id, st.name, st.color, st.color_text, st.is_terminal,
    wi.assignee_id, p.email, coalesce(p.full_name, p.email),
    wi.priority_id, pri.name, pri.color, pri.color_text,
    wi.fix_version_id, pv.name,
    0::bigint, 0::bigint,
    wi.due_date, wi.labels, wi.created_at, wi.updated_at
FROM hi_work_items wi
LEFT JOIN hi_work_items pw ON pw.id = wi.parent_id
LEFT JOIN hi_hierarchy_levels hl ON hl.id = wi.hierarchy_level
LEFT JOIN hi_statuses st ON st.id = wi.status_id
LEFT JOIN hi_priorities pri ON pri.id = wi.priority_id
LEFT JOIN profiles p ON p.id = wi.assignee_id
LEFT JOIN hi_project_versions pv ON pv.id = wi.fix_version_id
WHERE wi.project_id = p_project_id
  AND (p_hierarchy_level IS NULL OR wi.hierarchy_level = p_hierarchy_level)
  AND (p_status_id IS NULL OR wi.status_id = p_status_id)
ORDER BY wi.updated_at DESC LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- Recreate hi_get_hierarchy_tree
CREATE OR REPLACE FUNCTION hi_get_hierarchy_tree(p_root_id uuid)
RETURNS TABLE (
    id uuid, key text, title text, hierarchy_level int, parent_id uuid, root_id uuid,
    status_id uuid, status_name text, status_color text, status_color_text text, status_is_terminal boolean,
    assignee_id uuid, assignee_email text, assignee_display_name text,
    priority_name text, priority_color text, priority_color_text text,
    fix_version_id uuid, fix_version_name text,
    hierarchy_color text, hierarchy_color_text text, hierarchy_name text,
    total_descendants bigint, completed_count bigint,
    due_date date, labels text[], created_at timestamptz, updated_at timestamptz
) AS $$
WITH RECURSIVE tree AS (
    SELECT wi.*, st.name AS status_name, st.color AS status_color, st.color_text AS status_color_text,
        st.is_terminal AS status_is_terminal,
        p.email AS assignee_email,
        coalesce(p.full_name, p.email) AS assignee_display_name,
        pri.name AS priority_name, pri.color AS priority_color, pri.color_text AS priority_color_text,
        pv.name AS fix_version_name,
        hl.color AS hierarchy_color, hl.color_text AS hierarchy_color_text, hl.name AS hierarchy_name,
        1 AS depth
    FROM hi_work_items wi
    LEFT JOIN hi_statuses st ON st.id = wi.status_id
    LEFT JOIN profiles p ON p.id = wi.assignee_id
    LEFT JOIN hi_priorities pri ON pri.id = wi.priority_id
    LEFT JOIN hi_project_versions pv ON pv.id = wi.fix_version_id
    LEFT JOIN hi_hierarchy_levels hl ON hl.id = wi.hierarchy_level
    WHERE wi.id = p_root_id
    UNION ALL
    SELECT wi.*, st.name, st.color, st.color_text, st.is_terminal,
        p.email, coalesce(p.full_name, p.email),
        pri.name, pri.color, pri.color_text, pv.name,
        hl.color, hl.color_text, hl.name, t.depth + 1
    FROM hi_work_items wi
    JOIN tree t ON wi.parent_id = t.id
    LEFT JOIN hi_statuses st ON st.id = wi.status_id
    LEFT JOIN profiles p ON p.id = wi.assignee_id
    LEFT JOIN hi_priorities pri ON pri.id = wi.priority_id
    LEFT JOIN hi_project_versions pv ON pv.id = wi.fix_version_id
    LEFT JOIN hi_hierarchy_levels hl ON hl.id = wi.hierarchy_level
    WHERE wi.root_id = p_root_id
),
stats AS (
    SELECT t.parent_id, count(*) AS cnt,
        count(*) FILTER (WHERE t.status_is_terminal = true) AS completed
    FROM tree t WHERE t.parent_id IS NOT NULL GROUP BY t.parent_id
)
SELECT t.id, t.key, t.title, t.hierarchy_level, t.parent_id, t.root_id,
    t.status_id, t.status_name, t.status_color, t.status_color_text, t.status_is_terminal,
    t.assignee_id, t.assignee_email, t.assignee_display_name,
    t.priority_name, t.priority_color, t.priority_color_text,
    t.fix_version_id, t.fix_version_name,
    t.hierarchy_color, t.hierarchy_color_text, t.hierarchy_name,
    coalesce(s.cnt, 0), coalesce(s.completed, 0),
    t.due_date, t.labels, t.created_at, t.updated_at
FROM tree t LEFT JOIN stats s ON s.parent_id = t.id
ORDER BY t.depth, t.created_at;
$$ LANGUAGE sql STABLE;
