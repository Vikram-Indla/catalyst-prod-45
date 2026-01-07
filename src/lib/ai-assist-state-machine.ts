/**
 * AI Assist Draft State Machine
 * 
 * Provides validation and state management for AI Assist drafts.
 * Enforces step prerequisites and document requirements.
 */

import type { AIAssistDocument } from '@/hooks/useAIAssistDocuments';
import type { AIAssistDraft } from '@/hooks/useAIAssistDrafts';
import type { Json } from '@/integrations/supabase/types';

// Step definitions with prerequisites
export const WIZARD_STEPS = [
  { id: 1, name: 'Document Capture', key: 'capture' },
  { id: 2, name: 'AI Analysis', key: 'analysis' },
  { id: 3, name: 'FR Processing', key: 'fr' },
  { id: 4, name: 'Compliance Gate', key: 'compliance' },
  { id: 5, name: 'Clarification', key: 'clarification' },
  { id: 6, name: 'BRD Generation', key: 'brd' },
  { id: 7, name: 'BR Linking', key: 'linking' },
  { id: 8, name: 'Epic Publishing', key: 'publish' },
] as const;

export type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface StepData {
  completedSteps?: number[];
  lastCompletedStep?: number | null;
  evidenceCount?: number;
  frCount?: number;
  epicCount?: number;
  linkedBR?: string;
  oqsGenerated?: boolean;
  oqsAnsweredCount?: number;
  brdArtifactExists?: boolean;
  epicsArtifactExists?: boolean;
  analysisArtifactExists?: boolean;
  frScaffoldExists?: boolean;
  complianceArtifactExists?: boolean;
  quarterSelected?: string;
}

export interface DraftState {
  currentStep: StepId;
  completedSteps: number[];
  lastCompletedStep: number | null;
  progressCount: number;
  hasDocument: boolean;
  documentUploaded: boolean;
  extractionDone: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  qualityMode: 'normal' | 'warn' | null;
  qualityGaps: string[];
}

export interface StateValidationResult {
  isValid: boolean;
  correctedState: Partial<DraftState>;
  corrections: string[];
  warnings: string[];
}

/**
 * Validate and compute the correct state for a draft
 */
export function validateDraftState(
  draft: AIAssistDraft | null,
  documents: AIAssistDocument[],
  artifacts: { type: string; exists: boolean }[] = []
): StateValidationResult {
  const corrections: string[] = [];
  const warnings: string[] = [];
  
  if (!draft) {
    return {
      isValid: true,
      correctedState: {},
      corrections: [],
      warnings: ['No draft provided'],
    };
  }

  const stepData = (draft.step_data as StepData) || {};
  const latestDoc = documents[0];
  
  // Check document state
  const hasDocument = documents.length > 0;
  const documentUploaded = hasDocument && !!latestDoc;
  const extractionDone = latestDoc?.extraction_status === 'completed';
  
  // Build artifact lookup
  const artifactLookup = new Map(artifacts.map(a => [a.type, a.exists]));
  
  // Compute what should be the current state
  let expectedStep: StepId = 1;
  const expectedCompletedSteps: number[] = [];
  
  // RULE A: If no document exists, force step 1
  if (!hasDocument) {
    expectedStep = 1;
    // All metrics must be zero/empty
    if (draft.current_step > 1) {
      corrections.push('Reset to step 1: no document exists');
    }
  } else {
    // Check each step's prerequisites
    
    // Step 1 complete: document upload + extraction done
    if (documentUploaded && extractionDone) {
      expectedCompletedSteps.push(1);
      expectedStep = 2;
    }
    
    // Step 2 complete: analysis artifacts exist
    if (expectedCompletedSteps.includes(1) && artifactLookup.get('analysis')) {
      expectedCompletedSteps.push(2);
      expectedStep = 3;
    }
    
    // Step 3 complete: FR scaffold exists
    if (expectedCompletedSteps.includes(2) && artifactLookup.get('fr_scaffold')) {
      expectedCompletedSteps.push(3);
      expectedStep = 4;
    }
    
    // Step 4 complete: compliance artifact + verdict computed
    if (expectedCompletedSteps.includes(3) && artifactLookup.get('compliance') && draft.compliance_verdict) {
      expectedCompletedSteps.push(4);
      expectedStep = 5;
    }
    
    // Step 5 complete: OQs generated (answered count may be 0 but flags warn)
    if (expectedCompletedSteps.includes(4) && stepData.oqsGenerated) {
      expectedCompletedSteps.push(5);
      expectedStep = 6;
      if ((stepData.oqsAnsweredCount || 0) === 0) {
        warnings.push('Step 5 complete but no OQs answered');
      }
    }
    
    // Step 6 complete: BRD HTML artifact exists
    if (expectedCompletedSteps.includes(5) && artifactLookup.get('brd')) {
      expectedCompletedSteps.push(6);
      expectedStep = 7;
    }
    
    // Step 7 complete: request_key linked in ai_assist_links
    if (expectedCompletedSteps.includes(6) && stepData.linkedBR) {
      expectedCompletedSteps.push(7);
      expectedStep = 8;
    }
    
    // Step 8 complete: epics artifact exists (publish requires quarter selection)
    if (expectedCompletedSteps.includes(7) && artifactLookup.get('epics')) {
      expectedCompletedSteps.push(8);
    }
  }
  
  // Determine if blocked
  const isBlocked = !hasDocument || !extractionDone;
  const blockReason = !hasDocument 
    ? 'Upload a document to begin'
    : !extractionDone
    ? 'Document extraction in progress'
    : null;
  
  // Check for corrections needed
  const currentCompletedSteps = stepData.completedSteps || [];
  const storedStep = draft.current_step || 1;
  
  // Validate stored step against expected
  if (storedStep > expectedStep && !expectedCompletedSteps.includes(storedStep - 1)) {
    corrections.push(`Step ${storedStep} not yet eligible, correcting to ${expectedStep}`);
  }
  
  // Check for orphaned completed steps
  for (const step of currentCompletedSteps) {
    if (!expectedCompletedSteps.includes(step)) {
      corrections.push(`Step ${step} marked complete but prerequisites not met`);
    }
  }
  
  const correctedState: Partial<DraftState> = {
    currentStep: Math.min(storedStep, expectedStep) as StepId,
    completedSteps: expectedCompletedSteps,
    lastCompletedStep: expectedCompletedSteps.length > 0 
      ? Math.max(...expectedCompletedSteps) 
      : null,
    progressCount: expectedCompletedSteps.length,
    hasDocument,
    documentUploaded,
    extractionDone,
    isBlocked,
    blockReason,
    qualityMode: (draft as { quality_mode?: string }).quality_mode as 'normal' | 'warn' | null || null,
    qualityGaps: ((draft as { quality_gaps?: string[] }).quality_gaps || []) as string[],
  };
  
  return {
    isValid: corrections.length === 0,
    correctedState,
    corrections,
    warnings,
  };
}

