import { useMemo } from 'react';
import type { WorkItem } from '@/types/workhub';

export interface JQLValuePool {
  status: string[];
  assignee: string[];
  reporter: string[];
  issuetype: string[];
  priority: string[];
  labels: string[];
  sprint: string[];
  resolution: string[];
  fixVersion: string[];
  statusCategory: string[];
  project: string[];
}

const JIRA_ACCOUNT_ID_RE = /^[a-f0-9]{20,}$|^\d+:[a-f0-9-]{30,}$/;

function collect(items: WorkItem[], getter: (item: WorkItem) => string | string[] | null | undefined): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const val = getter(item);
    if (Array.isArray(val)) {
      for (const v of val) { if (typeof v === 'string' && v.trim()) seen.add(v.trim()); }
    } else if (typeof val === 'string' && val.trim()) {
      seen.add(val.trim());
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/**
 * Build a JQL autocomplete value pool from pre-fetched WorkItem data.
 *
 * This avoids a second Supabase query — the caller passes the same
 * `facetItems` array it already has from `useProjectFacetItems`.
 */
export function useJQLValuePool(items: WorkItem[], projectKey: string | undefined): JQLValuePool {
  return useMemo(() => {
    if (!items.length) {
      return {
        status: [], assignee: [], reporter: [], issuetype: [],
        priority: [], labels: [], sprint: [], resolution: [],
        fixVersion: [], statusCategory: [], project: [],
      };
    }

    const assignees = collect(items, i => i.assignee?.name)
      .filter(name =>
        name.length > 1 &&
        !name.includes('@') &&
        !JIRA_ACCOUNT_ID_RE.test(name) &&
        name !== 'Unassigned'
      );

    const reporters = collect(items, i => i.reporter?.name)
      .filter(name =>
        name.length > 1 &&
        !name.includes('@') &&
        !JIRA_ACCOUNT_ID_RE.test(name)
      );

    return {
      status:         collect(items, i => i.statusName),
      assignee:       assignees,
      reporter:       reporters,
      issuetype:      collect(items, i => i.rawType),
      priority:       collect(items, i => i.priority as string),
      labels:         collect(items, i => i.labels),
      sprint:         collect(items, i => i.sprintName),
      resolution:     collect(items, i => i.resolution),
      fixVersion:     collect(items, i => i.sprintRelease ? [i.sprintRelease] : []),
      statusCategory: collect(items, i => i.statusCategory as string),
      project:        projectKey ? [projectKey] : [],
    };
  }, [items, projectKey]);
}
