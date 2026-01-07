import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Upload,
  Brain,
  FileCheck,
  Shield,
  HelpCircle,
  FileText,
  Link,
  Send,
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAssistDraft, useUpdateDraft } from '@/hooks/useAIAssistDrafts';
import { useLatestRun } from '@/hooks/useAIAssistRuns';
import { useAIAssistAuditEvents } from '@/hooks/useAIAssistDrafts';
import { useAIAssistDocuments } from '@/hooks/useAIAssistDocuments';
import { useLatestArtifactsForDraft } from '@/hooks/useAIAssistArtifacts';
import { DocumentUploader } from '@/components/ai-assist/DocumentUploader';
import { DeterminismPanel } from '@/components/ai-assist/DeterminismPanel';
import { ComplianceGate } from '@/components/ai-assist/ComplianceGate';
import { BRLinking } from '@/components/ai-assist/BRLinking';
import { EpicPublishing } from '@/components/ai-assist/EpicPublishing';
import { RunSummary } from '@/components/ai-assist/RunSummary';

// 8-step wizard configuration
const WIZARD_STEPS = [
  { id: 1, name: 'Document Capture', description: 'Upload requirements document', icon: Upload, key: 'capture' },
  { id: 2, name: 'AI Analysis', description: 'Extract evidence & insights', icon: Brain, key: 'analysis' },
  { id: 3, name: 'FR Processing', description: 'Transform to functional requirements', icon: FileCheck, key: 'fr' },
  { id: 4, name: 'Compliance Gate', description: 'DGA/NCA validation', icon: Shield, key: 'compliance' },
  { id: 5, name: 'Clarification', description: 'Generate open questions', icon: HelpCircle, key: 'clarification' },
  { id: 6, name: 'BRD Generation', description: 'Produce final document', icon: FileText, key: 'brd' },
  { id: 7, name: 'BR Linking', description: 'Connect to business requests', icon: Link, key: 'linking' },
  { id: 8, name: 'Epic Publishing', description: 'Publish to backlog', icon: Send, key: 'publish' },
];

// Step content components - DocumentCaptureStep now uses the dedicated DocumentUploader component
function DocumentCaptureStepWrapper({ draftId, documents }: { draftId: string; documents: ReturnType<typeof useAIAssistDocuments>['data'] }) {
  return <DocumentUploader draftId={draftId} documents={documents || []} />;
}

function AIAnalysisStep({ artifacts }: { artifacts: ReturnType<typeof useLatestArtifactsForDraft>['data'] }) {
  const evidenceArtifact = artifacts?.find(a => a.artifact_type === 'evidence');
  const glossaryArtifact = artifacts?.find(a => a.artifact_type === 'glossary');
  const memoArtifact = artifacts?.find(a => a.artifact_type === 'memo');

  const getCount = (artifact: typeof evidenceArtifact) => {
    if (!artifact?.content_json) return '—';
    if (Array.isArray(artifact.content_json)) return artifact.content_json.length.toString();
    if (typeof artifact.content_json === 'object' && artifact.content_json !== null) {
      const items = (artifact.content_json as Record<string, unknown>).items;
      if (Array.isArray(items)) return items.length.toString();
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6 text-center">
        <Brain className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--info))] animate-pulse" />
        <p className="text-sm font-medium mb-2">AI Analysis Engine</p>
        <p className="text-xs text-muted-foreground">
          Extracts evidence, generates glossary, creates deep memo from your document.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-2)] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--info))]">{getCount(evidenceArtifact)}</p>
          <p className="text-xs text-muted-foreground mt-1">Evidence Items</p>
        </div>
        <div className="bg-[var(--bg-2)] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--info))]">{getCount(glossaryArtifact)}</p>
          <p className="text-xs text-muted-foreground mt-1">Glossary Terms</p>
        </div>
        <div className="bg-[var(--bg-2)] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--info))]">{getCount(memoArtifact)}</p>
          <p className="text-xs text-muted-foreground mt-1">Memo Sections</p>
        </div>
      </div>
    </div>
  );
}

function FRProcessingStep({ artifacts }: { artifacts: ReturnType<typeof useLatestArtifactsForDraft>['data'] }) {
  const frArtifact = artifacts?.find(a => a.artifact_type === 'functional_requirements');
  const hasData = !!frArtifact;

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <FileCheck className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">Functional Requirements Processing</p>
        <p className="text-xs text-muted-foreground">
          Transform extracted evidence into structured FRs with full traceability.
        </p>
      </div>
      <div className="border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)]">
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm">FR extraction</span>
          <span className={cn(
            "text-xs",
            hasData ? "text-[hsl(var(--success))]" : "text-muted-foreground"
          )}>
            {hasData ? 'Completed' : 'Pending'}
          </span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm">Traceability mapping</span>
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm">Priority assignment</span>
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
      </div>
    </div>
  );
}


