/**
 * Execution Store - Zustand state management for Step Focus Mode
 */

import { create } from 'zustand';

export type StepStatus = 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface Evidence {
  id: string;
  type: 'screenshot' | 'file';
  name: string;
  url?: string;
}

export interface StepResult {
  stepOrder: number;
  status: StepStatus;
  note?: string;
  evidence: Evidence[];
  markedAt?: Date;
}

export interface StepDisplay {
  id: string;
  number: number;
  title: string;
  action: string;
  expected: string;
  status: StepStatus;
}

export interface ExecutionSession {
  runId: string;
  testCaseId: string;
  testCaseTitle: string;
  currentStepIndex: number;
  startedAt: Date;
  elapsedSeconds: number;
  stepResults: StepResult[];
  evidence: Evidence[];
  notes: string;
  defects: string[];
}

interface ExecutionStore {
  // Session
  session: ExecutionSession | null;
  steps: StepDisplay[];
  
  // Current State
  currentStepIndex: number;
  isComplete: boolean;
  
  // Timer
  elapsedSeconds: number;
  isTimerRunning: boolean;
  
  // UI
  showDefectPrompt: boolean;
  defectPromptStepIndex: number | null;
  
  // Actions
  initSession: (testCaseId: string, testCaseTitle: string, steps: StepDisplay[]) => void;
  initSessionFromDb: (
    runId: string,
    testCaseId: string,
    testCaseKey: string,
    testCaseTitle: string,
    steps: StepDisplay[],
    dbStepResults: Array<{ stepResultId: string; stepId: string; status: StepStatus; actualResult?: string }>
  ) => void;
  markStep: (status: 'passed' | 'failed' | 'blocked') => void;
  skipStep: () => void;
  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Evidence & Notes
  addNote: (stepIndex: number, note: string) => void;
  addEvidence: (stepIndex: number, evidence: Evidence) => void;
  removeEvidence: (stepIndex: number, evidenceId: string) => void;
  
  // Defect prompt
  dismissDefectPrompt: () => void;
  
  // Timer
  tick: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  toggleTimer: () => void;
  
  // Reset
  reset: () => void;
  
  // DB sync helpers
  getStepResultId: (stepIndex: number) => string | undefined;
  dbStepResultIds: string[];
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  // Initial state
  session: null,
  steps: [],
  currentStepIndex: 0,
  isComplete: false,
  elapsedSeconds: 0,
  isTimerRunning: false,
  showDefectPrompt: false,
  defectPromptStepIndex: null,
  dbStepResultIds: [],
  
  initSession: (testCaseId, testCaseTitle, steps) => {
    const stepResults: StepResult[] = steps.map((_, i) => ({
      stepOrder: i,
      status: 'pending' as StepStatus,
      evidence: [],
    }));
    
    set({
      session: {
        runId: `run-${Date.now()}`,
        testCaseId,
        testCaseTitle,
        currentStepIndex: 0,
        startedAt: new Date(),
        elapsedSeconds: 0,
        stepResults,
        evidence: [],
        notes: '',
        defects: [],
      },
      steps: steps.map(s => ({ ...s, status: 'pending' as StepStatus })),
      currentStepIndex: 0,
      isComplete: false,
      elapsedSeconds: 0,
      isTimerRunning: true,
      showDefectPrompt: false,
      defectPromptStepIndex: null,
      dbStepResultIds: [],
    });
  },

  initSessionFromDb: (runId, testCaseId, testCaseKey, testCaseTitle, steps, dbStepResults) => {
    const stepResults: StepResult[] = steps.map((step, i) => {
      const dbResult = dbStepResults[i];
      return {
        stepOrder: i,
        status: dbResult?.status || 'pending' as StepStatus,
        evidence: [],
        note: dbResult?.actualResult,
      };
    });

    // Find first pending step to resume from
    const firstPendingIndex = steps.findIndex(s => s.status === 'pending');
    const resumeIndex = firstPendingIndex >= 0 ? firstPendingIndex : 0;

    set({
      session: {
        runId,
        testCaseId,
        testCaseTitle,
        currentStepIndex: resumeIndex,
        startedAt: new Date(),
        elapsedSeconds: 0,
        stepResults,
        evidence: [],
        notes: '',
        defects: [],
      },
      steps,
      currentStepIndex: resumeIndex,
      isComplete: steps.every(s => s.status !== 'pending'),
      elapsedSeconds: 0,
      isTimerRunning: true,
      showDefectPrompt: false,
      defectPromptStepIndex: null,
      dbStepResultIds: dbStepResults.map(r => r.stepResultId),
    });
  },

