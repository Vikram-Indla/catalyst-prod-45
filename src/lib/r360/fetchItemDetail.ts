import { supabase } from '@/integrations/supabase/client';

export interface ItemDetailFull {
  id: string;
  key: string;
  title: string;
  status: string;
  statusCategory: string;
  priority: string;
  type: string;
  projectName: string;
  projectKey: string;
  assigneeName: string;
  assignedAt: string;
  dueDate: string | null;
  releaseName: string | null;
  parentKey: string | null;
  parentName: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  sprintName: string | null;
}

/**
 * Calculate days sitting from assigned date.
 * If resolved, caps at resolve date.
 */
export function calcDaysSitting(assignedAt: string, resolution?: string | null): number {
  const start = new Date(assignedAt);
  const end = resolution ? new Date() : new Date(); // ph_issues has no resolved_at; use now
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export async function fetchItemDetail(issueKey: string): Promise<ItemDetailFull | null> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(`
      issue_key,
      summary,
      status,
      status_category,
      priority,
      issue_type,
      due_date,
      jira_created_at,
      assignee_display_name,
      project_name,
      project_key,
      parent_key,
      parent_summary,
      resolution,
      sprint_name,
      fix_versions
    `)
    .eq('issue_key', issueKey)
    .maybeSingle();

  if (error || !data) {
    console.error('[R360 Drawer] fetchItemDetail error:', error);
    return null;
  }

  // Extract first fix_version name as release
  let releaseName: string | null = null;
  if (data.fix_versions && Array.isArray(data.fix_versions) && data.fix_versions.length > 0) {
    const fv = data.fix_versions[0] as any;
    releaseName = typeof fv === 'string' ? fv : fv?.name ?? null;
  }

  return {
    id: data.issue_key,
    key: data.issue_key,
    title: data.summary,
    status: data.status,
    statusCategory: data.status_category ?? 'To Do',
    priority: data.priority ?? '—',
    type: data.issue_type,
    projectName: data.project_name ?? '—',
    projectKey: data.project_key,
    assigneeName: data.assignee_display_name ?? '—',
    assignedAt: data.jira_created_at ?? new Date().toISOString(),
    dueDate: data.due_date ?? null,
    releaseName,
    parentKey: data.parent_key ?? null,
    parentName: data.parent_summary ?? null,
    resolvedAt: null,
    resolution: data.resolution ?? null,
    sprintName: data.sprint_name ?? null,
  };
}
