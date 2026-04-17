/**
 * IssueTypeCell — canonical issue-type icon cell.
 *
 * Defined now so Chunk D can split the legacy Work cell into three
 * independent columns (Type / Key / Summary) without file churn.
 *
 * Uses CLAUDE.md §11 canonical JiraIssueTypeIcon — the single source of
 * truth for every work-item-type glyph across Catalyst. We do NOT import
 * @atlaskit/icon for these glyphs because the canonical set deliberately
 * uses Jira's own SVGs, not Atlaskit's generic icon library.
 */
import React from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { getJiraTypeLabel } from '@/lib/jira-issue-type-icons';

interface IssueTypeCellProps {
  issueType: string;
  size?: number;
}

export const IssueTypeCell = React.memo(function IssueTypeCell({
  issueType, size = 16,
}: IssueTypeCellProps) {
  return (
    <span className="sp-type-icon" title={getJiraTypeLabel(issueType)}>
      <JiraIssueTypeIcon type={issueType} size={size} />
    </span>
  );
});
