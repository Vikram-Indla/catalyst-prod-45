import { useMemo } from 'react';
import type { AIAssistDocument } from './useAIAssistDocuments';
import type { AIAssistArtifact, ArtifactType } from './useAIAssistArtifacts';
import type { AIAssistRun } from './useAIAssistRuns';

// Gate statuses
export type GateStatus = 'pending' | 'complete' | 'failed' | 'blocked';

// Quality modes per JOB-152
export type QualityMode = 'pass' | 'warn' | 'block';

// Evidence gate result for a single stage
export interface GateResult {
  stage: number;
  name: string;
  status: GateStatus;
  reason?: string;
  requiredArtifacts?: ArtifactType[];
  missingArtifacts?: ArtifactType[];
}

// Overall gate state
export interface EvidenceGatesState {
  gates: GateResult[];
  qualityMode: QualityMode;
  canProceedToStep: (step: number) => boolean;
  isStepComplete: (step: number) => boolean;
  isApprovalRequired: boolean;
  blockingReasons: string[];
  warningReasons: string[];
}

// Input for the hook
export interface EvidenceGatesInput {
  documents: AIAssistDocument[];
  artifacts: AIAssistArtifact[];
  latestRun: AIAssistRun | null;
  manualTextUsed?: boolean;
  exemptionsCount?: number;
  openQuestionsCount?: number;
  approvalStatus?: string;
}

// Stage definitions with required artifacts
const STAGE_DEFINITIONS: { 
  stage: number; 
  name: string; 
  requiredArtifacts?: ArtifactType[];
  checkFn?: (input: EvidenceGatesInput) => { complete: boolean; reason?: string };
}[] = [
  {
    stage: 1,
    name: 'Capture',
    checkFn: (input) => {
      const doc = input.documents[0];
      if (!doc) return { complete: false, reason: 'No document uploaded' };
      if (!doc.file_sha256) return { complete: false, reason: 'PDF SHA-256 not computed' };
      if (!doc.pdf_page_count && !doc.pages_total) return { complete: false, reason: 'PDF page count not determined' };
      return { complete: true };
    }
  },
  {
    stage: 2,
    name: 'Extraction',
    checkFn: (input) => {
      const doc = input.documents[0];
      if (!doc) return { complete: false, reason: 'No document' };
      
      // Check canonical_text artifact OR manual_text artifact
      const hasCanonicalText = doc.extracted_text && doc.extracted_text.length > 0;
      const hasManualText = input.manualTextUsed;
      
      if (hasCanonicalText || hasManualText) {
        return { complete: true };
      }
      
      if (doc.extraction_status === 'failed') {
        return { complete: false, reason: 'Extraction failed - use manual paste' };
      }
      
      if (doc.extraction_status === 'processing') {
        return { complete: false, reason: 'Extraction in progress' };
      }
      
      return { complete: false, reason: 'No extracted text available' };
    }
  },
  {
    stage: 3,
    name: 'Analysis',
    requiredArtifacts: ['evidence'],
  },
  {
    stage: 4,
    name: 'Compliance',
    requiredArtifacts: ['compliance_report'],
  },
  {
    stage: 5,
    name: 'Questions',
    requiredArtifacts: ['open_questions'],
  },
  {
    stage: 6,
    name: 'BRD',
    requiredArtifacts: ['brd'],
  },
  {
    stage: 7,
    name: 'Epics',
    requiredArtifacts: ['epics'],
  },
  {
    stage: 8,
    name: 'Summary',
    requiredArtifacts: ['summary_pdf'],
  },
];

