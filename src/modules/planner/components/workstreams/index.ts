// ============================================================
// WORKSTREAMS MODULE EXPORTS
// ============================================================

// V10 (new default) - export V10 components and hooks
export * from './v10';
// Re-export the V10 page as the default WorkstreamsPage
export { WorkstreamsPageV10 as WorkstreamsPage } from './v10';

// Legacy exports (for backward compatibility) - use distinct names to avoid collision
export { WorkstreamsPage as WorkstreamsPageLegacy } from './WorkstreamsPage';
export { WorkstreamCard } from './WorkstreamCard';
export { WorkstreamsSummaryBar } from './WorkstreamsSummaryBar';
export { WorkstreamsToolbar } from './WorkstreamsToolbar';
export { WorkstreamDetailPanel } from './WorkstreamDetailPanel';
export { EditWorkstreamModal } from './EditWorkstreamModal';
export { CreateWorkstreamModal } from './CreateWorkstreamModal';
export { HealthIndicator } from './HealthIndicator';
export { useWorkstreamsSummary } from './useWorkstreamsSummary';
export { useCreateWorkstream } from './useCreateWorkstream';
export { useSearchProfiles } from './useSearchProfiles';
export { useUpdateMemberRole } from './useUpdateMemberRole';
export { 
  useWorkstreamDetails, 
  useWorkstreamMembers, 
  useUpdateWorkstream, 
  useAddWorkstreamMember, 
  useRemoveWorkstreamMember,
  useArchiveWorkstream,
  type WorkstreamMember 
} from './useWorkstreamMutations';
export type { WorkstreamData, WorkstreamsSummary } from './types';
