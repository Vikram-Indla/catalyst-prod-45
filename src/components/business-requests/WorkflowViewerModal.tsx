import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GitBranch, Check, Pause, ArrowRight } from 'lucide-react';
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
  step: string;
  stepLabel: string;
  date: string;
  isCurrentStep: boolean;
  isPaused: boolean;
}

// Get step label from value
const getStepLabel = (value: string): string => {
  const step = PROCESS_STEPS.find(s => s.value === value);
  return step?.label || value;
};

export function WorkflowViewerModal({ currentStep, requestId, submittedDate }: WorkflowViewerModalProps) {
  // Fetch ALL process_step changes from audit logs chronologically
  const { data: transitions } = useQuery({
    queryKey: ['workflow-history', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_audit_logs')
        .select('new_value, created_at')
        .eq('business_request_id', requestId)
        .eq('field_changed', 'process_step')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const history: TransitionEntry[] = [];

      // Add initial "Received" state from submitted date
      if (submittedDate) {
        history.push({
          step: 'request_received',
          stepLabel: 'Received',
          date: submittedDate,
          isCurrentStep: currentStep === 'request_received',
          isPaused: false
        });
      }

      // Add all transitions from audit log
      data?.forEach((log: { new_value: string | null; created_at: string }) => {
        if (log.new_value) {
          history.push({
            step: log.new_value,
            stepLabel: getStepLabel(log.new_value),
            date: log.created_at,
            isCurrentStep: log.new_value === currentStep,
            isPaused: log.new_value === 'on_hold'
          });
        }
      });

      // If no transitions but we have a current step different from received, show it
      if (history.length === 1 && currentStep !== 'request_received') {
        history.push({
          step: currentStep,
          stepLabel: getStepLabel(currentStep),
          date: submittedDate || new Date().toISOString(),
          isCurrentStep: true,
          isPaused: currentStep === 'on_hold'
        });
      }

      return history;
    },
    enabled: !!requestId
  });

  const formatDate = (dateStr: string): string => {
    return format(new Date(dateStr), 'dd/MM/yyyy');
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
          <div className="relative">
            {transitions?.map((entry, index) => {
              const isLast = index === (transitions?.length || 0) - 1;
              
              return (
                <div key={`${entry.step}-${index}`} className="relative">
                  {/* Connector line */}
                  {!isLast && (
                    <div 
                      className={cn(
                        "absolute left-4 top-8 w-0.5 h-8",
                        entry.isCurrentStep ? "bg-border" : "bg-brand-gold"
                      )}
                    />
                  )}
                  
                  {/* Step node */}
                  <div className="flex items-center gap-3 py-2">
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors",
                        entry.isCurrentStep && !entry.isPaused && "bg-brand-gold/20 border-2 border-brand-gold text-brand-gold",
                        entry.isCurrentStep && entry.isPaused && "bg-amber-500/20 border-2 border-amber-500 text-amber-600",
                        !entry.isCurrentStep && !entry.isPaused && "bg-brand-gold text-white",
                        !entry.isCurrentStep && entry.isPaused && "bg-amber-500 text-white"
                      )}
                    >
                      {entry.isPaused ? (
                        <Pause className="h-4 w-4" />
                      ) : entry.isCurrentStep ? (
                        <ArrowRight className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-1">
                      <p 
                        className={cn(
                          "text-sm font-medium",
                          entry.isCurrentStep && !entry.isPaused && "text-brand-gold",
                          entry.isCurrentStep && entry.isPaused && "text-amber-600",
                          !entry.isCurrentStep && "text-foreground"
                        )}
                      >
                        {entry.stepLabel}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                      </span>
                    </div>

                    {entry.isCurrentStep && (
                      <span className="text-xs text-muted-foreground">Current</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {(!transitions || transitions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No workflow history available</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            This timeline shows all status transitions for this demand request, including re-entries.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}