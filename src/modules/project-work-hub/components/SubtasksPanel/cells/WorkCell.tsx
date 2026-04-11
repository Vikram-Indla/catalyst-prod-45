/**
 * WorkCell — Merged cell: issue type icon + key link + summary
 * Jira parity: icon 16px, key underlined blue, summary dark ellipsis
 */
import React from 'react';
import { WORK_ITEM_ICONS } from '../../dialogs/story-detail-modules/constants';

interface WorkCellProps {
  issueType: string;
  issueKey: string;
  summary: string;
  onClick: () => void;
}

export const WorkCell = React.memo(function WorkCell({ issueType, issueKey, summary, onClick }: WorkCellProps) {
  const iconHtml = WORK_ITEM_ICONS[issueType] ?? WORK_ITEM_ICONS.task;

  return (
    <div className="sp-work-cell">
      <span className="sp-type-icon" dangerouslySetInnerHTML={{ __html: iconHtml }} />
      <span className="sp-issue-key" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {issueKey}
      </span>
      <span className="sp-issue-summary">{summary}</span>
    </div>
  );
});
