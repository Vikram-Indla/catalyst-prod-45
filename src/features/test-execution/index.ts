/**
 * Test Execution Feature Module
 * Module 3A-1: Execution Session Manager + Step Focus Mode
 * Module 3A-2: Step-by-Step Runner UI
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
export * from './types/step-execution';

// Hooks
export { useExecutionRun } from './hooks/useExecutionRun';
export { useExecutionRuns } from './hooks/useExecutionRuns';
export { useRunMutations } from './hooks/useRunMutations';
export { useRunProgress } from './hooks/useRunProgress';

// Components
export { RunProgressCard } from './components/RunProgressCard';
export { CreateRunDialog } from './components/CreateRunDialog';
export { TesterAssignment } from './components/TesterAssignment';
export { RunConfigPanel } from './components/RunConfigPanel';
export { RunSessionManager } from './components/RunSessionManager';

// ============================================================
// Module 3A-2: Step-by-Step Runner UI
// ============================================================

// Hooks
export { useTestExecution } from './hooks/useTestExecution';
export { useExecutionTimer } from './hooks/useExecutionTimer';
export { useStepResultMutation } from './hooks/useStepResultMutation';
export { useExecutionKeyboard } from './hooks/useExecutionKeyboard';
export { useStepNavigationV2 } from './hooks/useStepNavigationV2';

// Components
export {
  StepRunner,
  StepDisplay,
  StepResultButtons,
  StepProgressBar,
  StepNotes,
  ExecutionHeader,
  CompletionDialog,
  ExitDialog,
} from './components/runner';

// ============================================================
// Module 3A-3: Result Recording & Evidence
// ============================================================

// Types (EvidenceType exported from step-execution, use specific exports to avoid conflict)
export type { EvidenceFile, UploadProgress } from './types/evidence';

// Hooks
export { useStepEvidence } from './hooks/useStepEvidence';
export { useFileUpload } from './hooks/useFileUpload';
export { useClipboardPaste } from './hooks/useClipboardPaste';
export { useDragDrop } from './hooks/useDragDrop';

// Components
export {
  ResultRecorder,
  ActualResultInput,
  EvidenceUploader,
  EvidenceGallery,
  EvidencePreview,
  ComparisonView,
  UploadProgressDisplay,
} from './components/evidence';
