/**
 * Shared Quality Gate Hooks — Re-exports from release quality gates
 * 
 * ReleaseHub OWNS quality gate CRUD. TestHub and other modules
 * can consume read-only hooks for gate status visibility.
 */

export {
  // Read hooks
  useReleaseQualityGates,
  useReleaseTestSummary,
  useGateHistory,
  useGateTemplates,
  // Write hooks (ReleaseHub ownership)
  useCreateQualityGate,
  useUpdateQualityGate,
  useDeleteQualityGate,
  useEvaluateQualityGates,
  useWaiveQualityGate,
  useApplyGateTemplate,
} from '@/hooks/releases/useReleaseQualityGates';

// Types
export type {
  QualityGate,
  GateEvaluationResult,
  ReleaseTestSummary,
  GateEvaluation,
  GateHistoryEntry,
} from '@/hooks/releases/useReleaseQualityGates';
