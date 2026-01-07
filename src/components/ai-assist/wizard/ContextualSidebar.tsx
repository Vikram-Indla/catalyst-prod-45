import React from 'react';
import { 
  X, 
  Clock, 
  Hash, 
  Cpu, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Lightbulb, 
  FileText, 
  ListChecks,
  Shield,
  HelpCircle,
  Send,
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AuditEvent {
  id: string;
  event_type: string;
  created_at: string;
  payload_json?: Record<string, unknown> | null;
}

interface RunDetails {
  id: string;
  run_number: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  canonical_text_hash: string | null;
  model_id: string;
  temperature: number;
  top_p: number;
  prompt_pack_version: string | null;
  sources_pack_version: string | null;
}

interface ContextualSidebarProps {
  open: boolean;
  onClose: () => void;
  currentStep: number;
  latestRun: RunDetails | null | undefined;
  auditEvents: AuditEvent[];
  isAuditLoading: boolean;
}

// Step-specific tips content
const STEP_TIPS: Record<number, { title: string; tips: string[]; icon: React.ComponentType<{ className?: string }> }> = {
  1: {
    title: 'Document Upload Tips',
    icon: FileText,
    tips: [
      'Use official requirement documents (RFP, RFQ, ToR)',
      'Include numbered sections for better parsing',
      'Arabic and English content both supported',
      'PDF or DOCX format, max 50MB',
      'Clear section headings improve extraction',
    ],
  },
  2: {
    title: 'AI Analysis',
    icon: Cpu,
    tips: [
      'AI will extract evidence from your document',
      'Bilingual terms are automatically detected',
      'Page/line references are preserved',
      'Deep memo summarizes key insights',
      'Review extracted items before continuing',
    ],
  },
  3: {
    title: 'Functional Requirements',
    icon: ListChecks,
    tips: [
      'Evidence is transformed to formal requirements',
      'Each FR gets a unique identifier',
      'Review and edit FRs as needed',
      'Link FRs back to source evidence',
      'Prioritize critical requirements',
    ],
  },
  4: {
    title: 'Compliance Gate',
    icon: Shield,
    tips: [
      'DGA and NCA regulations are checked',
      'Non-compliant items need justification',
      'Provide rationale for any exceptions',
      'Compliance score affects approval',
      'All items must pass or be justified',
    ],
  },
  5: {
    title: 'Clarification Questions',
    icon: HelpCircle,
    tips: [
      'AI identifies ambiguous requirements',
      'Answer questions to clarify scope',
      'Some questions may be auto-answered',
      'Mark as "N/A" if not applicable',
      'Complete all before generating BRD',
    ],
  },
  6: {
    title: 'BRD Generation',
    icon: FileText,
    tips: [
      'Business Requirements Document is generated',
      'Review all sections carefully',
      'Export to PDF or Word format',
      'BRD includes all FRs and compliance',
      'Share with stakeholders for review',
    ],
  },
  7: {
    title: 'Business Request Linking',
    icon: Link,
    tips: [
      'Link BRD to existing business requests',
      'Search by request ID or title',
      'Create new BR if none exists',
      'Linking enables traceability',
      'Skip if linking not required',
    ],
  },
  8: {
    title: 'Epic Publishing',
    icon: Send,
    tips: [
      'Convert FRs to backlog epics',
      'Assign to appropriate team',
      'Set priority and sprint',
      'Review before publishing',
      'Published items appear in backlog',
    ],
  },
};

export function ContextualSidebar({
  open,
  onClose,
  currentStep,
  latestRun,
  auditEvents,
  isAuditLoading
}: ContextualSidebarProps) {
  const stepTips = STEP_TIPS[currentStep] || STEP_TIPS[1];
  const StepIcon = stepTips.icon;

  const formatEventType = (eventType: string, payload?: Record<string, unknown> | null) => {
    // More user-friendly event names with context
    const friendlyNames: Record<string, string> = {
      'step_changed': payload?.step_name ? `Moved to ${payload.step_name}` : 'Navigated to step',
      'document_uploaded': 'Document uploaded',
      'document_replaced': 'Document replaced',
      'analysis_started': 'AI analysis started',
      'analysis_completed': 'AI analysis completed',
      'fr_generated': 'Requirements generated',
      'compliance_checked': 'Compliance check ran',
      'brd_generated': 'BRD generated',
      'epic_published': 'Epic published',
      'draft_created': 'Draft created',
      'draft_updated': 'Draft updated',
    };
    return friendlyNames[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTime = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30';
      case 'running': return 'bg-primary/10 text-primary border-primary/30';
      case 'failed': return 'bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))] border-[hsl(var(--danger))]/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  // For steps 1 (capture), don't show run details or activity - just tips
  const showRunDetails = currentStep >= 2 && latestRun;
  const showActivityTab = currentStep >= 2;

  // Filter out noisy/duplicate events
  const meaningfulEvents = auditEvents.filter(e => 
    !['step_changed'].includes(e.event_type) || 
    (e.payload_json as Record<string, unknown>)?.step_name
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/30 z-40 transition-opacity duration-200",
          open ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 w-[360px] bg-card border-l border-border z-50 flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold">Step Guide</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* For Step 1, show tips only - no tabs */}
          {currentStep === 1 ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <StepIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{stepTips.title}</h4>
                  <p className="text-xs text-muted-foreground">Step {currentStep} of 8</p>
                </div>
              </div>

              <div className="space-y-3">
                {stepTips.tips.map((tip, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-[hsl(var(--success))] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* For Steps 2+, show tabs */
            <Tabs defaultValue="tips" className="h-full flex flex-col">
              <div className="border-b border-border px-5 py-2">
                <TabsList className="w-full bg-muted/50">
                  <TabsTrigger value="tips" className="flex-1 gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Tips
                  </TabsTrigger>
                  {showRunDetails && (
                    <TabsTrigger value="run" className="flex-1 gap-1.5">
                      <Cpu className="h-3.5 w-3.5" />
                      Run
                    </TabsTrigger>
                  )}
                  {showActivityTab && (
                    <TabsTrigger value="activity" className="flex-1 gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Activity
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* Tips Tab - Contextual for current step */}
                <TabsContent value="tips" className="mt-0 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <StepIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{stepTips.title}</h4>
                      <p className="text-xs text-muted-foreground">Step {currentStep} of 8</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {stepTips.tips.map((tip, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-[hsl(var(--success))] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{tip}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Run Details Tab - Only for steps 2+ */}
                {showRunDetails && (
                  <TabsContent value="run" className="mt-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Run Status</span>
                      <Badge variant="outline" className={cn("capitalize", getStatusColor(latestRun.status))}>
                        {latestRun.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {latestRun.status === 'running' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                        {latestRun.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {latestRun.status}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Run Number</span>
                        <span className="text-sm font-medium font-mono">#{latestRun.run_number}</span>
                      </div>

                      {latestRun.started_at && (
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Started</span>
                          <span className="text-sm font-medium">{formatTime(latestRun.started_at)}</span>
                        </div>
                      )}

                      {latestRun.canonical_text_hash && (
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5" />
                            Document Hash
                          </span>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {latestRun.canonical_text_hash.substring(0, 8)}...
                          </code>
                        </div>
                      )}
                    </div>

                    {/* AI Configuration */}
                    <div className="space-y-3 mt-4">
                      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5" />
                        AI Configuration
                      </span>

                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Model</span>
                          <span className="text-sm font-medium font-mono">{latestRun.model_id}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Temperature</span>
                          <span className="text-sm font-medium font-mono">{latestRun.temperature}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Top P</span>
                          <span className="text-sm font-medium font-mono">{latestRun.top_p}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* Activity Tab - Only for steps 2+ */}
                {showActivityTab && (
                  <TabsContent value="activity" className="mt-0 space-y-4">
                    <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Recent Activity
                    </span>

                    {isAuditLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : meaningfulEvents.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {meaningfulEvents.slice(0, 20).map((event) => (
                          <div key={event.id} className="flex gap-3 py-2">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{formatEventType(event.event_type, event.payload_json)}</p>
                              <p className="text-xs text-muted-foreground">{formatTime(event.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No activity yet</p>
                        <p className="text-xs mt-1">Actions will appear here</p>
                      </div>
                    )}
                  </TabsContent>
                )}
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}
