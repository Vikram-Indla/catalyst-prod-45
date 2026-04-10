import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, ArrowRight, Pause, Clock, Check, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProcessSteps } from '@/contexts/ProcessStepsContext';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface WorkflowViewerModalProps {
  currentStep: string;
  requestId: string;
  submittedDate?: string;
  onStepChange?: (step: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface TransitionEntry {
  fromStep: string | null;
  toStep: string;
  date: string;
  formattedDate: string;
}

// Orphan statuses that aren't part of the main flow
const ORPHAN_STATUSES = ['on_hold', 'rejected'];

export function WorkflowViewerModal({ currentStep, requestId, submittedDate, onStepChange, open, onOpenChange }: WorkflowViewerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { processStepOptions, getProcessStepLabel, isLoading: isLoadingSteps } = useProcessSteps();
  
  // Support both controlled and uncontrolled modes
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  const isPaused = currentStep === 'on_hold';
  const isRejected = currentStep === 'rejected';

  // Filter out orphan statuses for main flow
  const mainSteps = useMemo(() => 
    processStepOptions.filter(s => !ORPHAN_STATUSES.includes(s.value)),
    [processStepOptions]
  );

  // Find current step index in main flow
  const currentIndex = mainSteps.findIndex(s => s.value === currentStep);

  // Fetch ALL process_step changes as chronological timeline
  const { data: transitions } = useQuery({
    queryKey: ['workflow-transitions', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('business_request_audit_logs')
        .select('old_value, new_value, created_at')
        .eq('business_request_id', requestId)
        .eq('field_changed', 'Process Step')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const timeline: TransitionEntry[] = [];

      // Add initial submission as first entry
      if (submittedDate) {
        timeline.push({
          fromStep: null,
          toStep: 'new_request',
          date: submittedDate,
          formattedDate: format(new Date(submittedDate), 'dd/MM/yyyy HH:mm')
        });
      }

      // Process all audit logs to build complete transition history
      (data as any[] || []).forEach((log: { old_value: string | null; new_value: string | null; created_at: string }) => {
        if (log.new_value) {
          timeline.push({
            fromStep: log.old_value,
            toStep: log.new_value,
            date: log.created_at,
            formattedDate: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')
          });
        }
      });

      return timeline;
    },
    enabled: !!requestId && isOpen
  });

  const isOptionalStep = (stepValue: string): boolean => {
    return ORPHAN_STATUSES.includes(stepValue);
  };

  const handleStatusChange = (value: string) => {
    if (onStepChange) {
      onStepChange(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-brand-primary" />
            Process Workflow
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Visual Pipeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Current Status</h4>
              {onStepChange && (
                <Select value={currentStep} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px] h-8 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSteps ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      processStepOptions.map((step) => (
                        <SelectItem key={step.value} value={step.value}>
                          {step.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Pipeline visualization */}
            <div className="relative pt-2 pb-6">
              {/* Progress line background */}
              <div className="absolute top-6 left-4 right-4 h-0.5 bg-border" />
              
              {/* Progress line filled */}
              <div 
                className="absolute top-6 left-4 h-0.5 bg-brand-primary transition-all duration-300"
                style={{ 
                  width: currentIndex >= 0 
                    ? `calc(${(currentIndex / (mainSteps.length - 1)) * 100}% - 32px)` 
                    : '0%' 
                }}
              />
              
              {/* Steps */}
              <div className="relative flex justify-between px-0">
                {mainSteps.map((step, index) => {
                  const isCompleted = index < currentIndex;
                  const isCurrent = step.value === currentStep;
                  
                  return (
                    <div 
                      key={step.value}
                      className="flex flex-col items-center gap-2"
                    >
                      {/* Step circle */}
                      <div
                        className={cn(
                          "relative z-10 flex items-center justify-center rounded-full border-2 w-8 h-8 transition-all",
                          isCompleted && "bg-brand-primary border-brand-primary text-white",
                          isCurrent && "bg-card border-brand-primary shadow-md ring-2 ring-brand-primary/20",
                          !isCompleted && !isCurrent && "bg-card border-border text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className={cn(
                            "text-xs font-medium",
                            isCurrent && "text-brand-primary"
                          )}>
                            {index + 1}
                          </span>
                        )}
                      </div>
                      
                      {/* Step label */}
                      <span className={cn(
                        "text-xs text-center max-w-[80px]",
                        isCurrent ? "text-brand-primary font-medium" : "text-muted-foreground",
                        isCompleted && "text-foreground"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Orphan status indicators */}
            {(isPaused || isRejected) && (
              <div className="flex items-center gap-2">
                {isPaused && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <Pause className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-600">On-Hold</span>
                  </div>
                )}
                {isRejected && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Rejected</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Chronological Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Change History</h4>
            <div className="relative space-y-0 max-h-[250px] overflow-y-auto">
              {transitions && transitions.length > 0 ? (
                transitions.map((transition, index) => {
                  const isLast = index === transitions.length - 1;
                  const isOptional = isOptionalStep(transition.toStep);
                  
                  return (
                    <div key={`${transition.toStep}-${transition.date}`} className="relative">
                      {/* Connector line */}
                      {!isLast && (
                        <div className="absolute left-[15px] top-8 w-0.5 h-6 bg-brand-primary/30" />
                      )}
                      
                      {/* Timeline entry */}
                      <div className="flex items-start gap-3 py-2">
                        {/* Timeline dot */}
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            isOptional 
                              ? "bg-amber-500/20 border-2 border-amber-500" 
                              : isLast 
                                ? "bg-brand-primary/20 border-2 border-brand-primary"
                                : "bg-brand-primary"
                          )}
                        >
                          {isOptional ? (
                            <Pause className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {transition.fromStep ? (
                              <>
                                <span className="text-sm text-muted-foreground">
                                  {getProcessStepLabel(transition.fromStep)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className={cn(
                                  "text-sm font-medium",
                                  isOptional ? "text-amber-600" : isLast ? "text-brand-primary" : "text-foreground"
                                )}>
                                  {getProcessStepLabel(transition.toStep)}
                                </span>
                              </>
                            ) : (
                              <span className={cn(
                                "text-sm font-medium",
                                isLast ? "text-brand-primary" : "text-foreground"
                              )}>
                                {getProcessStepLabel(transition.toStep)}
                                <span className="text-muted-foreground font-normal ml-1">(Submitted)</span>
                              </span>
                            )}
                            {isLast && (
                              <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {transition.formattedDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No workflow history available
                </div>
              )}
            </div>
          </div>

          {/* Orphan status notes */}
          {isPaused && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" />
                This request is currently on-hold. On-Hold can be applied from any step in the workflow.
              </p>
            </div>
          )}
          {isRejected && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                This request has been rejected. Rejected is a terminal status.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
