/**
 * useIncidentHubTimeline — data source for /incident-hub/timeline.
 *
 * 2026-06-17: mirrors useProjectHubTimeline but filters ph_issues by
 * issue_type='Production Incident' across ALL projects (incidents are
 * cross-project in Catalyst). Returns the same TimelineIssue[] tree shape
 * so the canonical TimelineView renders identically.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { TimelineIssue } from './useProjectHubTimeline';

const SELECT_FIELDS =
  'id, issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_display_name, parent_key, raw_json, position, due_date, effective_due_date, jira_created_at, jira_updated_at';

const YEAR_2026_START = '2026-01-01T00:00:00Z';

function extractStartDate(rawJson: any): string | null {
  if (!rawJson?.fields) return null;
  const cf = rawJson.fields.customfield_10015;
  if (cf && typeof cf === 'string') return cf;
  return null;
}

/* 2026-06-17: prefer the dedicated columns over the raw_json fallback.
   Catalyst's detail view writes via `.update({ due_date: ... })` on the
   column, so a timeline that only reads `raw_json.fields.duedate` will
   miss any date set inside the detail view. Coalesce: column first
   (effective_due_date includes parent inheritance), then raw_json. */
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
    issueType: row.issue_type ?? 'Production Incident',
    summary: row.summary ?? '(No title)',
    status: row.status ?? 'Open',
    statusCategory: row.status_category ?? null,
    priority: row.priority ?? null,
    assigneeDisplayName: row.assignee_display_name ?? null,
    assigneeAvatarUrl: resolveAvatarUrl(row.assignee_display_name),
    parentKey: row.parent_key ?? null,
    startDate: extractStartDate(row.raw_json),
    dueDate: extractDueDate(row),
    epicColor: extractEpicColor(row.raw_json),
    fixVersions: extractFixVersions(row.raw_json),
    children: [],
    displayOrder: typeof row.position === 'number' ? row.position : null,
  } as TimelineIssue;
}

function buildTree(issues: TimelineIssue[]): TimelineIssue[] {
  const byKey = new Map<string, TimelineIssue>();
  for (const issue of issues) byKey.set(issue.issueKey, issue);

  const roots: TimelineIssue[] = [];
  for (const issue of issues) {
    if (issue.parentKey && byKey.has(issue.parentKey)) {
      byKey.get(issue.parentKey)!.children.push(issue);
    } else {
      roots.push(issue);
    }
  }

  const orderTuple = (i: TimelineIssue): [number, string] => [
    typeof (i as any).displayOrder === 'number' ? (i as any).displayOrder : Number.POSITIVE_INFINITY,
    i.issueKey,
  ];
  const cmp = (a: TimelineIssue, b: TimelineIssue) => {
    const [ax, az] = orderTuple(a);
    const [bx, bz] = orderTuple(b);
    if (ax !== bx) return ax - bx;
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

export const INCIDENT_TIMELINE_QUERY_KEY = ['incident-hub-timeline'] as const;

export function useIncidentHubTimeline() {
  const { user } = useAuth();

  return useQuery({
    queryKey: INCIDENT_TIMELINE_QUERY_KEY,
    queryFn: async (): Promise<TimelineIssue[]> => {
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select(SELECT_FIELDS)
        .eq('issue_type', 'Production Incident')
        .or(`source.eq.catalyst,jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
        .is('jira_removed_at', null)
        .is('archived_at', null)
        .is('deleted_at', null)
        .order('issue_key', { ascending: true });

      if (error) throw error;
      const mapped = (data ?? []).map(mapRow);
      return buildTree(mapped);
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
