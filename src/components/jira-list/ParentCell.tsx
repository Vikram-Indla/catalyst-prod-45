import React from 'react';
import type { ParentCellProps } from './jira-list.types';

/** Parent column cell — renders the parent key as a clickable button; null when no parent. */
export function ParentCell({ issue, onOpen }: ParentCellProps) {
  if (!issue.parent) return null;

  return (
    <button
      type="button"
      className="catalyst-parent-cell"
      onClick={() => onOpen(issue.parent!.key)}
      aria-label={`Open parent issue ${issue.parent.key}: ${issue.parent.summary}`}
      title={issue.parent.summary}
    >
      {issue.parent.key}
    </button>
  );
}
