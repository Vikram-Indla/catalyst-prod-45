import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, Check, AlertTriangle, Link2, Clock, 
  Download, Trash2, Copy, ArrowRight, Bot,
  Globe, CheckCircle, XCircle, Upload, Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistDocuments, type AIAssistDocument } from '@/hooks/useAIAssistDocuments';
import { useDeleteDraft, type AIAssistDraft } from '@/hooks/useAIAssistDrafts';
import { catalystToast } from '@/lib/catalystToast';
import { formatDistanceToNow, format } from 'date-fns';
import { validateDraftState, getContinueButtonState, type DraftState, WIZARD_STEPS } from '@/lib/ai-assist-state-machine';

interface DraftDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AIAssistDraft | null;
}

export function DraftDetailsDrawer({ open, onOpenChange, draft }: DraftDetailsDrawerProps) {
  const navigate = useNavigate();
  const deleteDraft = useDeleteDraft();
  
  // Fetch documents for this draft
  const { data: documents = [], isLoading: documentsLoading } = useAIAssistDocuments(draft?.id);
  const latestDoc = documents[0];
  
  // Validate and compute derived state
  const validationResult = validateDraftState(draft, documents, []);
  const draftState = validationResult.correctedState as DraftState;
  
  if (!draft) return null;
  
  const totalSteps = 8;
  // Use validated state instead of raw draft values
  const completedSteps = draftState.completedSteps?.length || 0;
  const progressPercent = (completedSteps / totalSteps) * 100;
  const currentStep = draftState.currentStep || 1;
  const currentStepName = WIZARD_STEPS.find(s => s.id === currentStep)?.name || 'Unknown';
  const lastCompletedStepName = draftState.lastCompletedStep 
    ? WIZARD_STEPS.find(s => s.id === draftState.lastCompletedStep)?.name 
    : null;
  
  // Parse step_data for metrics (if available)
  const stepData = draft.step_data as Record<string, unknown> || {};
  
  // Metrics should be empty/zero if no document
  const hasDocument = draftState.hasDocument;
  const metrics = hasDocument ? {
    evidence: stepData.evidenceCount as number | undefined,
    frs: stepData.frCount as number | undefined,
    compliance: draft.quality_score,
    epics: stepData.epicCount as number | undefined,
  } : {
    evidence: undefined,
    frs: undefined,
    compliance: undefined,
    epics: undefined,
  };
  
  // Get linked BR from step_data
  const linkedBR = stepData.linkedBR as string | undefined;
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Get continue button state from state machine
  const continueState = getContinueButtonState(draftState);
  
  const handleContinue = () => {
    if (!continueState.enabled) {
      catalystToast.warning('Cannot Continue', continueState.reason || 'Prerequisites not met');
      return;
    }
    onOpenChange(false);
    navigate(`/product/ai-assist/${draft.id}`);
  };
  
  const handleExport = () => {
    catalystToast.info('Coming Soon', 'Export functionality is in development');
  };
  
  const handleDuplicate = () => {
    catalystToast.info('Coming Soon', 'Duplicate functionality is in development');
  };
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this draft?')) {
      deleteDraft.mutate(draft.id, {
        onSuccess: () => {
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full p-0">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">{draft.draft_key}</SheetTitle>
              <p className="text-sm text-muted-foreground">AI Assist Draft</p>
            </div>
          </div>
        </SheetHeader>
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ═══════════════════════════════════════════════════════════
             SECTION 1: DOCUMENT INFO
             ═══════════════════════════════════════════════════════════ */}
          {documentsLoading ? (
            <div className="p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ) : latestDoc ? (
            <div className="p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate" title={latestDoc.file_name}>
                    {latestDoc.file_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(latestDoc.file_size)} • {latestDoc.mime_type.includes('pdf') ? 'PDF' : 'Document'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploaded {format(new Date(latestDoc.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/20 rounded-xl border border-dashed border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No Document Uploaded</p>
                  <p className="text-sm text-muted-foreground">Upload a document to begin analysis</p>
                </div>
              </div>
            </div>
          )}
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 2: PROGRESS
             ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Progress
            </h4>
            
            {/* Visual Step Indicator */}
            <div className="flex items-center justify-between px-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <React.Fragment key={i}>
                  {/* Step Circle */}
                  <div 
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                      i < completedSteps && "bg-[hsl(var(--success))] text-white",
                      i === completedSteps && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                      i > completedSteps && "bg-muted text-muted-foreground border-2 border-border"
                    )}
                    title={WIZARD_STEPS[i]?.name}
                  >
                    {i < completedSteps ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  
                  {/* Connector Line */}
                  {i < totalSteps - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-1",
                      i < completedSteps ? "bg-[hsl(var(--success))]" : "bg-border"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Progress Text */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedSteps} of {totalSteps} steps complete
              </span>
              {lastCompletedStepName && (
                <span className="text-xs text-muted-foreground">
                  Last: {lastCompletedStepName}
                </span>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-[hsl(var(--success))] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 3: KEY METRICS
             ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Key Metrics
            </h4>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-xl border border-border">
                <div className="text-2xl font-bold text-foreground">
                  {metrics.evidence ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Evidence</div>
              </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-xl border border-border">
                <div className="text-2xl font-bold text-foreground">
                  {metrics.frs ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">FRs</div>
              </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-xl border border-border">
                <div className={cn(
                  "text-2xl font-bold",
                  metrics.compliance !== null && metrics.compliance !== undefined
                    ? metrics.compliance >= 80 ? "text-[hsl(var(--success))]" :
                      metrics.compliance >= 60 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--danger))]"
                    : "text-foreground"
                )}>
                  {metrics.compliance ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Score</div>
              </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-xl border border-border">
                <div className="text-2xl font-bold text-foreground">
                  {metrics.epics ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Epics</div>
              </div>
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 4: STATUS INDICATORS
             ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Status
            </h4>
            
            <div className="space-y-2">
              {/* Draft Status & Language */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Status
                </div>
                <Badge variant="secondary" className="capitalize">
                  {draft.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  Language
                </div>
                <span className="text-sm font-medium">
                  {draft.language?.toUpperCase() || 'EN'}
                </span>
              </div>
              
              {/* Compliance Verdict */}
              {draft.compliance_verdict && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/30">
                  {draft.compliance_verdict === 'pass' && (
                    <CheckCircle className="w-5 h-5 text-[hsl(var(--success))]" />
                  )}
                  {draft.compliance_verdict === 'pending' && (
                    <AlertTriangle className="w-5 h-5 text-[hsl(var(--warning))]" />
                  )}
                  {draft.compliance_verdict === 'fail' && (
                    <XCircle className="w-5 h-5 text-[hsl(var(--danger))]" />
                  )}
                  <span className="text-sm font-medium">
                    {draft.compliance_verdict === 'pass' && 'Compliant'}
                    {draft.compliance_verdict === 'pending' && 'Conditional Pass — Justification recorded'}
                    {draft.compliance_verdict === 'fail' && 'Non-Compliant — Action required'}
                    {draft.compliance_verdict === 'na' && 'Not Applicable'}
                  </span>
                </div>
              )}
              
              {/* Linked BR */}
              {linkedBR && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Linked to {linkedBR}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 5: ACTIVITY
             ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Activity
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last edited: {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Created: {format(new Date(draft.created_at), 'MMM d, yyyy \'at\' h:mm a')}
              </div>
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 6: PRIMARY ACTION
             ═══════════════════════════════════════════════════════════ */}
          <div className="pt-2 space-y-2">
            {/* Blocked warning */}
            {draftState.isBlocked && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30">
                <AlertCircle className="w-4 h-4 text-[hsl(var(--warning))] flex-shrink-0" />
                <span className="text-sm text-[hsl(var(--warning))]">
                  {draftState.blockReason || 'Prerequisites not met'}
                </span>
              </div>
            )}
            
            <Button 
              size="lg" 
              className="w-full gap-2"
              onClick={handleContinue}
              disabled={!continueState.enabled}
            >
              {continueState.label}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 7: SECONDARY ACTIONS
             ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5"
              onClick={handleExport}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5"
              onClick={handleDuplicate}
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger))]/10"
              onClick={handleDelete}
              disabled={deleteDraft.isPending}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default DraftDetailsDrawer;
