/**
 * cloneIncludeMatrix — Jira-parity per-work-type "Include" catalog for the
 * Clone modal, plus the purple "cloning-in-progress" icon used by the
 * progress flag.
 *
 * Jira shows different Include checkboxes based on the source item's type:
 *   - Epic:              Attachments, Child work items, Links
 *   - Business Request:  Attachments, Comments
 *   - Story/Task/Subtask: (none — everything cloned silently)
 *   - Bug/Defect/Incident/Feature: Attachments, Comments   (Catalyst default,
 *                                                            mirrors BR pattern)
 *
 * Extending: add a lowercase issue_type key + IncludeKey[] to CLONE_INCLUDE_MATRIX.
 * Missing keys fall back to CLONE_INCLUDE_DEFAULT (Attachments + Comments).
 */
import React from 'react';
import InfoIcon from '@atlaskit/icon/core/information';
import SuccessIcon from '@atlaskit/icon/core/check-circle';
import ErrorIcon from '@atlaskit/icon/core/error';

export type IncludeKey =
  | 'attachments'
  | 'subtasks'
  | 'child_work_items'
  | 'links'
  | 'comments';

export const CLONE_INCLUDE_LABELS: Record<IncludeKey, string> = {
  attachments:      'Attachments',
  subtasks:         'Sub-tasks',
  child_work_items: 'Child work items',
  links:            'Links',
  comments:         'Comments',
};

/** Per-type matrix. Keys are lowercased issue_type strings. */
export const CLONE_INCLUDE_MATRIX: Record<string, IncludeKey[]> = {
  epic:               ['attachments', 'child_work_items', 'links'],
  'business request': ['attachments', 'comments'],
  business_request:   ['attachments', 'comments'],
  story:              [],
  task:               [],
  subtask:            [],
  'sub-task':         [],
  bug:                ['attachments', 'comments'],
  'qa bug':           ['attachments', 'comments'],
  defect:             ['attachments', 'comments'],
  incident:           ['attachments', 'comments'],
  'production incident': ['attachments', 'comments'],
  feature:            ['attachments', 'comments'],
  'new feature':      ['attachments', 'comments'],
};

const CLONE_INCLUDE_DEFAULT: IncludeKey[] = ['attachments', 'comments'];

export function getCloneIncludeKeys(issueType: string | null | undefined): IncludeKey[] {
  if (!issueType) return CLONE_INCLUDE_DEFAULT;
  const key = issueType.trim().toLowerCase();
  const matrix = CLONE_INCLUDE_MATRIX[key];
  return matrix !== undefined ? matrix : CLONE_INCLUDE_DEFAULT;
}

/**
 * Coloured-icon components for the three Clone flags. Rendered inside an
 * `appearance="normal"` (white-card) ADS `<Flag>` so the icon carries the
 * semantic colour — matches Jira's clone notification style, and the
 * release-hub `catalystToast.show({type:'success'})` visual pattern used at
 * `/release-hub/releases-management`.
 */
export function CloningInProgressIcon() {
  return (
    <span style={{ display: 'inline-flex', color: 'var(--ds-icon-discovery, var(--ds-text-brand))' }}>
      <InfoIcon label="" LEGACY_size="medium" color="currentColor" />
    </span>
  );
}

export function CloneSuccessIcon() {
  return (
    <span style={{ display: 'inline-flex', color: 'var(--ds-icon-success)' }}>
      <SuccessIcon label="" LEGACY_size="medium" color="currentColor" />
    </span>
  );
}

export function CloneErrorIcon() {
  return (
    <span style={{ display: 'inline-flex', color: 'var(--ds-icon-danger)' }}>
      <ErrorIcon label="" LEGACY_size="medium" color="currentColor" />
    </span>
  );
}
