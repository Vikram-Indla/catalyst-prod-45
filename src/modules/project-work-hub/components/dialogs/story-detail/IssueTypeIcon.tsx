/**
 * ⚠️  GUARDRAIL REDIRECT — DO NOT ADD INLINE SVGs HERE
 * 
 * This file delegates to the SINGLE SOURCE OF TRUTH:
 *   src/lib/jira-issue-type-icons.tsx
 * 
 * Any inline SVG icon definitions here will cause icon drift.
 * To change an icon globally, update the SVG file in /admin/icons/jira/.
 */
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export function IssueTypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  return <JiraIssueTypeIcon type={type || 'task'} size={size} />;
}
