/**
 * ⚠️  GUARDRAIL REDIRECT — DO NOT ADD INLINE SVGs HERE
 * 
 * This file delegates to the SINGLE SOURCE OF TRUTH:
 *   src/lib/jira-issue-type-icons.tsx
 */
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export function IssueTypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  return <JiraIssueTypeIcon type={type || 'task'} size={size} />;
}
