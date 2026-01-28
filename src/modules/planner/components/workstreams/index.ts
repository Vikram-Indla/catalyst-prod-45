// ============================================================
// WORKSTREAMS MODULE EXPORTS
// ============================================================

// V10 (new default)
export { WorkstreamsPageV10 as WorkstreamsPage } from './v10';
export * from './v10';

// Legacy exports (for backward compatibility)
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
