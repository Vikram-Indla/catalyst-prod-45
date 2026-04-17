/**
 * LinkedWorkItems — public barrel.
 *
 * Only the orchestrator + shared types are re-exported. Sub-components are
 * intentionally private to this folder; any consumer that needs a custom
 * composition imports them directly. This keeps the rollout surface minimal
 * while the BAU-4771 pilot is still proving itself.
 */
export { LinkedWorkItems, default } from './LinkedWorkItems';
export type { LinkedWorkItemsProps } from './LinkedWorkItems';
export type { LinkedWorkItem, LinkedWorkItemTarget, LinkTypeOption } from './types';
