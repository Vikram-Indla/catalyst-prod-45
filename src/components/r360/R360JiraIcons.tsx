/**
 * R360 Jira Icons — Bridge file
 * Re-exports from the canonical guardrail: src/lib/jira-issue-type-icons.tsx
 * DO NOT add icon definitions here.
 */
import React from 'react';
import { JiraIssueTypeIcon, resolveJiraTypeConfig } from '@/lib/jira-issue-type-icons';

// Legacy named exports for backward compatibility
export const JiraBugIcon = () => <JiraIssueTypeIcon type="QA Bug" />;
export const JiraTaskIcon = () => <JiraIssueTypeIcon type="Task" />;
export const JiraStoryIcon = () => <JiraIssueTypeIcon type="Story" />;
export const JiraEpicIcon = () => <JiraIssueTypeIcon type="Epic" />;
export const JiraSubtaskIcon = () => <JiraIssueTypeIcon type="Sub-task" />;

/** Fuzzy match — delegates to canonical resolver */
export function getJiraIcon(type: string) {
  return <JiraIssueTypeIcon type={type} />;
}
