/**
 * LinkedWorkItems — public barrel.
 *
 * Canonical entry point: `LinkedWorkItemsSection`. Every detail view
 * across Catalyst imports this and nothing else. It bundles the
 * AtlaskitBoundary + legacy-section fallback so feature code never has
 * to reason about runtime Atlaskit failures.
 *
 * `LinkedWorkItems` (orchestrator) is still exported for tests and for
 * rare consumers that need a custom boundary strategy. New feature code
 * must not import it directly — use `LinkedWorkItemsSection`.
 */
export { LinkedWorkItemsSection, default } from './LinkedWorkItemsSection';
export type { LinkedWorkItemsSectionProps } from './LinkedWorkItemsSection';
export { LinkedWorkItems } from './LinkedWorkItems';
export type { LinkedWorkItemsProps } from './LinkedWorkItems';
export type { LinkedWorkItem, LinkedWorkItemTarget, LinkTypeOption } from './types';