function ComplianceGateStepWrapper({ 
  draftId, 
  runId,
  onContinueAllowed 
}: { 
  draftId: string; 
  runId: string | undefined;
  onContinueAllowed: (allowed: boolean) => void;
}) {
  return (
    <ComplianceGate 
      draftId={draftId} 
      runId={runId} 
      onContinueAllowed={onContinueAllowed}
    />
  );
}

function ClarificationStep({ artifacts }: { artifacts: ReturnType<typeof useLatestArtifactsForDraft>['data'] }) {
  const oqArtifact = artifacts?.find(a => a.artifact_type === 'open_questions');
  const questions = oqArtifact?.content_json as { questions?: Array<{ ar: string; en: string }> } | null;

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <HelpCircle className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">Open Questions</p>
        <p className="text-xs text-muted-foreground">
          Generate bilingual clarification questions (AR/EN) for stakeholder review.
        </p>
      </div>
      {questions?.questions && questions.questions.length > 0 ? (
        <div className="space-y-2">
          {questions.questions.map((q, idx) => (
            <div key={idx} className="border border-[var(--border-subtle)] rounded-lg p-3">
              <p className="text-sm mb-1" dir="rtl">{q.ar}</p>
              <p className="text-xs text-muted-foreground">{q.en}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground text-sm py-8">
          No open questions generated yet.
        </div>
      )}
    </div>
  );
}

function BRDGenerationStep({ artifacts }: { artifacts: ReturnType<typeof useLatestArtifactsForDraft>['data'] }) {
  const brdArtifact = artifacts?.find(a => a.artifact_type === 'brd');
  const hasBrd = !!brdArtifact;

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <FileText className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">BRD Generation</p>
        <p className="text-xs text-muted-foreground">
          Produce structured Business Requirements Document with GAP register.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!hasBrd}>Preview PDF</Button>
        <Button variant="outline" size="sm" disabled={!hasBrd}>Preview DOCX</Button>
        <Button variant="outline" size="sm" disabled={!hasBrd}>Preview Markdown</Button>
      </div>
    </div>
  );
}

function BRLinkingStepWrapper({ draftId, runId }: { draftId: string; runId?: string }) {
  return <BRLinking draftId={draftId} runId={runId} />;
}

function EpicPublishingStepWrapper({ 
  draftId, 
  runId,
  artifacts 
}: { 
  draftId: string; 
  runId?: string;
  artifacts: ReturnType<typeof useLatestArtifactsForDraft>['data'];
}) {
  return (
    <div className="space-y-8">
      <EpicPublishing draftId={draftId} runId={runId} artifacts={artifacts || []} />
      <RunSummary draftId={draftId} runId={runId} />
    </div>
  );
}

