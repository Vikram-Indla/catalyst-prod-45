import React, { useState } from 'react';
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
  Hash,
  Cpu,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

// Mock run health data
const MOCK_RUN_HEALTH = {
  canonicalHash: 'a8f3e2b1c4d9f7a3',
  documentVersion: '1.2.0',
  promptPackVersion: 'dga-v2.1',
  sourcesPackVersion: 'nca-2025',
  modelUsed: 'gemini-2.5-pro',
  lastRunAt: '2026-01-07T10:30:00Z',
  auditEvents: [
    { id: 1, event: 'Document uploaded', timestamp: '2026-01-07T10:00:00Z', actor: 'Ahmed Al-Rashid' },
    { id: 2, event: 'AI analysis started', timestamp: '2026-01-07T10:05:00Z', actor: 'System' },
    { id: 3, event: 'Evidence extraction complete', timestamp: '2026-01-07T10:15:00Z', actor: 'System' },
    { id: 4, event: 'FR processing initiated', timestamp: '2026-01-07T10:20:00Z', actor: 'System' },
    { id: 5, event: 'Compliance check started', timestamp: '2026-01-07T10:30:00Z', actor: 'System' },
  ],
};

// Step content placeholders
const StepContent: Record<string, React.ReactNode> = {
  capture: (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-12 text-center hover:border-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/5 transition-colors cursor-pointer">
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">Drop your requirements document here</p>
        <p className="text-xs text-muted-foreground">Supports PDF, DOCX • Max 50MB</p>
      </div>
      <div className="bg-[var(--bg-2)] rounded-lg p-4">
        <p className="text-sm font-medium mb-2">Document Requirements</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Must contain clear functional requirements</li>
          <li>• Arabic or English language supported</li>
          <li>• Recommended: Include section headings</li>
        </ul>
      </div>
    </div>
  ),
  analysis: (
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
          <p className="text-2xl font-bold text-[hsl(var(--info))]">—</p>
          <p className="text-xs text-muted-foreground mt-1">Evidence Items</p>
        </div>
        <div className="bg-[var(--bg-2)] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--info))]">—</p>
          <p className="text-xs text-muted-foreground mt-1">Glossary Terms</p>
        </div>
        <div className="bg-[var(--bg-2)] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--info))]">—</p>
          <p className="text-xs text-muted-foreground mt-1">Memo Sections</p>
        </div>
      </div>
    </div>
  ),
  fr: (
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
          <span className="text-xs text-muted-foreground">Pending</span>
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
  ),
  compliance: (
    <div className="space-y-6">
      <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20 rounded-lg p-4 flex items-center gap-3">
        <Shield className="h-6 w-6 text-[hsl(var(--warning))]" />
        <div>
          <p className="text-sm font-medium text-[hsl(var(--warning))]">Compliance Gate</p>
          <p className="text-xs text-muted-foreground">DGA/NCA automated scoring</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-2)] rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">DGA Score</p>
          <p className="text-3xl font-bold">—</p>
        </div>
        <div className="bg-[var(--bg-2)] rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">NCA Score</p>
          <p className="text-3xl font-bold">—</p>
        </div>
      </div>
    </div>
  ),
  clarification: (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <HelpCircle className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">Open Questions</p>
        <p className="text-xs text-muted-foreground">
          Generate bilingual clarification questions (AR/EN) for stakeholder review.
        </p>
      </div>
      <div className="text-center text-muted-foreground text-sm py-8">
        No open questions generated yet.
      </div>
    </div>
  ),
  brd: (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <FileText className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">BRD Generation</p>
        <p className="text-xs text-muted-foreground">
          Produce structured Business Requirements Document with GAP register.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled>Preview PDF</Button>
        <Button variant="outline" size="sm" disabled>Preview DOCX</Button>
        <Button variant="outline" size="sm" disabled>Preview Markdown</Button>
      </div>
    </div>
  ),
  linking: (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <Link className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">Business Request Linking</p>
        <p className="text-xs text-muted-foreground">
          Connect to existing Business Requests or create new ones.
        </p>
      </div>
      <div className="text-center text-muted-foreground text-sm py-8">
        Complete previous steps to enable BR linking.
      </div>
    </div>
  ),
  publish: (
    <div className="space-y-6">
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <Send className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">Epic Publishing</p>
        <p className="text-xs text-muted-foreground">
          Generate and publish Epics to the product backlog.
        </p>
      </div>
      <Button disabled className="w-full">
        Publish Epics to Backlog
      </Button>
    </div>
  ),
};

export default function AIAssistWizardPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isRtl, setIsRtl] = useState(true); // Default RTL for Arabic drafts

  const currentStepConfig = WIZARD_STEPS.find(s => s.id === currentStep);

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNextStep = () => {
    if (currentStep < 8) setCurrentStep(currentStep + 1);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Product</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">AI Assist</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Draft {draftId}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Step: {currentStepConfig?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="rtl-toggle" className="text-xs text-muted-foreground">RTL</Label>
            <Switch
              id="rtl-toggle"
              checked={isRtl}
              onCheckedChange={setIsRtl}
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
              const isBlocked = false; // Could add logic here
              const StepIcon = step.icon;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => setCurrentStep(step.id)}
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
                      isBlocked && "bg-[hsl(var(--danger))]/10 border-[hsl(var(--danger))] text-[hsl(var(--danger))]",
                      !isComplete && !isActive && !isBlocked && "bg-[var(--bg-2)] border-[var(--border-default)] text-muted-foreground"
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
            {currentStepConfig && StepContent[currentStepConfig.key]}
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
              disabled={currentStep === 8}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right: Run Health Panel */}
        <div className="bg-[var(--bg-0)] border border-[var(--border-subtle)] rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Run Health
            </h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Canonical Hash</p>
              <p className="text-xs font-mono break-all">{MOCK_RUN_HEALTH.canonicalHash}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Document Version</p>
              <p className="text-xs font-mono">{MOCK_RUN_HEALTH.documentVersion}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prompt Pack</p>
              <p className="text-xs font-mono">{MOCK_RUN_HEALTH.promptPackVersion}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sources Pack</p>
              <p className="text-xs font-mono">{MOCK_RUN_HEALTH.sourcesPackVersion}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">AI Model</p>
              <div className="flex items-center gap-2">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs font-mono">{MOCK_RUN_HEALTH.modelUsed}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Run</p>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs">{new Date(MOCK_RUN_HEALTH.lastRunAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Audit Mini Timeline */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Audit Timeline
              </h4>
              <div className="space-y-3">
                {MOCK_RUN_HEALTH.auditEvents.map((event) => (
                  <div key={event.id} className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--info))] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{event.event}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{event.actor}</span>
                        <span>•</span>
                        <span>{formatTime(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
