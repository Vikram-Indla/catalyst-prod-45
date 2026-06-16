import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { resolveAvatarUrl } from '@/lib/avatars';

export interface TimelineIssue {
  id: string;
  issueKey: string;
  projectKey: string;
  issueType: string;
  summary: string;
  status: string;
  statusCategory: string | null;
  priority: string | null;
  assigneeDisplayName: string | null;
  assigneeAvatarUrl: string | null;
  parentKey: string | null;
  startDate: string | null;
  dueDate: string | null;
  epicColor: string | null;
  fixVersions: string[];
  children: TimelineIssue[];
}

const SELECT_FIELDS =
  'id, issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_display_name, parent_key, raw_json, position, jira_created_at, jira_updated_at';

const YEAR_2026_START = '2026-01-01T00:00:00Z';

function extractStartDate(rawJson: any): string | null {
  if (!rawJson?.fields) return null;
  // customfield_10015 = start date in Jira (used in DATA project)
  const cf = rawJson.fields.customfield_10015;
  if (cf && typeof cf === 'string') return cf;
  return null;
}

function extractDueDate(rawJson: any): string | null {
  if (!rawJson?.fields) return null;
  const due = rawJson.fields.duedate;
  if (due && typeof due === 'string') return due;
  return null;
}

function extractEpicColor(rawJson: any): string | null {
  return rawJson?.fields?.catalyst_color ?? null;
}

function extractFixVersions(rawJson: any): string[] {
  const fv = rawJson?.fields?.fixVersions;
  if (!Array.isArray(fv)) return [];
  return fv.map((v: any) => v?.name ?? '').filter(Boolean);
}

function mapRow(row: any): TimelineIssue {
  return {
    id: row.id,
    issueKey: row.issue_key,
    projectKey: row.project_key,
    issueType: row.issue_type ?? 'Task',
    summary: row.summary ?? '(No title)',
    status: row.status ?? 'Backlog',
    statusCategory: row.status_category ?? null,
    priority: row.priority ?? null,
    assigneeDisplayName: row.assignee_display_name ?? null,
    assigneeAvatarUrl: resolveAvatarUrl(row.assignee_display_name),
    parentKey: row.parent_key ?? null,
    startDate: extractStartDate(row.raw_json),
    dueDate: extractDueDate(row.raw_json),
    epicColor: extractEpicColor(row.raw_json),
    fixVersions: extractFixVersions(row.raw_json),
    children: [],
    displayOrder: typeof row.position === 'number' ? row.position : null,
  };
}

function buildTree(issues: TimelineIssue[]): TimelineIssue[] {
  const byKey = new Map<string, TimelineIssue>();
  for (const issue of issues) {
    byKey.set(issue.issueKey, issue);
  }

  const roots: TimelineIssue[] = [];
  for (const issue of issues) {
    if (issue.parentKey && byKey.has(issue.parentKey)) {
      byKey.get(issue.parentKey)!.children.push(issue);
    } else {
      roots.push(issue);
    }
  }

  // Sort roots: epics first, then by user-controlled rank (displayOrder),
  // then by issue key. Children sort by displayOrder within their parent.
  const orderTuple = (i: TimelineIssue): [number, number, string] => [
    i.issueType === 'Epic' ? 0 : 1,
    typeof i.displayOrder === 'number' ? i.displayOrder : Number.POSITIVE_INFINITY,
    i.issueKey,
  ];
  const cmp = (a: TimelineIssue, b: TimelineIssue) => {
    const [ax, ay, az] = orderTuple(a);
    const [bx, by, bz] = orderTuple(b);
    if (ax !== bx) return ax - bx;
    if (ay !== by) return ay - by;
    return az.localeCompare(bz);
  };
  roots.sort(cmp);
  const sortChildren = (list: TimelineIssue[]) => {
    list.sort(cmp);
    for (const n of list) if (n.children.length) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

export function useProjectHubTimeline(projectKey: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-hub-timeline', projectKey],
    queryFn: async (): Promise<TimelineIssue[]> => {
      if (!projectKey) return [];

      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select(SELECT_FIELDS)
        .eq('project_key', projectKey)
        .or(`source.eq.catalyst,jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
        .is('jira_removed_at', null)
        .is('archived_at', null)
        .is('deleted_at', null)
        .order('issue_key', { ascending: true });

      if (error) throw error;
      const mapped = (data ?? []).map(mapRow);
      return buildTree(mapped);
    },
    enabled: !!projectKey && !!user,
    staleTime: 30_000,
  });
}
