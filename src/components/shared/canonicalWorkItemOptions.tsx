import React from 'react';
import { JiraIssueTypeIcon, PROTECTED_ISSUE_TYPE_OPTIONS, getJiraTypeLabel } from '@/lib/jira-issue-type-icons';

export interface CanonicalWorkItemOption {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export const CANONICAL_WORK_ITEM_OPTIONS: CanonicalWorkItemOption[] = PROTECTED_ISSUE_TYPE_OPTIONS.map((type) => ({
  key: type,
  label: getJiraTypeLabel(type),
  icon: <JiraIssueTypeIcon type={type} size={16} />,
}));
