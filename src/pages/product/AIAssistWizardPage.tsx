import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIAssistDraft, useUpdateDraft } from '@/hooks/useAIAssistDrafts';
import { useLatestRun } from '@/hooks/useAIAssistRuns';
import { useAIAssistAuditEvents } from '@/hooks/useAIAssistDrafts';
import { useAIAssistDocuments } from '@/hooks/useAIAssistDocuments';
import { useLatestArtifactsForDraft } from '@/hooks/useAIAssistArtifacts';
import { TopBar } from '@/components/ai-assist/wizard/TopBar';
import { HorizontalStepper, WizardStep } from '@/components/ai-assist/wizard/HorizontalStepper';
import { FooterNav } from '@/components/ai-assist/wizard/FooterNav';
import { RunDetailsDrawer } from '@/components/ai-assist/wizard/RunDetailsDrawer';
import { DocumentCaptureStep } from '@/components/ai-assist/steps/DocumentCaptureStep';
import { AIAnalysisStep } from '@/components/ai-assist/steps/AIAnalysisStep';
import { FRProcessingStep } from '@/components/ai-assist/steps/FRProcessingStep';
import { ComplianceGateStep } from '@/components/ai-assist/steps/ComplianceGateStep';
import { ClarificationStep } from '@/components/ai-assist/steps/ClarificationStep';
import { BRDGenerationStep } from '@/components/ai-assist/steps/BRDGenerationStep';
import { BRLinkingStep } from '@/components/ai-assist/steps/BRLinkingStep';
import { EpicPublishingStep } from '@/components/ai-assist/steps/EpicPublishingStep';
import { 
  Upload, 
  Brain, 
  FileCheck, 
  Shield, 
  HelpCircle, 
  FileText, 
  Link, 
  Send 
} from 'lucide-react';

// 8-step wizard configuration
const WIZARD_STEPS: WizardStep[] = [
  { id: 1, name: 'Document Capture', shortName: 'Capture', description: 'Upload requirements document', icon: Upload, key: 'capture' },
  { id: 2, name: 'AI Analysis', shortName: 'Analysis', description: 'Extract evidence & insights', icon: Brain, key: 'analysis' },
  { id: 3, name: 'FR Processing', shortName: 'FRs', description: 'Transform to functional requirements', icon: FileCheck, key: 'fr' },
  { id: 4, name: 'Compliance Gate', shortName: 'Compliance', description: 'DGA/NCA validation', icon: Shield, key: 'compliance' },
  { id: 5, name: 'Clarification', shortName: 'Questions', description: 'Generate open questions', icon: HelpCircle, key: 'clarification' },
  { id: 6, name: 'BRD Generation', shortName: 'BRD', description: 'Produce final document', icon: FileText, key: 'brd' },
  { id: 7, name: 'BR Linking', shortName: 'Linking', description: 'Connect to business requests', icon: Link, key: 'linking' },
  { id: 8, name: 'Epic Publishing', shortName: 'Publish', description: 'Publish to backlog', icon: Send, key: 'publish' },
];

