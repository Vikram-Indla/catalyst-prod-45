/**
 * PH Issue Type Icon — Bridge file
 * Re-exports from the canonical guardrail: src/lib/jira-issue-type-icons.tsx
 * DO NOT add icon definitions here.
 */
import React from 'react';
import { JiraIssueTypeIcon, getJiraTypeColor } from '@/lib/jira-issue-type-icons';
import type { IssueType } from '@/types/project-hub.types';

/** Left-border accent color per type — delegates to canonical */
export const TYPE_ACCENT: Record<IssueType, string> = {
  epic: getJiraTypeColor('epic'),
  feature: getJiraTypeColor('feature'),
  story: getJiraTypeColor('story'),
  task: getJiraTypeColor('task'),
  bug: getJiraTypeColor('QA Bug'),
  subtask: getJiraTypeColor('Sub-task'),
};

interface Props {
  type: IssueType | string;
  size?: number;
}

export function PHIssueTypeIcon({ type, size = 16 }: Props) {
  return <JiraIssueTypeIcon type={type} size={size} />;
}
