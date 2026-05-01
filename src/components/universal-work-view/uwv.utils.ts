// @ts-nocheck
/**
 * Universal Work View — pure utilities. No JSX. No React.
 *
 * Brought to PARITY with src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
 * (Project Backlog table) — uses the canonical <JiraTable> + cell renderers.
 *
 * Read-only mode: cells render their visual chrome only (StatusPill, Avatar,
 * PriorityBars, etc.). No edit affordances since UWV rows are 100% Jira-synced
 * and any inline mutation would immediately error.
 */

import type React from 'react';
import type { LozengeAppearance } from '@/components/shared/JiraTable';
import type { UWVColumn, UWVItem } from './uwv.types';

/** UWV row height — matches BacklogPage compact density. */
export const JIRA_ROW_HEIGHT = 36;

/** Hub source → human label (used by legacy UWVRow / UWVExport). */
export function hubLabel(hub?: string | null): string {
  switch ((hub ?? '').toLowerCase()) {
    case 'projecthub': return 'Project Hub';
    case 'producthub': return 'Product Hub';
    case 'taskhub': return 'Task Hub';
    case 'incidenthub': return 'Incident Hub';
    case 'testhub': return 'Test Hub';
    case 'releasehub': return 'Release Hub';
    default: return hub ?? '—';
  }
}

/** Hub source → accent colour (legacy UWVRow). */
export function hubColour(hub?: string | null): string {
  switch ((hub ?? '').toLowerCase()) {
    case 'projecthub': return 'var(--ds-text-brand, #2563EB)';
    case 'producthub': return '#3F3F46';
    case 'taskhub': return '#D4D4D8';
    case 'incidenthub': return 'var(--ds-text-danger, #DC2626)';
    case 'testhub': return '#0D9488';
    case 'releasehub': return '#7C3AED';
    default: return 'var(--ds-text-subtlest, #64748B)';
  }
}

/** Issue type → hub source bucket (legacy UWVRow). */
export function hubTypeFromIssueType(issueType?: string | null): string {
  const t = (issueType ?? '').toLowerCase();
  if (t.includes('incident')) return 'incidenthub';
  if (t.includes('test')) return 'testhub';
  if (t.includes('task') && !t.includes('sub')) return 'taskhub';
  return 'projecthub';
}
export const JIRA_KEY_COLOR = 'var(--cp-blue)';
export const JIRA_SUMMARY_COLOR = 'var(--fg-1)';

/**
 * Map a raw issue_type string to the StatusPill appearance vocabulary used
 * by JiraTable.makeStatusCell. Mirrors backlog.utils statusAppearance().
 */
export function lozengeAppearance(
  statusCategory: string,
  status?: string,
): LozengeAppearance {
  const cat = (statusCategory ?? '').toLowerCase();
  const st = (status ?? '').toLowerCase();

  if (cat === 'done' || ['done', 'closed', 'resolved', 'complete', 'completed'].includes(st))
    return 'success';
  if (['on hold', 'blocked', 'awaiting info', 'awaiting approval'].includes(st)) return 'moved';
  if (cat === 'to do' || st === 'to do' || st === 'backlog' || st === 'open' || st === 'new')
    return 'default';
  if (
    cat === 'in progress' ||
    cat === 'inprogress' ||
    st.includes('progress') ||
    st.includes('review') ||
    st.includes('qa') ||
    st.includes('uat') ||
    st.includes('develop') ||
    st.includes('ready')
  )
    return 'inprogress';
  return 'default';
}

/**
 * Backlog-style type discriminator for chip filtering and group buckets.
 * Maps Jira issue_type strings to: epic | feature | story | bug | task | other.
 */
export type UWVBacklogType = 'epic' | 'feature' | 'story' | 'bug' | 'task' | 'other';

