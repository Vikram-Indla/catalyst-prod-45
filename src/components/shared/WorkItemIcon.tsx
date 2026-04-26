/**
 * WorkItemIcon — DEPRECATED ALIAS for JiraIssueTypeIcon.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🛡️  CANONICAL SOURCE OF TRUTH (Apr 26, 2026)
 * ═══════════════════════════════════════════════════════════════════════
 * ALL work-item type icons in Catalyst MUST resolve through
 * `src/lib/jira-issue-type-icons.tsx` (JiraIssueTypeIcon component +
 * resolveJiraTypeConfig resolver). This file used to ship hand-rolled
 * inline SVGs that diverged from Atlassian's canonical glyph set —
 * Business Request showed as a red lightning-bolt instead of an amber
 * lightbulb, the bug glyph was a 6-arm asterisk instead of the
 * Atlassian filled circle, and `normalizeIconType` aliased
 * `business_request → business_gap` (wrong category).
 *
 * To repair every legacy call site without a giant find-replace, this
 * module is now a thin shim that forwards to JiraIssueTypeIcon. The
 * `WorkItemIconType` union is preserved as an alias for back-compat.
 * `normalizeIconType` is preserved as an identity-trim shim so existing
 * `<WorkItemIcon type={normalizeIconType(t)} />` patterns keep working.
 *
 * NEW CODE MUST IMPORT FROM `@/lib/jira-issue-type-icons` DIRECTLY:
 *
 *   import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
 *   <JiraIssueTypeIcon type={issue.issue_type ?? 'Task'} size={16} />
 *
 * An ESLint rule (`no-restricted-imports`) blocks new imports of this
 * file outside the shim itself; CI will fail any PR that adds one.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

/** @deprecated Use the raw issue_type string with JiraIssueTypeIcon. */
export type WorkItemIconType =
  | 'api_requirement'
  | 'backend'
  | 'business_gap'
  | 'business_request'
  | 'change_request'
  | 'epic'
  | 'feature'
  | 'figma'
  | 'frontend'
  | 'integration'
  | 'production_incident'
  | 'bug'
  | 'story'
  | 'subtask'
  | 'task';

interface WorkItemIconProps {
  /**
   * Work-item type. Accepts both legacy snake_case keys ("production_incident")
   * and Jira display names ("Production Incident", "Sub-task"). Routed
   * through resolveJiraTypeConfig so all aliases collapse to the right glyph.
   */
  type: WorkItemIconType | string;
  size?: number;
  className?: string;
}

/**
 * @deprecated Use `JiraIssueTypeIcon` from `@/lib/jira-issue-type-icons`.
 *
 * Forwards the call directly. JiraIssueTypeIcon's resolver fuzzy-matches
 * snake_case + spaced + hyphenated forms equivalently, so passing a
 * legacy `'production_incident'` produces the same glyph as `'Production
 * Incident'`.
 */
export default function WorkItemIcon({ type, size = 16, className }: WorkItemIconProps) {
  // Normalize snake_case → Jira display so the resolver's word-aware
  // fuzzy matcher hits cleanly ("production_incident" → "production incident").
  const normalized = typeof type === 'string' ? type.replace(/[_-]+/g, ' ') : 'Task';
  return <JiraIssueTypeIcon type={normalized} size={size} className={className} />;
}

/**
 * @deprecated The new resolver fuzzy-matches all legacy aliases automatically.
 * This shim returns the input untouched (after a trim) and exists only so
 * legacy `normalizeIconType(t)` call sites keep compiling. Drop the call
 * and pass `t` directly to JiraIssueTypeIcon.
 */
export function normalizeIconType(raw: string | undefined | null): string {
  return (raw ?? 'Task').toString().trim() || 'Task';
}
