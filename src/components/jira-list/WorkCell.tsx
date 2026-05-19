import React from 'react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import type { WorkCellProps } from './jira-list.types';
import { depthPadding } from './jira-list.utils';

/**
 * Work column cell: [type icon] [key] [summary text]
 * Matches Jira's BAU list view "Work" column (CLAUDE.md 2026-05-17 — no standalone type column).
 */
export function WorkCell({ issue, onOpen }: WorkCellProps) {
  const indent = depthPadding(issue.depth);

  return (
    <div
      className="catalyst-work-cell"
      style={{ paddingLeft: indent > 0 ? indent : undefined }}
    >
      <span className="catalyst-work-cell__icon" data-issue-type={issue.issueType.name}>
        <WorkItemTypeIcon type={issue.issueType.name} size={16} />
      </span>

      <button
        type="button"
        className="catalyst-work-cell__key"
        onClick={() => onOpen(issue.key)}
        aria-label={`Open issue ${issue.key}`}
      >
        {issue.key}
      </button>

      <span className="catalyst-work-cell__summary" title={issue.summary}>
        {issue.summary}
      </span>
    </div>
  );
}
