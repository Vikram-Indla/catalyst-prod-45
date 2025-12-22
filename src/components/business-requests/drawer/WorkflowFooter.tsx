/**
 * WorkflowFooter - Workflow Progress Stepper Footer
 * Shows current workflow position with step navigation
 * Catalyst Design System with proper dark mode support
 */

import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Workflow step definitions
export type ProcessStep = 
  | 'new_request'
  | 'scored'
  | 'ea_review'
  | 'budget_review'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'on_hold';

export interface WorkflowStep {
  key: ProcessStep;
  label: string;
  order: number;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'new_request', label: 'New Request', order: 1 },
  { key: 'scored', label: 'Scored', order: 2 },
  { key: 'ea_review', label: 'EA Review', order: 3 },
  { key: 'budget_review', label: 'Budget', order: 4 },
  { key: 'ready', label: 'Ready', order: 5 },
];

interface WorkflowFooterProps {
  currentStep: ProcessStep;
  onAdvance?: () => void;
  nextAction?: { label: string; nextStep: ProcessStep } | null;
  disabled?: boolean;
}

export function WorkflowFooter({ 
  currentStep, 
  onAdvance, 
  nextAction,
  disabled = false
}: WorkflowFooterProps) {
  // Find the index of the current step in the main workflow
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.key === currentStep);
  const isTerminalState = ['completed', 'rejected', 'on_hold'].includes(currentStep);

  return (
    <footer 
      className="shrink-0 px-5 py-4 bg-card border-t border-border"
    >
      <div className="flex items-center gap-6">
        {/* Workflow Steps */}
        <div className="flex-1 flex items-center">
          {WORKFLOW_STEPS.map((step, index) => {
            const isComplete = currentIndex > index;
            const isCurrent = currentIndex === index;
            const isPending = currentIndex < index;
            
            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                {/* Connector Line */}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div 
                    className={cn(
                      "absolute top-[10px] left-[calc(50%+12px)] right-[calc(-50%+12px)] h-[3px] rounded-sm transition-colors",
                      isComplete ? "bg-green-500 dark:bg-green-400" : "bg-border"
                    )}
                  />
                )}
                
                {/* Step Dot */}
                <div className={cn(
                  "relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all border-[3px]",
                  isComplete && "bg-green-500 dark:bg-green-400 border-green-500 dark:border-green-400",
                  isCurrent && "bg-brand-primary border-brand-primary shadow-[0_0_0_4px_hsl(var(--brand-primary)/0.15)]",
                  isPending && "bg-card border-border"
                )}>
                  {isComplete && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                
                {/* Step Label */}
                <span className={cn(
                  "text-[10px] font-medium mt-1.5 text-center whitespace-nowrap transition-colors",
                  isCurrent && "text-brand-primary font-semibold",
                  isComplete && "text-green-600 dark:text-green-400",
                  isPending && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Action Button */}
        {nextAction && !isTerminalState && (
          <Button
            onClick={onAdvance}
            disabled={disabled}
            className="gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white"
          >
            {nextAction.label}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        
        {/* Terminal State Indicator */}
        {isTerminalState && (
          <div className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold",
            currentStep === 'completed' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            currentStep === 'rejected' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            currentStep === 'on_hold' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          )}>
            {currentStep === 'completed' && 'Completed'}
            {currentStep === 'rejected' && 'Rejected'}
            {currentStep === 'on_hold' && 'On Hold'}
          </div>
        )}
      </div>
    </footer>
  );
}

// Helper function to get next workflow action
export function getNextWorkflowAction(currentStep: ProcessStep): { label: string; nextStep: ProcessStep } | null {
  switch (currentStep) {
    case 'new_request': return { label: 'Submit for Scoring', nextStep: 'scored' };
    case 'scored': return { label: 'Submit for EA Review', nextStep: 'ea_review' };
    case 'ea_review': return { label: 'Submit for Budget', nextStep: 'budget_review' };
    case 'budget_review': return { label: 'Mark Ready', nextStep: 'ready' };
    case 'ready': return { label: 'Start Implementation', nextStep: 'in_progress' };
    case 'in_progress': return { label: 'Mark Complete', nextStep: 'completed' };
    default: return null;
  }
}
