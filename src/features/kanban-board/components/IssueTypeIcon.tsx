/**
 * IssueTypeIcon — thin wrapper over Catalyst's canonical JiraIssueTypeIcon
 * (the locked /admin/icons registry, single source of truth for type glyphs).
 */
import React from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface Props {
  issueType: string | null | undefined;
  size?: number;
}

export const IssueTypeIcon: React.FC<Props> = ({ issueType, size = 16 }) => {
  if (!issueType) return null; // unknown type → render nothing (no lie)
  return <JiraIssueTypeIcon type={issueType} size={size} />;
};