  getStepResultId: (stepIndex) => {
    const { dbStepResultIds } = get();
    return dbStepResultIds[stepIndex];
  },
  
  markStep: (status) => {
    const { currentStepIndex, steps, session } = get();
    if (!session) return;
    
    const newSteps = [...steps];
    newSteps[currentStepIndex] = { ...newSteps[currentStepIndex], status };
    
    const newStepResults = [...session.stepResults];
    newStepResults[currentStepIndex] = {
      ...newStepResults[currentStepIndex],
      status,
      markedAt: new Date(),
    };
    
    const showDefect = status === 'failed';
    
    set({
      steps: newSteps,
      session: { ...session, stepResults: newStepResults },
      showDefectPrompt: showDefect,
      defectPromptStepIndex: showDefect ? currentStepIndex : null,
    });
    
    // Auto-advance after delay
    setTimeout(() => {
      const state = get();
      if (state.currentStepIndex < state.steps.length - 1) {
        set({ 
          currentStepIndex: state.currentStepIndex + 1,
          showDefectPrompt: false,
        });
      } else {
        // Check if all steps complete
        const allComplete = state.steps.every(s => s.status !== 'pending');
        if (allComplete) {
          set({ isComplete: true, showDefectPrompt: false });
        }
      }
    }, 600);
  },
  
  skipStep: () => {
    const { currentStepIndex, steps, session } = get();
    if (!session) return;
    
    const newSteps = [...steps];
    newSteps[currentStepIndex] = { ...newSteps[currentStepIndex], status: 'skipped' };
    
    const newStepResults = [...session.stepResults];
    newStepResults[currentStepIndex] = {
      ...newStepResults[currentStepIndex],
      status: 'skipped',
      markedAt: new Date(),
    };
    
    set({
      steps: newSteps,
      session: { ...session, stepResults: newStepResults },
    });
    
    // Advance to next step
    setTimeout(() => {
      const state = get();
      if (state.currentStepIndex < state.steps.length - 1) {
        set({ currentStepIndex: state.currentStepIndex + 1 });
      } else {
        const allComplete = state.steps.every(s => s.status !== 'pending');
        if (allComplete) {
          set({ isComplete: true });
        }
      }
    }, 300);
  },
  
  goToStep: (index) => {
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index, showDefectPrompt: false });
    }
  },
  
  nextStep: () => {
    const { currentStepIndex, steps } = get();
    const currentStep = steps[currentStepIndex];
    // Only allow next if current step has a result
    if (currentStep.status !== 'pending' && currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1, showDefectPrompt: false });
    }
  },
  
  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1, showDefectPrompt: false });
    }
  },
  
  addNote: (stepIndex, note) => {
    const { session } = get();
    if (!session) return;
    
    const newStepResults = [...session.stepResults];
    newStepResults[stepIndex] = { ...newStepResults[stepIndex], note };
    
    set({ session: { ...session, stepResults: newStepResults } });
  },
  
  addEvidence: (stepIndex, evidence) => {
    const { session } = get();
    if (!session) return;
    
    const newStepResults = [...session.stepResults];
    newStepResults[stepIndex] = {
      ...newStepResults[stepIndex],
      evidence: [...newStepResults[stepIndex].evidence, evidence],
    };
    
    set({ session: { ...session, stepResults: newStepResults } });
  },
  
  removeEvidence: (stepIndex, evidenceId) => {
    const { session } = get();
    if (!session) return;
    
    const newStepResults = [...session.stepResults];
    newStepResults[stepIndex] = {
      ...newStepResults[stepIndex],
      evidence: newStepResults[stepIndex].evidence.filter(e => e.id !== evidenceId),
    };
    
    set({ session: { ...session, stepResults: newStepResults } });
  },
  
  dismissDefectPrompt: () => {
    set({ showDefectPrompt: false, defectPromptStepIndex: null });
  },
  
  tick: () => {
    const { isTimerRunning } = get();
    if (isTimerRunning) {
      set(state => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }
  },
  
  startTimer: () => set({ isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),
  toggleTimer: () => set(state => ({ isTimerRunning: !state.isTimerRunning })),
  
  reset: () => set({
    session: null,
    steps: [],
    currentStepIndex: 0,
    isComplete: false,
    elapsedSeconds: 0,
    isTimerRunning: false,
    showDefectPrompt: false,
    defectPromptStepIndex: null,
  }),
}));
