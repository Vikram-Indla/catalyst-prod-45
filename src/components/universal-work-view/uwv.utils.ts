// @ts-nocheck
/**
 * Universal Work View — pure utilities. No JSX. No React.
 *
 * Verified against live Jira DOM at
 * https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list
 */

import type { UWVColumn } from './uwv.types';

// VERIFIED from Jira DOM — key colour is rgb(80,82,88) dark grey, not blue.
export const JIRA_KEY_COLOR = '#505258';
export const JIRA_SUMMARY_COLOR = '#29292E'; // rgb(41,42,46)
export const JIRA_ROW_HEIGHT = 40;

export function lozengeAppearance(
  statusCategory: string,
  status?: string,
): 'default' | 'success' | 'removed' | 'inprogress' | 'moved' | 'new' {
  const cat = (statusCategory ?? '').toLowerCase();
  const st = (status ?? '').toLowerCase();

  // Done category OR done-equivalent status names
  if (cat === 'done' || ['done', 'closed', 'resolved', 'complete', 'completed'].includes(st))
    return 'success';

  // In progress category
  if (cat === 'in progress' || cat === 'inprogress') return 'inprogress';

  // Blocked statuses
  if (['on hold', 'blocked', 'awaiting info', 'awaiting approval'].includes(st)) return 'moved';

  // To do
  if (cat === 'to do' || st === 'to do' || st === 'backlog') return 'default';

  // Custom "in progress-like" names
  if (
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

export function hubLabel(hub: string): string {
  const map: Record<string, string> = {
    projecthub: 'ProjectHub',
    producthub: 'ProductHub',
    incidenthub: 'IncidentHub',
    testhub: 'TestHub',
  };
  return map[hub] ?? hub;
}

export function hubColour(hub: string): { bg: string; text: string } {
  switch (hub) {
    case 'projecthub':
      return { bg: '#E9F2FF', text: '#0747A6' };
    case 'producthub':
      return { bg: '#EAE6FF', text: '#403294' };
    case 'incidenthub':
      return { bg: '#FFEBE6', text: '#BF2600' };
    case 'testhub':
      return { bg: '#E3FCEF', text: '#006644' };
    default:
      return { bg: '#F4F5F7', text: '#42526E' };
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function isOverdue(iso?: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

/** First name only — used in the assignee column for visual density. */
export function firstName(name?: string | null): string {
  if (!name) return '—';
  return name.split(/\s+/)[0] ?? name;
}

/**
 * VERIFIED column order against Jira list DOM:
 * checkbox | type+chevron | key | summary | status | comments | assignee | hub | (+ add)
 *
 * The leading checkbox cell + trailing "+" cell are rendered by UWVTable directly,
 * not as columns in this list.
 */
export const DEFAULT_COLUMNS: UWVColumn[] = [
  { fieldId: 'type', label: 'Type', width: 80, visible: true, sortable: false, type: 'type-icon' },
  { fieldId: 'key', label: 'Key', width: 110, visible: true, sortable: true, type: 'string' },
  { fieldId: 'summary', label: 'Summary', width: 380, visible: true, sortable: true, type: 'string' },
  { fieldId: 'status', label: 'Status', width: 160, visible: true, sortable: true, type: 'status' },
  { fieldId: 'comments', label: 'Comments', width: 130, visible: true, sortable: false, type: 'comments' },
  { fieldId: 'assignee', label: 'Assignee', width: 170, visible: true, sortable: true, type: 'user' },
  { fieldId: 'hubSource', label: 'Hub', width: 110, visible: true, sortable: false, type: 'hub' },
  { fieldId: 'dueDate', label: 'Due date', width: 110, visible: false, sortable: true, type: 'date' },
  { fieldId: 'priority', label: 'Priority', width: 90, visible: false, sortable: true, type: 'string' },
  { fieldId: 'created', label: 'Created', width: 110, visible: false, sortable: true, type: 'date' },
  { fieldId: 'updated', label: 'Updated', width: 110, visible: false, sortable: true, type: 'date' },
  { fieldId: 'parentKey', label: 'Parent', width: 100, visible: false, sortable: false, type: 'string' },
];

/**
 * Map a raw issue_type string from ph_issues to the canonical WorkItemIcon
 * iconType. Done here (not in WorkItemIcon) so the work-item-icon registry
 * stays immutable per CLAUDE.md §11.
 */
export function mapIssueTypeToIcon(issueType?: string | null): string {
  const t = (issueType ?? '').toLowerCase().trim();
  if (!t) return 'task';
  if (t === 'epic') return 'epic';
  if (t === 'story' || t === 'user story') return 'story';
  if (t === 'bug' || t === 'defect' || t === 'qa bug') return 'bug';
  if (t === 'subtask' || t === 'sub-task') return 'subtask';
  if (t === 'task' || t === 'improvement') return 'task';
  if (t === 'incident' || t === 'production_incident' || t === 'production incident') {
    return 'production_incident';
  }
  if (t === 'mdt' || t === 'initiative') return 'feature';
  return 'task';
}