export default function AIAssistWizardPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  
  // Fetch draft data from Supabase
  const { data: draft, isLoading: draftLoading, error: draftError } = useAIAssistDraft(draftId);
  const { data: latestRun } = useLatestRun(draft?.id);
  const { data: auditEvents = [], isLoading: auditLoading } = useAIAssistAuditEvents(draft?.id);
  const { data: documents = [] } = useAIAssistDocuments(draft?.id);
  const { data: artifacts = [] } = useLatestArtifactsForDraft(draft?.id);
  
  const updateDraft = useUpdateDraft();
  
  // Local state synced with DB
  const [currentStep, setCurrentStep] = useState(1);
  const [isRtl, setIsRtl] = useState(true);
  const [complianceContinueAllowed, setComplianceContinueAllowed] = useState(true);

  // Sync state from draft when loaded
  useEffect(() => {
    if (draft) {
      setCurrentStep(draft.current_step);
      setIsRtl(draft.dir === 'rtl');
    }
  }, [draft]);

  // Persist step changes to DB
  const handleStepChange = useCallback((newStep: number) => {
    setCurrentStep(newStep);
    if (draft?.id && newStep !== draft.current_step) {
      updateDraft.mutate({ id: draft.id, updates: { current_step: newStep } });
    }
  }, [draft, updateDraft]);

  const handleDirChange = useCallback((rtl: boolean) => {
    setIsRtl(rtl);
    if (draft?.id) {
      updateDraft.mutate({ id: draft.id, updates: { dir: rtl ? 'rtl' : 'ltr' } });
    }
  }, [draft, updateDraft]);

  const currentStepConfig = WIZARD_STEPS.find(s => s.id === currentStep);

  const handlePrevStep = () => {
    if (currentStep > 1) handleStepChange(currentStep - 1);
  };

  const handleNextStep = () => {
    // Block navigation if on compliance step and not allowed
    if (currentStepConfig?.key === 'compliance' && !complianceContinueAllowed) {
      return;
    }
    if (currentStep < 8) handleStepChange(currentStep + 1);
  };

  // Determine if next button should be disabled
  const isNextDisabled = currentStepConfig?.key === 'compliance' && !complianceContinueAllowed;

  const formatEventTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStepConfig?.key) {
      case 'capture':
        return draft?.id ? <DocumentCaptureStepWrapper draftId={draft.id} documents={documents} /> : null;
      case 'analysis':
        return <AIAnalysisStep artifacts={artifacts} />;
      case 'fr':
        return <FRProcessingStep artifacts={artifacts} />;
      case 'compliance':
        return draft?.id ? (
          <ComplianceGateStepWrapper 
            draftId={draft.id} 
            runId={latestRun?.id}
            onContinueAllowed={setComplianceContinueAllowed}
          />
        ) : null;
      case 'clarification':
        return <ClarificationStep artifacts={artifacts} />;
      case 'brd':
        return <BRDGenerationStep artifacts={artifacts} />;
      case 'linking':
        return draft?.id ? <BRLinkingStepWrapper draftId={draft.id} runId={latestRun?.id} /> : null;
      case 'publish':
        return draft?.id ? <EpicPublishingStepWrapper draftId={draft.id} runId={latestRun?.id} artifacts={artifacts} /> : null;
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
        <AlertCircle className="h-12 w-12 text-[hsl(var(--danger))] mb-4" />
        <p className="text-sm text-muted-foreground mb-4">Draft not found or could not be loaded.</p>
        <Button variant="outline" onClick={() => navigate('/product/ai-assist')}>
          Back to Drafts
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Product</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">AI Assist</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground font-mono">{draft.draft_key}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Step: {currentStepConfig?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="rtl-toggle" className="text-xs text-muted-foreground">RTL</Label>
            <Switch
              id="rtl-toggle"
              checked={isRtl}
              onCheckedChange={handleDirChange}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/product/ai-assist')}>
            Back to Drafts
          </Button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-[220px_1fr_280px] gap-5 p-5 bg-[var(--bg-1)] overflow-hidden">
        {/* Left: Stepper */}
        <div className="bg-[var(--bg-0)] border border-[var(--border-subtle)] rounded-lg p-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 pb-3 border-b border-[var(--border-subtle)]">
            Wizard Steps
          </h3>
          <div className="space-y-1">
            {WIZARD_STEPS.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;
              const StepIcon = step.icon;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => handleStepChange(step.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors",
                      isActive && "bg-[hsl(var(--info))]/10",
                      !isActive && "hover:bg-[var(--row-hover)]"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border-2 transition-colors",
                      isComplete && "bg-[hsl(var(--success))] border-[hsl(var(--success))] text-white",
                      isActive && "bg-[hsl(var(--info))] border-[hsl(var(--info))] text-white",
                      !isComplete && !isActive && "bg-[var(--bg-2)] border-[var(--border-default)] text-muted-foreground"
                    )}>
                      {isComplete ? <Check className="h-3.5 w-3.5" /> : step.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        (isActive || isComplete) ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    </div>
                  </button>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className={cn(
                      "w-0.5 h-6 ms-[13px]",
                      isComplete ? "bg-[hsl(var(--success))]" : "bg-[var(--border-default)]"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Center: Step Content */}
        <div className="bg-[var(--bg-0)] border border-[var(--border-subtle)] rounded-lg flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStepConfig && <currentStepConfig.icon className="h-5 w-5 text-[hsl(var(--info))]" />}
              <h2 className="text-base font-semibold">{currentStepConfig?.name}</h2>
            </div>
            <span className="text-xs text-muted-foreground">Step {currentStep} of 8</span>
          </div>
          <div className="flex-1 p-5 overflow-y-auto">
            {renderStepContent()}
          </div>
          <div className="px-5 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={currentStep === 8 || isNextDisabled}
              className="gap-2"
            >
              {isNextDisabled ? 'Justification Required' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right: Determinism & Audit Panel */}
        <div className="bg-[var(--bg-0)] border border-[var(--border-subtle)] rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Determinism
            </h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <DeterminismPanel 
              latestRun={latestRun} 
              latestDocument={documents?.[0]} 
            />

            {/* Audit Timeline */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Audit Timeline
              </h4>
              {auditLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : auditEvents.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {auditEvents.slice(0, 20).map((event) => (
                    <div key={event.id} className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-[hsl(var(--info))] mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{formatEventType(event.event_type)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatEventTime(event.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-xs py-4">
                  No audit events yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
