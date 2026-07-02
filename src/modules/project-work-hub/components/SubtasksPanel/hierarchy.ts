/**
 * Parent → allowed-child-type rules for SubtasksPanel.
 *
 * CANONICAL SOURCE: all rules derive from parent-rules.ts (confirmed Vikram 2026-06-12).
 * Do NOT add hardcoded type arrays here — extend parent-rules.ts instead.
 */
import {
  getAllowedChildTypes,
  getAllowedChildTypesWithRegistry,
  type RegistryWorkItemType,
  type RegistryParentRule,
} from '@/lib/catalyst-rules';

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
 * Resolve the allowed child types for a panel, honouring an optional
 * per-surface override. A non-empty `override` array wins verbatim and
 * bypasses the shared ALLOWED_CHILD_TYPES map — used by the Business
 * Request detail view to scope its picker to the 5 subtask categories
 * (BRD Task, Business Gap, Change Request, UAT Finding, Figma) WITHOUT
 * changing the canonical hierarchy for any other surface (Q1, 2026-06-15).
 * An empty/absent override falls back to the canonical parent→child rules.
 *
 * Registry fallback (CRE + ph_hierarchy_parent_rules, 20260703130000): when
 * the Studio registry rows are supplied, custom (non-CRE) parent types
 * resolve their children from the registry, and custom child types appear
 * under system parents. Grid B stays authoritative for system types.
 */
export function resolveAllowedChildTypes(
  parentType: string | null | undefined,
  override?: string[] | null,
  registryTypes?: readonly RegistryWorkItemType[] | null,
  parentRules?: readonly RegistryParentRule[] | null,
): WorkItemType[] {
  if (override && override.length > 0) return override;
  return getAllowedChildTypesWithRegistry(parentType, registryTypes, parentRules);
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