/**
 * Check if a specific step can be marked as complete
 */
export function canCompleteStep(
  stepId: StepId,
  draft: AIAssistDraft,
  documents: AIAssistDocument[],
  artifacts: { type: string; exists: boolean }[]
): { canComplete: boolean; reason?: string } {
  const latestDoc = documents[0];
  const stepData = (draft.step_data as StepData) || {};
  const artifactLookup = new Map(artifacts.map(a => [a.type, a.exists]));
  
  switch (stepId) {
    case 1:
      if (!latestDoc) return { canComplete: false, reason: 'No document uploaded' };
      if (latestDoc.extraction_status !== 'completed') {
        return { canComplete: false, reason: 'Extraction not complete' };
      }
      return { canComplete: true };
      
    case 2:
      if (!artifactLookup.get('analysis')) {
        return { canComplete: false, reason: 'Analysis artifacts not generated' };
      }
      return { canComplete: true };
      
    case 3:
      if (!artifactLookup.get('fr_scaffold')) {
        return { canComplete: false, reason: 'FR scaffold not generated' };
      }
      return { canComplete: true };
      
    case 4:
      if (!artifactLookup.get('compliance')) {
        return { canComplete: false, reason: 'Compliance check not run' };
      }
      if (!draft.compliance_verdict) {
        return { canComplete: false, reason: 'Compliance verdict not computed' };
      }
      return { canComplete: true };
      
    case 5:
      if (!stepData.oqsGenerated) {
        return { canComplete: false, reason: 'OQs not generated' };
      }
      return { canComplete: true };
      
    case 6:
      if (!artifactLookup.get('brd')) {
        return { canComplete: false, reason: 'BRD artifact not generated' };
      }
      return { canComplete: true };
      
    case 7:
      if (!stepData.linkedBR) {
        return { canComplete: false, reason: 'No BR linked' };
      }
      return { canComplete: true };
      
    case 8:
      if (!artifactLookup.get('epics')) {
        return { canComplete: false, reason: 'Epics artifact not generated' };
      }
      return { canComplete: true };
      
    default:
      return { canComplete: false, reason: 'Unknown step' };
  }
}

/**
 * Handle document replacement - invalidate steps 2-8
 */
export function getInvalidatedStepsOnDocumentReplace(): number[] {
  return [2, 3, 4, 5, 6, 7, 8];
}

/**
 * Compute step data updates when a document is replaced
 */
export function computeDocumentReplacementUpdates(
  currentStepData: StepData,
  oldVersion: number,
  newVersion: number
): { step_data: StepData; current_step: number } {
  return {
    step_data: {
      ...currentStepData,
      completedSteps: currentStepData.completedSteps?.filter(s => s === 1) || [],
      lastCompletedStep: 1,
      // Reset all metrics from subsequent steps
      evidenceCount: undefined,
      frCount: undefined,
      epicCount: undefined,
      linkedBR: undefined,
      oqsGenerated: undefined,
      oqsAnsweredCount: undefined,
      brdArtifactExists: undefined,
      epicsArtifactExists: undefined,
      analysisArtifactExists: undefined,
      frScaffoldExists: undefined,
      complianceArtifactExists: undefined,
    },
    current_step: 1,
  };
}

/**
 * Check if continue button should be enabled
 */
export function getContinueButtonState(
  draftState: DraftState
): { enabled: boolean; label: string; reason?: string } {
  if (draftState.isBlocked) {
    return {
      enabled: false,
      label: 'Blocked',
      reason: draftState.blockReason || 'Prerequisites not met',
    };
  }
  
  if (draftState.progressCount === 0) {
    return {
      enabled: true,
      label: 'Start Wizard',
    };
  }
  
  if (draftState.progressCount >= 8) {
    return {
      enabled: true,
      label: 'Review & Publish',
    };
  }
  
  return {
    enabled: true,
    label: `Continue to Step ${draftState.currentStep}`,
  };
}
