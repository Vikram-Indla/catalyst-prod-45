/**
 * Kanban Board — Utility functions
 */
import type { BoardIssue, GroupByMode, GroupBucket, ColMap } from './kanban-types';

const PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export function groupIssues(issues: BoardIssue[], mode: GroupByMode): GroupBucket[] {
  if (mode === 'none') return [];
  const buckets = new Map<string, { label: string; ids: string[] }>();

  for (const issue of issues) {
    let key: string, label: string;
    switch (mode) {
      case 'assignee':
        key = issue.assigneeName || 'UNASSIGNED';
        label = issue.assigneeName || 'Unassigned';
        break;
      case 'epic':
        key = issue.parentKey || 'NO_EPIC';
        label = issue.parentKey ? (issue.parentSummary || issue.parentKey) : 'No Epic';
        break;
      case 'priority':
        key = issue.priority || 'NO_PRIORITY';
        label = issue.priority || 'No priority';
        break;
      case 'fixVersion':
        key = issue.fixVersion || 'NO_FIX_VERSION';
        label = issue.fixVersion || 'No fix version';
        break;
      default:
        key = '__all__'; label = '';
    }
    if (!buckets.has(key)) buckets.set(key, { label, ids: [] });
    buckets.get(key)!.ids.push(issue.id);
  }

  const entries = Array.from(buckets.entries());

  if (mode === 'priority') {
    entries.sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a[1].label);
      const bi = PRIORITY_ORDER.indexOf(b[1].label);
      return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
    });
  } else if (mode === 'assignee') {
    entries.sort((a, b) => {
      if (a[0] === 'UNASSIGNED') return 1;
      if (b[0] === 'UNASSIGNED') return -1;
      return a[1].label.localeCompare(b[1].label);
    });
  } else if (mode === 'epic') {
    entries.sort((a, b) => {
      if (a[0] === 'NO_EPIC') return 1;
      if (b[0] === 'NO_EPIC') return -1;
      return b[1].ids.length - a[1].ids.length;
    });
  } else if (mode === 'fixVersion') {
    entries.sort((a, b) => {
      if (a[0] === 'NO_FIX_VERSION') return 1;
      if (b[0] === 'NO_FIX_VERSION') return -1;
      return a[1].label.localeCompare(b[1].label);
    });
  }

  return entries.map(([key, val]) => ({ groupKey: key, groupLabel: val.label, issueIds: val.ids }));
}

export function findCol(m: ColMap, id: string): string | null {
  for (const c of Object.keys(m)) {
    if (m[c].includes(id)) return c;
  }
  return null;
}
