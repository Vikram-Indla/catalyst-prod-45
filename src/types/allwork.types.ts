/**
 * Unified work item type for AllWork components.
 * Normalizes both wh_ table data and ph_issues fallback into a single shape
 * that all UI components consume.
 */
export interface AllWorkItem {
  id: string;
  issue_key: string;
  project_key: string | null;
  issue_type: string;
  summary: string;
  description_text: string | null;
  status: string;
  status_category: string | null;
  status_color: string | null;
  status_id: string | null;
  priority: string;
  parent_key: string | null;
  parent_summary: string | null;
  assignee_display_name: string | null;
  assignee_id: string | null;
  assignee_avatar: string | null;
  reporter_name: string | null;
  labels: string[];
  fix_version_name: string | null;
  comment_count: number;
  attachment_count: number;
  child_count: number;
  story_points: number | null;
  sprint_name: string | null;
  resolution: string | null;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  icon_color: string | null;
  icon_glyph: string | null;
  work_type_id: string | null;
  rank: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  _source?: 'wh' | 'ph_issues';
}

/**
 * Normalize any raw service row (wh_ or ph_issues mapped) into AllWorkItem.
 * Handles both field naming conventions.
 */
export function normalizeWorkItem(raw: any): AllWorkItem {
  return {
    id: raw.id ?? raw.issue_key ?? '',
    issue_key: raw.item_key ?? raw.issue_key ?? '',
    project_key: raw.project_key ?? null,
    issue_type: raw.work_type_name ?? raw.issue_type ?? '',
    summary: raw.summary ?? '',
    description_text: raw.description ?? raw.description_text ?? null,
    status: raw.status_name ?? raw.status ?? '',
    status_category: raw.status_category ?? null,
    status_color: raw.status_color ?? null,
    status_id: raw.status_id ?? null,
    priority: raw.priority ?? 'Medium',
    parent_key: raw.parent_key ?? null,
    parent_summary: raw.parent_summary ?? null,
    assignee_display_name: raw.assignee_name ?? raw.assignee_display_name ?? null,
    assignee_id: raw.assignee_id ?? null,
    assignee_avatar: raw.assignee_avatar ?? null,
    reporter_name: raw.reporter_name ?? null,
    labels: raw.labels ?? [],
    fix_version_name: raw.fix_version_name ?? null,
    comment_count: raw.comment_count ?? 0,
    attachment_count: raw.attachment_count ?? 0,
    child_count: raw.child_count ?? 0,
    story_points: raw.story_points ?? null,
    sprint_name: raw.sprint_name ?? null,
    resolution: raw.resolution ?? null,
    jira_created_at: raw.created_at ?? raw.jira_created_at ?? null,
    jira_updated_at: raw.updated_at ?? raw.jira_updated_at ?? null,
    icon_color: raw.icon_color ?? null,
    icon_glyph: raw.icon_glyph ?? null,
    work_type_id: raw.work_type_id ?? null,
    rank: raw.rank ?? null,
    is_flagged: raw.is_flagged ?? false,
    flag_reason: raw.flag_reason ?? null,
    _source: raw._source === 'ph_issues' ? 'ph_issues' : 'wh',
  };
}
