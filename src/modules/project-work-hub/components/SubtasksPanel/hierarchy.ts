/**
 * Parent → allowed-child-type rules for SubtasksPanel.
 *
 * CANONICAL SOURCE: all rules derive from parent-rules.ts (confirmed Vikram 2026-06-12).
 * Do NOT add hardcoded type arrays here — extend parent-rules.ts instead.
 */
import { getAllowedChildTypes } from '@/components/catalyst-detail-views/shared/parent-rules';

export type WorkItemType = string;

/**
 * Return the ordered list of allowed child issue types for a given parent type.
 * Empty array means "creation is blocked" (e.g. Sub-task → no further children).
 * The first element (if any) is the sensible default selection.
 */
export function allowedChildTypes(parentType: string | null | undefined): WorkItemType[] {
  return getAllowedChildTypes(parentType);
}

/**
 * Panel title — Jira uses "Child work items" under Epics and "Subtasks"
 * under story-level items.
 */
export function panelTitleFor(parentType: string | null | undefined): string {
  const p = (parentType ?? '').trim().toLowerCase();
  if (p === 'epic' || p === 'feature' || p === 'new feature' || p === 'business request') {
    return 'Child work items';
  }
  return 'Subtasks';
}

/**
 * Is creation of any child allowed under this parent?
 */
export function canCreateChild(parentType: string | null | undefined): boolean {
  return allowedChildTypes(parentType).length > 0;
}
