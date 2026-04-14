/**
 * WorkCell — Merged cell: issue type icon + key link + summary
 * Jira parity: icon 16px, key underlined blue, summary dark ellipsis
 */
import React from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface WorkCellProps {
  issueType: string;
  issueKey: string;
  summary: string;
  onClick: () => void;
}

export const WorkCell = React.memo(function WorkCell({ issueType, issueKey, summary, onClick }: WorkCellProps) {
  return (
    <div className="sp-work-cell">
      <span className="sp-type-icon"><JiraIssueTypeIcon type={issueType} size={16} /></span>
      <span className="sp-issue-key" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {issueKey}
      </span>
      <span className="sp-issue-summary">{summary}</span>
    </div>
  );
});
