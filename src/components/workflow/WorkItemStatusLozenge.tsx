/**
 * WorkItemStatusLozenge — Jira-parity status pill for cards/rows/columns.
 *
 * Given a WorkItem (from types/workItem.types), it:
 *   1. Maps the legacy lowercase `WorkItemType` → canonical `IssueType`
 *      so the workflow engine can be consulted.
 *   2. Finds the matching `WorkflowState` by name so we get Jira's exact
 *      6-category colour (default/inprogress/success/removed/new/moved).
 *   3. Falls back to the legacy 3-category `statusCategory` if the item
 *      is outside any workflow binding (e.g. Task/Subtask/Improvement).
 *
 * Use this ANYWHERE a card/row/column shows a status pill — AllWork list,
 * AllWork table, Kanban columns, Create-issue preview, etc. — so the
 * colours and labels stay in lockstep with the admin-edited workflows.
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { useWorkflow } from '../../lib/workflows';
import type { IssueType, StatusCategory } from '../../lib/workflows/types';
import type { WorkItem, WorkItemType } from '../../types/workItem.types';

const APPEARANCE_MAP: Record<StatusCategory, 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved'> = {
  default:    'default',
  inprogress: 'inprogress',
  success:    'success',
  removed:    'removed',
  new:        'new',
  moved:      'moved',
};

/** Map the legacy lowercase WorkItemType to the workflow engine's IssueType. */
export function workItemTypeToIssueType(type: WorkItemType): IssueType | undefined {
  switch (type) {
    case 'story':       return 'Story';
    case 'feature':     return 'Feature';
    case 'epic':        return 'Epic';
    case 'bug':         return 'Defect';
    case 'task':
    case 'subtask':
    case 'improvement': return undefined; // outside the 3 bound workflows
    default:            return undefined;
  }
}

/** 3-category → 6-category fallback when no workflow state is found. */
function legacyToCategory(statusCategory: 'todo' | 'in_progress' | 'done'): StatusCategory {
  if (statusCategory === 'in_progress') return 'inprogress';
  if (statusCategory === 'done') return 'success';
  return 'default';
}

function toSlug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export interface WorkItemStatusLozengeProps {
  item: WorkItem;
  variant?: 'bold' | 'subtle';
  maxWidth?: number;
}

export function WorkItemStatusLozenge({ item, variant = 'bold', maxWidth }: WorkItemStatusLozengeProps) {
  return (
    <StatusLozengeByType
      issueType={item.type}
      statusName={item.statusName || item.status}
      statusCategory={item.statusCategory}
      variant={variant}
      maxWidth={maxWidth}
    />
  );
}

/**
 * StatusLozengeByType — Lower-level primitive used by WorkItemStatusLozenge.
 *
 * Accepts loose/stringly-typed inputs (matches the AllWorkItem shape from
 * ph_issues / the Supabase view) and renders a Jira-parity lozenge whose
 * colour comes from the workflow engine when a matching state is found.
 */
export interface StatusLozengeByTypeProps {
  /** Issue type string — accepts lowercase WorkItemType ("bug", "epic") OR
   *  already-canonical IssueType ("Defect", "Epic"). Case-insensitive. */
  issueType: string | undefined | null;
  /** Current status display name, e.g. "In Progress". */
  statusName: string | undefined | null;
  /** Legacy 3-category hint used when no workflow match is found. */
  statusCategory?: 'todo' | 'in_progress' | 'done' | string | null;
  variant?: 'bold' | 'subtle';
  maxWidth?: number;
}

export function StatusLozengeByType({
  issueType,
  statusName,
  statusCategory,
  variant = 'bold',
  maxWidth,
}: StatusLozengeByTypeProps) {
  const lc = (issueType ?? '').toLowerCase();
  // Accept both shapes — lowercase WorkItemType or canonical IssueType
  const wfIssueType: IssueType | undefined =
    (['Story','Feature','Epic','Integration','Frontend','Backend','Design','Defect','Production Incident'] as IssueType[])
      .find(t => t.toLowerCase() === lc) ??
    workItemTypeToIssueType(lc as WorkItemType);

  const workflow = useWorkflow(wfIssueType);

  const displayName = statusName || '—';
  const matchedState = workflow
    ? workflow.states.find(s => s.name.toLowerCase() === displayName.toLowerCase())
      ?? workflow.states.find(s => s.id === toSlug(displayName))
    : undefined;

  const fallbackCategory: StatusCategory =
    statusCategory === 'in_progress' ? 'inprogress' :
    statusCategory === 'done' ? 'success' :
    'default';
  const category: StatusCategory = matchedState?.category ?? fallbackCategory;
  const label = matchedState?.name ?? displayName;

  return (
    <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
      <Lozenge
        appearance={APPEARANCE_MAP[category]}
        isBold={variant === 'bold'}
        maxWidth={maxWidth}
      >
        {label}
      </Lozenge>
    </span>
  );
}
