import { cn } from '@/lib/utils';
import { PROCESS_STEPS } from '@/types/business-request';
import { Check, Pause, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { WorkflowViewerModal } from './WorkflowViewerModal';

interface StatusPipelineProps {
  currentStep: string;
  requestId: string;
  submittedDate?: string;
  onStepChange?: (step: string) => void;
  compact?: boolean;
}

export function StatusPipeline({ 
  currentStep, 
  requestId, 
  submittedDate, 
  onStepChange,
  compact = false 
}: StatusPipelineProps) {
  // Find current step index
  const currentIndex = PROCESS_STEPS.findIndex(s => s.value === currentStep);
  
  // Filter out 'on_hold' from main flow (it's shown as special)
  const mainSteps = PROCESS_STEPS.filter(s => s.value !== 'on_hold');
  const isPaused = currentStep === 'on_hold';

  return (
    <div className="w-full">
      {/* Main pipeline */}
      <div className="relative">
        {/* Progress line background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
        
        {/* Progress line filled */}
        <div 
          className="absolute top-4 left-0 h-0.5 bg-brand-gold transition-all duration-300"
          style={{ 
            width: `${Math.max(0, (currentIndex / (mainSteps.length - 1)) * 100)}%` 
          }}
        />
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {mainSteps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = step.value === currentStep;
            const isClickable = onStepChange !== undefined;
            
            return (
              <div 
                key={step.value}
                className={cn(
                  "flex flex-col items-center",
                  compact ? "gap-1" : "gap-1.5"
                )}
              >
                {/* Step circle */}
                <button
                  onClick={() => isClickable && onStepChange?.(step.value)}
                  disabled={!isClickable}
                  className={cn(
                    "relative z-10 flex items-center justify-center rounded-full border-2 transition-all",
                    compact ? "w-6 h-6" : "w-8 h-8",
                    isCompleted && "bg-brand-gold border-brand-gold text-white",
                    isCurrent && "bg-card border-brand-gold shadow-md ring-2 ring-brand-gold/20",
                    !isCompleted && !isCurrent && "bg-card border-border text-muted-foreground",
                    isClickable && "cursor-pointer hover:border-brand-gold/70"
                  )}
                  title={step.label}
                >
                  {isCompleted ? (
                    <Check className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                  ) : (
                    <span className={cn(
                      "font-medium",
                      compact ? "text-[10px]" : "text-xs",
                      isCurrent && "text-brand-gold"
                    )}>
                      {index + 1}
                    </span>
                  )}
                </button>
                
                {/* Step label */}
                <span className={cn(
                  "text-center whitespace-nowrap",
                  compact ? "text-[10px] max-w-[50px]" : "text-xs max-w-[70px]",
                  isCurrent ? "text-brand-gold font-medium" : "text-muted-foreground",
                  isCompleted && "text-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with paused indicator and workflow link */}
      <div className={cn(
        "flex items-center justify-between mt-3",
        compact && "mt-2"
      )}>
        {/* Paused indicator */}
        {isPaused ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Pause className="h-3 w-3 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Paused</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {submittedDate && (
              <>
                <span>Submitted:</span>
                <span className="font-medium text-foreground">
                  {format(new Date(submittedDate), 'dd MMM yyyy')}
                </span>
              </>
            )}
          </div>
        )}

        {/* View workflow link */}
        <WorkflowViewerModal 
          currentStep={currentStep} 
          requestId={requestId}
          submittedDate={submittedDate}
        />
      </div>
    </div>
  );
}