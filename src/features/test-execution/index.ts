/**
 * Test Execution Feature Module
 * Module 3A-1: Execution Session Manager + Step Focus Mode
 */

// ============================================================
// Step Focus Mode Exports (existing)
// ============================================================
export { default as TestExecutionFocusPage } from './TestExecutionPage';
export { useExecutionStore } from './stores/executionStore';
export { useTimer } from './hooks/useTimer';
export { useStepNavigation } from './hooks/useStepNavigation';
export { useExecutionSession, useUpdateStepResult, useCompleteExecution, useSaveExecutionProgress } from './hooks/useExecutionSession';

// ============================================================
// Module 3A-1: Execution Session Manager
// ============================================================

// Types
export * from './types/test-execution';

// Hooks
export { useExecutionRun } from './hooks/useExecutionRun';
export { useExecutionRuns } from './hooks/useExecutionRuns';
export { useRunMutations } from './hooks/useRunMutations';
export { useRunProgress } from './hooks/useRunProgress';

// Components
export { RunProgressCard } from './components/RunProgressCard';
export { CreateRunDialog } from './components/CreateRunDialog';
export { TesterAssignment } from './components/TesterAssignment';
export { RunSessionManager } from './components/RunSessionManager';
