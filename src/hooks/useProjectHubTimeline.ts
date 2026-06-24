import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { resolveAvatarUrl } from '@/lib/avatars';
import { extractSprint, extractRelease } from '@/components/shared/Timeline/dependencies/scheduleFields';

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
  sprintEndDate: string | null;
  sprintName: string | null;
  releaseDate: string | null;
  releaseName: string | null;
  children: TimelineIssue[];
  /** Synthetic, non-interactive bucket header (e.g. "Story – 33 work items")
   *  collecting parentless base-level items. Renders as a collapsible group
   *  in the sidebar with no Gantt bar, no menu, no detail view. */
  isGroup?: boolean;
}

const SELECT_FIELDS =
  'id, issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_display_name, parent_key, raw_json, due_date, effective_due_date, jira_created_at, jira_updated_at';

const YEAR_2026_START = '2026-01-01T00:00:00Z';

function extractStartDate(rawJson: any): string | null {
  if (!rawJson?.fields) return null;
  // customfield_10015 = start date in Jira (used in DATA project)
  const cf = rawJson.fields.customfield_10015;
  if (cf && typeof cf === 'string') return cf;
  return null;
}

/* 2026-06-17: prefer the dedicated columns over the raw_json fallback.
   Detail-view writes use `.update({ due_date: ... })` on the column —
   a timeline that only reads `raw_json.fields.duedate` will miss them. */
function extractDueDate(row: any): string | null {
  if (row?.effective_due_date && typeof row.effective_due_date === 'string') return row.effective_due_date;
  if (row?.due_date && typeof row.due_date === 'string') return row.due_date;
  const due = row?.raw_json?.fields?.duedate;
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
    dueDate: extractDueDate(row),
    epicColor: extractEpicColor(row.raw_json),
    fixVersions: extractFixVersions(row.raw_json),
    sprintEndDate: extractSprint(row.raw_json).endDate,
    sprintName: extractSprint(row.raw_json).name,
    releaseDate: extractRelease(row.raw_json).date,
    releaseName: extractRelease(row.raw_json).name,
    children: [],
    displayOrder: typeof row.position === 'number' ? row.position : null,
  };
}

export function buildTree(issues: TimelineIssue[]): TimelineIssue[] {
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

  // Jira parity: parentless base-level items (anything that isn't an Epic or
  // Feature container) collapse into one "Story – N work items" bucket that
  // sits below the epic/feature roots, instead of floating as flat roots.
  const CONTAINER_TYPES = new Set(['Epic', 'Feature']);
  const containers = roots.filter(r => CONTAINER_TYPES.has(r.issueType));
  const orphans = roots.filter(r => !CONTAINER_TYPES.has(r.issueType));
  if (orphans.length === 0) return roots;

  const bucket: TimelineIssue = {
    id: '__group-story',
    issueKey: '__GROUP-STORY__',
    projectKey: orphans[0].projectKey,
    issueType: 'Story',
    summary: 'Story',
    status: '',
    statusCategory: null,
    priority: null,
    assigneeDisplayName: null,
    assigneeAvatarUrl: null,
    parentKey: null,
    startDate: null,
    dueDate: null,
    epicColor: null,
    fixVersions: [],
    sprintEndDate: null,
    sprintName: null,
    releaseDate: null,
    releaseName: null,
    children: orphans,
    isGroup: true,
  };
  return [...containers, bucket];
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