export function useEvidenceGates(input: EvidenceGatesInput): EvidenceGatesState {
  const { 
    documents, 
    artifacts, 
    latestRun,
    manualTextUsed = false,
    exemptionsCount = 0,
    openQuestionsCount = 0,
    approvalStatus = 'not_required'
  } = input;

  // Build artifact type set for fast lookup
  const artifactTypes = useMemo(() => {
    const types = new Set<string>();
    for (const artifact of artifacts) {
      types.add(artifact.artifact_type);
    }
    return types;
  }, [artifacts]);

  // Evaluate all gates
  const gates = useMemo((): GateResult[] => {
    return STAGE_DEFINITIONS.map(def => {
      let status: GateStatus = 'pending';
      let reason: string | undefined;
      let missingArtifacts: ArtifactType[] | undefined;

      // If stage has a custom check function
      if (def.checkFn) {
        const result = def.checkFn(input);
        status = result.complete ? 'complete' : 'pending';
        reason = result.reason;
      }
      // If stage requires specific artifacts
      else if (def.requiredArtifacts) {
        const missing = def.requiredArtifacts.filter(t => !artifactTypes.has(t));
        if (missing.length === 0) {
          status = 'complete';
        } else {
          status = 'pending';
          missingArtifacts = missing;
          reason = `Missing: ${missing.join(', ')}`;
        }
      }

      return {
        stage: def.stage,
        name: def.name,
        status,
        reason,
        requiredArtifacts: def.requiredArtifacts,
        missingArtifacts,
      };
    });
  }, [input, artifactTypes]);

  // Compute quality mode
  const qualityMode = useMemo((): QualityMode => {
    const doc = documents[0];
    
    // BLOCK if no extraction at all
    if (!doc?.extracted_text && !manualTextUsed) {
      return 'block';
    }
    
    // WARN conditions
    const warnConditions = [
      exemptionsCount > 0,
      manualTextUsed,
      openQuestionsCount > 0,
      doc?.ocr_quality_band === 'low',
    ];
    
    if (warnConditions.some(Boolean)) {
      return 'warn';
    }
    
    return 'pass';
  }, [documents, manualTextUsed, exemptionsCount, openQuestionsCount]);

  // Compute blocking and warning reasons
  const { blockingReasons, warningReasons } = useMemo(() => {
    const blocking: string[] = [];
    const warning: string[] = [];
    const doc = documents[0];
    
    // Blocking reasons
    if (!doc) blocking.push('No document uploaded');
    if (doc && !doc.extracted_text && !manualTextUsed) {
      blocking.push('No extracted text - extraction failed and no manual text provided');
    }
    
    // Warning reasons
    if (manualTextUsed) warning.push('Manual text paste used instead of PDF extraction');
    if (exemptionsCount > 0) warning.push(`${exemptionsCount} exemption(s) recorded`);
    if (openQuestionsCount > 0) warning.push(`${openQuestionsCount} unanswered question(s)`);
    if (doc?.ocr_quality_band === 'low') warning.push('Low OCR confidence');
    
    return { blockingReasons: blocking, warningReasons: warning };
  }, [documents, manualTextUsed, exemptionsCount, openQuestionsCount]);

  // Check if approval is required
  const isApprovalRequired = qualityMode === 'warn' && approvalStatus !== 'approved';

  // Can proceed to step (all previous gates must be complete)
  const canProceedToStep = (step: number): boolean => {
    if (step <= 1) return true;
    
    // Check all previous gates are complete
    for (let i = 0; i < step - 1; i++) {
      if (gates[i]?.status !== 'complete') {
        return false;
      }
    }
    
    // If quality mode is WARN and step > 6 (BRD/Epics/Summary), require approval
    if (qualityMode === 'warn' && step > 5 && approvalStatus !== 'approved') {
      return false;
    }
    
    // If quality mode is BLOCK, can't proceed past step 2
    if (qualityMode === 'block' && step > 2) {
      return false;
    }
    
    return true;
  };

  // Check if a step is complete
  const isStepComplete = (step: number): boolean => {
    const gate = gates.find(g => g.stage === step);
    return gate?.status === 'complete';
  };

  return {
    gates,
    qualityMode,
    canProceedToStep,
    isStepComplete,
    isApprovalRequired,
    blockingReasons,
    warningReasons,
  };
}