export function classifyType(issueType?: string | null): UWVBacklogType {
  const t = (issueType ?? '').toLowerCase();
  if (t.includes('epic')) return 'epic';
  if (t.includes('feature')) return 'feature';
  if (t.includes('story')) return 'story';
  if (t.includes('bug') || t.includes('defect') || t.includes('incident')) return 'bug';
  if (t.includes('task') || t.includes('sub')) return 'task';
  return 'other';
}

/** Map UWV issueType to the canonical JiraIssueTypeIcon's `type` prop. */
export function jiraIconType(
  issueType?: string | null,
): 'Epic' | 'Story' | 'Feature' | 'Task' | 'Bug' | 'Sub-task' {
  const k = classifyType(issueType);
  if (k === 'epic') return 'Epic';
  if (k === 'feature') return 'Feature';
  if (k === 'bug') return 'Bug';
  if (k === 'task') return 'Task';
  return 'Story';
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function isOverdue(iso?: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

/** Group-by key vocabulary — mirrors BacklogPage. */
export type UWVGroupBy = 'none' | 'status' | 'priority' | 'parent' | 'assignee' | 'type';

/**
 * Build group buckets for JiraTable.groups. Each bucket carries the rows
 * that match that key's value, with a stable id and human-readable label.
 */
export function buildGroups(
  rows: UWVItem[],
  groupBy: UWVGroupBy,
): { id: string; label: string; rows: UWVItem[] }[] | null {
  if (groupBy === 'none') return null;
  const map = new Map<string, { id: string; label: string; rows: UWVItem[] }>();
  const push = (id: string, label: string, row: UWVItem) => {
    const b = map.get(id);
    if (b) b.rows.push(row);
    else map.set(id, { id, label, rows: [row] });
  };
  for (const r of rows) {
    switch (groupBy) {
      case 'status':
        push(r.status || 'No status', r.status || 'No status', r);
        break;
      case 'priority': {
        const p = (r.priority || '').trim();
        push(p || 'No priority', p ? p[0].toUpperCase() + p.slice(1) : 'No priority', r);
        break;
      }
      case 'parent':
        push(r.parentKey || 'No parent', r.parentKey || 'No parent', r);
        break;
      case 'assignee':
        push(r.assigneeName || 'Unassigned', r.assigneeName || 'Unassigned', r);
        break;
      case 'type': {
        const k = classifyType(r.issueType);
        push(k, k[0].toUpperCase() + k.slice(1), r);
        break;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * COLUMN PARITY with BacklogPage.atlaskit.tsx COLUMNS:
 *   caret · type · KEY · SUMMARY · STATUS · COMMENTS · PARENT · ASSIGNEE · PRIORITY · UPDATED
 *
 * Width values are RECOMMENDED PIXELS (UWVTable still uses px templates,
 * not the JiraTable fractional widths). The JiraTable instance below
 * passes the same columns ids so visibility prefs persist correctly.
 */
export const DEFAULT_COLUMNS: UWVColumn[] = [
  { fieldId: 'key', label: 'Key', width: 120, visible: true, sortable: true, type: 'string' },
  { fieldId: 'summary', label: 'Summary', width: 0, visible: true, sortable: true, type: 'string' },
  { fieldId: 'status', label: 'Status', width: 180, visible: true, sortable: true, type: 'status' },
  { fieldId: 'parent', label: 'Parent', width: 200, visible: true, sortable: false, type: 'string' },
  { fieldId: 'assignee', label: 'Assignee', width: 180, visible: true, sortable: true, type: 'user' },
  { fieldId: 'priority', label: 'Priority', width: 80, visible: true, sortable: true, type: 'string' },
  { fieldId: 'updated', label: 'Updated', width: 110, visible: true, sortable: true, type: 'date' },
  // Optional / hidden by default — kept available via column picker.
  { fieldId: 'comments', label: 'Comments', width: 130, visible: false, sortable: false, type: 'comments' },
  { fieldId: 'dueDate', label: 'Due date', width: 110, visible: false, sortable: true, type: 'date' },
  { fieldId: 'created', label: 'Created', width: 110, visible: false, sortable: true, type: 'date' },
];
