import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GitBranch, ArrowRight, Pause, Clock } from 'lucide-react';
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

interface TransitionEntry {
  fromStep: string | null;
  toStep: string;
  date: string;
  formattedDate: string;
}

// Step value to label mapping
const STEP_LABELS: Record<string, string> = {};
PROCESS_STEPS.forEach(step => {
  STEP_LABELS[step.value] = step.label;
});

export function WorkflowViewerModal({ currentStep, requestId, submittedDate }: WorkflowViewerModalProps) {
  const isPaused = currentStep === 'on_hold';

  // Fetch ALL process_step changes as chronological timeline
  const { data: transitions } = useQuery({
    queryKey: ['workflow-transitions', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_audit_logs')
        .select('old_value, new_value, created_at')
        .eq('business_request_id', requestId)
        .eq('field_changed', 'process_step')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const timeline: TransitionEntry[] = [];

      // Add initial submission as first entry
      if (submittedDate) {
        timeline.push({
          fromStep: null,
          toStep: 'request_received',
          date: submittedDate,
          formattedDate: format(new Date(submittedDate), 'dd/MM/yyyy HH:mm')
        });
      }

      // Process all audit logs to build complete transition history
      data?.forEach((log: { old_value: string | null; new_value: string | null; created_at: string }) => {
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
    enabled: !!requestId
  });

  const getStepLabel = (stepValue: string): string => {
    return STEP_LABELS[stepValue] || stepValue;
  };

  const isOptionalStep = (stepValue: string): boolean => {
    return stepValue === 'on_hold';
  };

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
            Process Workflow History
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* Chronological Timeline */}
          <div className="relative space-y-0">
            {transitions && transitions.length > 0 ? (
              transitions.map((transition, index) => {
                const isLast = index === transitions.length - 1;
                const isOptional = isOptionalStep(transition.toStep);
                
                return (
                  <div key={`${transition.toStep}-${transition.date}`} className="relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className="absolute left-[15px] top-8 w-0.5 h-6 bg-brand-gold/30" />
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
                              ? "bg-brand-gold/20 border-2 border-brand-gold"
                              : "bg-brand-gold"
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
                                {getStepLabel(transition.fromStep)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className={cn(
                                "text-sm font-medium",
                                isOptional ? "text-amber-600" : isLast ? "text-brand-gold" : "text-foreground"
                              )}>
                                {getStepLabel(transition.toStep)}
                              </span>
                            </>
                          ) : (
                            <span className={cn(
                              "text-sm font-medium",
                              isLast ? "text-brand-gold" : "text-foreground"
                            )}>
                              {getStepLabel(transition.toStep)}
                              <span className="text-muted-foreground font-normal ml-1">(Submitted)</span>
                            </span>
                          )}
                          {isLast && (
                            <span className="text-xs bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full">
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

          {/* Paused note if currently on hold */}
          {isPaused && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Pause className="h-3 w-3" />
                This request is currently paused. Paused is an optional status that can be reached from any step.
              </p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Complete history of status changes for this demand request.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