export default function AIAssistWizardPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  
  // Fetch draft data
  const { data: draft, isLoading: draftLoading, error: draftError } = useAIAssistDraft(draftId);
  const { data: latestRun } = useLatestRun(draft?.id);
  const { data: auditEvents = [], isLoading: auditLoading } = useAIAssistAuditEvents(draft?.id);
  const { data: documents = [] } = useAIAssistDocuments(draft?.id);
  const { data: artifacts = [] } = useLatestArtifactsForDraft(draft?.id);
  
  const updateDraft = useUpdateDraft();
  
  // Local state
  const [currentStep, setCurrentStep] = useState(1);
  const [isRtl, setIsRtl] = useState(true);
  const [complianceContinueAllowed, setComplianceContinueAllowed] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync state from draft when loaded
  useEffect(() => {
    if (draft) {
      setCurrentStep(draft.current_step);
      setIsRtl(draft.dir === 'rtl');
    }
  }, [draft]);

  const currentStepConfig = WIZARD_STEPS.find(s => s.id === currentStep);
  const latestDoc = documents?.[0];
  const hasDocument = !!latestDoc;
  const hasDocumentText = !!latestDoc?.extracted_text;

  // Step completion requirements - determines which steps are actually complete
  const getStepCompletionStatus = useCallback(() => {
    const completed = new Set<number>();
    
    // Step 1: Document Capture - complete when document uploaded
    if (hasDocument) {
      completed.add(1);
    }
    
    // Step 2: AI Analysis - complete when analysis ran (has extracted text)
    if (hasDocumentText) {
      completed.add(2);
    }
    
    // Step 3: FR Processing - check if FR artifact exists
    const hasFRs = artifacts?.some(a => a.artifact_type === 'functional_requirements');
    if (hasFRs) {
      completed.add(3);
    }
    
    // Step 4: Compliance Gate - check if compliance artifact exists
    const hasCompliance = artifacts?.some(a => a.artifact_type === 'compliance_report');
    if (hasCompliance) {
      completed.add(4);
    }
    
    // Step 5: Clarification - check if open_questions artifact exists
    const hasClarification = artifacts?.some(a => a.artifact_type === 'open_questions');
    if (hasClarification) {
      completed.add(5);
    }
    
    // Step 6: BRD Generation - check if BRD artifact exists
    const hasBRD = artifacts?.some(a => a.artifact_type === 'brd');
    if (hasBRD) {
      completed.add(6);
    }
    
    // Step 7: BR Linking - check if link exists (from step_data)
    const hasLinking = (draft?.step_data as Record<string, unknown>)?.linkedBrId;
    if (hasLinking) {
      completed.add(7);
    }
    
    // Step 8: Epic Publishing - check if published
    if (draft?.status === 'published') {
      completed.add(8);
    }
    
    return completed;
  }, [hasDocument, hasDocumentText, artifacts, draft?.step_data, draft?.status]);

  const completedSteps = getStepCompletionStatus();

  // Can only navigate to completed steps or current step
  const canAccessStep = useCallback((stepId: number) => {
    return completedSteps.has(stepId) || stepId === currentStep;
  }, [completedSteps, currentStep]);

  // Persist step changes to DB
  const handleStepChange = useCallback((newStep: number) => {
    // Only allow navigation to accessible steps
    if (!canAccessStep(newStep) && newStep > currentStep) {
      return;
    }
    setCurrentStep(newStep);
    if (draft?.id && newStep !== draft.current_step) {
      updateDraft.mutate({ id: draft.id, updates: { current_step: newStep } });
    }
  }, [draft, updateDraft, canAccessStep, currentStep]);

  const handleDirChange = useCallback((rtl: boolean) => {
    setIsRtl(rtl);
    if (draft?.id) {
      updateDraft.mutate({ id: draft.id, updates: { dir: rtl ? 'rtl' : 'ltr' } });
    }
  }, [draft, updateDraft]);

  const handlePrevStep = () => {
    if (currentStep > 1) handleStepChange(currentStep - 1);
  };

  const handleNextStep = () => {
    // Check if current step is complete before allowing next
    const isCurrentStepComplete = completedSteps.has(currentStep);
    
    if (currentStepConfig?.key === 'compliance' && !complianceContinueAllowed) {
      return;
    }
    
    // For step 1, require document before proceeding
    if (currentStep === 1 && !hasDocument) {
      return;
    }
    
    if (currentStep < 8) {
      handleStepChange(currentStep + 1);
    }
  };

  // Determine if Continue is disabled
  const getNextDisabledState = () => {
    switch (currentStep) {
      case 1:
        return !hasDocument;
      case 2:
        return !hasDocumentText;
      case 4:
        return !complianceContinueAllowed;
      default:
        return false;
    }
  };

  const isNextDisabled = getNextDisabledState();

  const getNextDisabledReason = () => {
    switch (currentStep) {
      case 1:
        return !hasDocument ? 'Upload Document' : undefined;
      case 2:
        return !hasDocumentText ? 'Run Analysis' : undefined;
      case 4:
        return !complianceContinueAllowed ? 'Justification Required' : undefined;
      default:
        return undefined;
    }
  };

  const nextDisabledReason = getNextDisabledReason();

  // Transform artifacts for step components
  const transformedArtifacts = artifacts?.map(a => ({
    artifact_type: a.artifact_type,
    content_json: a.content_json
  })) || [];

  // Transform audit events for drawer
  const transformedAuditEvents = auditEvents.map(e => ({
    id: e.id,
    event_type: e.event_type,
    created_at: e.created_at,
    payload_json: typeof e.payload_json === 'object' && e.payload_json !== null 
      ? e.payload_json as Record<string, unknown> 
      : null
  }));

  // Transform documents for DocumentCaptureStep
  const transformedDocuments = documents?.map(d => ({
    id: d.id,
    file_name: d.file_name,
    file_size: d.file_size,
    file_sha256: d.file_sha256,
    extraction_status: d.extraction_status,
    extracted_text: d.extracted_text,
    created_at: d.created_at
  })) || [];

  // Render step content based on current step
  const renderStepContent = () => {
    if (!draft?.id) return null;
    
    switch (currentStepConfig?.key) {
      case 'capture':
        return <DocumentCaptureStep draftId={draft.id} documents={transformedDocuments} />;
      case 'analysis':
        return <AIAnalysisStep draftId={draft.id} runId={latestRun?.id} />;
      case 'fr':
        return (
          <FRProcessingStep 
            draftId={draft.id} 
            runId={latestRun?.id}
            evidenceCount={latestDoc?.extracted_text ? latestDoc.extracted_text.split('\n').filter(Boolean).length : 0}
            documentName={latestDoc?.file_name}
          />
        );
      case 'compliance':
        return (
          <ComplianceGateStep 
            draftId={draft.id}
            runId={latestRun?.id}
            onContinueAllowed={setComplianceContinueAllowed}
          />
        );
      case 'clarification':
        return <ClarificationStep draftId={draft.id} runId={latestRun?.id} />;
      case 'brd':
        return <BRDGenerationStep draftId={draft.id} runId={latestRun?.id} />;
      case 'linking':
        return <BRLinkingStep draftId={draft.id} runId={latestRun?.id} />;
      case 'publish':
        return <EpicPublishingStep draftId={draft.id} runId={latestRun?.id} />;
      default:
        return null;
    }
  };

  // Loading state
  if (draftLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading draft...</p>
      </div>
    );
  }

  // Error state
  if (draftError || !draft) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-sm text-muted-foreground mb-4">Draft not found or could not be loaded.</p>
        <Button variant="outline" onClick={() => navigate('/product/ai-assist')}>
          Back to Drafts
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Bar */}
      <TopBar
        draftKey={draft.draft_key}
        currentStepName={currentStepConfig?.name || ''}
        currentStepNumber={currentStep}
        totalSteps={WIZARD_STEPS.length}
        isRtl={isRtl}
        onRtlChange={handleDirChange}
        onBack={() => navigate('/product/ai-assist')}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Horizontal Stepper */}
      <div className="border-b border-border/50 bg-card px-6 py-3">
        <HorizontalStepper
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepChange}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Step Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              {currentStepConfig && (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <currentStepConfig.icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold">{currentStepConfig?.name}</h1>
                <p className="text-sm text-muted-foreground">{currentStepConfig?.description}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {renderStepContent()}
        </div>
      </main>

      {/* Footer Navigation */}
      <FooterNav
        currentStep={currentStep}
        totalSteps={WIZARD_STEPS.length}
        canGoNext={currentStep < WIZARD_STEPS.length}
        isNextDisabled={isNextDisabled}
        nextDisabledReason={nextDisabledReason}
        onPrevious={handlePrevStep}
        onNext={handleNextStep}
      />

      {/* Run Details Drawer */}
      <RunDetailsDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        latestRun={latestRun ? {
          id: latestRun.id,
          run_number: latestRun.run_number,
          status: latestRun.status,
          started_at: latestRun.started_at,
          completed_at: latestRun.completed_at,
          canonical_text_hash: latestRun.canonical_text_hash,
          model_id: latestRun.model_id,
          temperature: latestRun.temperature,
          top_p: latestRun.top_p,
          prompt_pack_version: latestRun.prompt_pack_version,
          sources_pack_version: latestRun.sources_pack_version
        } : null}
        auditEvents={transformedAuditEvents}
        isAuditLoading={auditLoading}
      />
    </div>
  );
}
