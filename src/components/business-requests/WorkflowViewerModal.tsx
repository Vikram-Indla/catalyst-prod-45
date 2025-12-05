import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GitBranch, ChevronRight, Check, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROCESS_STEPS } from '@/types/business-request';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface WorkflowViewerModalProps {
  currentStep: string;
  requestId: string;
  submittedDate?: string;
}

// Main workflow steps (excluding Paused which is optional from any step)
const MAIN_WORKFLOW_STEPS = PROCESS_STEPS.filter(step => step.value !== 'on_hold');

export function WorkflowViewerModal({ currentStep, requestId, submittedDate }: WorkflowViewerModalProps) {
  const currentIndex = MAIN_WORKFLOW_STEPS.findIndex(step => step.value === currentStep);
  const isPaused = currentStep === 'on_hold';

  // Fetch process_step change history from audit logs
  const { data: stepDates } = useQuery({
    queryKey: ['workflow-step-dates', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_audit_logs')
        .select('new_value, created_at')
        .eq('business_request_id', requestId)
        .eq('field_changed', 'process_step')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Build map of first entry date for each step
      const stepDateMap: Record<string, string> = {};
      
      // If we have a submitted date, use it for the first step (Received)
      if (submittedDate) {
        stepDateMap['request_received'] = submittedDate;
      }

      // Process audit logs to get first entry date for each step
      data?.forEach((log: { new_value: string | null; created_at: string }) => {
        if (log.new_value && !stepDateMap[log.new_value]) {
          stepDateMap[log.new_value] = log.created_at;
        }
      });

      return stepDateMap;
    },
    enabled: !!requestId
  });

  const getStepDate = (stepValue: string): string | null => {
    if (!stepDates || !stepDates[stepValue]) return null;
    return format(new Date(stepDates[stepValue]), 'dd/MM/yyyy');
  };

  const pausedDate = getStepDate('on_hold');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-xs text-brand-gold hover:text-brand-gold/80">
          <GitBranch className="h-3 w-3 mr-1" />
          View workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-brand-gold" />
            Process Workflow
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="relative">
            {MAIN_WORKFLOW_STEPS.map((step, index) => {
              const isCompleted = !isPaused && index < currentIndex;
              const isCurrent = !isPaused && index === currentIndex;
              const isUpcoming = isPaused || index > currentIndex;
              const stepDate = getStepDate(step.value);
              
              return (
                <div key={step.value} className="relative">
                  {/* Connector line */}
                  {index < MAIN_WORKFLOW_STEPS.length - 1 && (
                    <div 
                      className={cn(
                        "absolute left-4 top-8 w-0.5 h-8",
                        isCompleted ? "bg-brand-gold" : "bg-border"
                      )}
                    />
                  )}
                  
                  {/* Step node */}
                  <div className="flex items-center gap-3 py-2">
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors",
                        isCompleted && "bg-brand-gold text-white",
                        isCurrent && "bg-brand-gold/20 border-2 border-brand-gold text-brand-gold",
                        isUpcoming && "bg-muted border border-border text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <p 
                        className={cn(
                          "text-sm font-medium",
                          isCurrent && "text-brand-gold",
                          isUpcoming && "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </p>
                      {/* Show date closer to label */}
                      {(isCompleted || isCurrent) && stepDate && (
                        <span className="text-xs text-muted-foreground">
                          {stepDate}
                        </span>
                      )}
                    </div>

                    <div className="flex-1" />

                    {/* Allowed transitions indicator */}
                    {isCurrent && index < MAIN_WORKFLOW_STEPS.length - 1 && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <ChevronRight className="h-3 w-3" />
                        <span>Can move to: {MAIN_WORKFLOW_STEPS[index + 1]?.label}</span>
                      </div>
                    )}

                    {isCurrent && (
                      <span className="text-xs text-muted-foreground ml-2">Current step</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paused - Optional status note */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors",
                  isPaused 
                    ? "bg-amber-500/20 border-2 border-amber-500 text-amber-600" 
                    : "bg-muted border border-dashed border-border text-muted-foreground"
                )}
              >
                <Pause className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-sm font-medium",
                  isPaused ? "text-amber-600" : "text-muted-foreground"
                )}>
                  Paused
                </p>
                {isPaused && pausedDate && (
                  <span className="text-xs text-muted-foreground">{pausedDate}</span>
                )}
                {isPaused && (
                  <span className="text-xs text-amber-600 ml-2">Current step</span>
                )}
              </div>
              <div className="flex-1" />
              <span className="text-xs text-muted-foreground italic">
                Optional from any step
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            This workflow shows the progression of a demand request from submission to closure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}