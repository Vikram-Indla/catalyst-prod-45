// ============================================================
// WORKSTREAMS MODULE EXPORTS
// ============================================================

export { WorkstreamsPage } from './WorkstreamsPage';
export { WorkstreamCard } from './WorkstreamCard';
export { WorkstreamsSummaryBar } from './WorkstreamsSummaryBar';
export { WorkstreamsToolbar } from './WorkstreamsToolbar';
export { WorkstreamDetailPanel } from './WorkstreamDetailPanel';
export { EditWorkstreamModal } from './EditWorkstreamModal';
export { HealthIndicator } from './HealthIndicator';
export { useWorkstreamsSummary } from './useWorkstreamsSummary';
export { 
  useWorkstreamDetails, 
  useWorkstreamMembers, 
  useAvailableResources, 
  useUpdateWorkstream, 
  useAddWorkstreamMember, 
  useRemoveWorkstreamMember,
  useArchiveWorkstream,
  type WorkstreamMember 
} from './useWorkstreamMutations';
export type { WorkstreamData, WorkstreamsSummary } from './types';
