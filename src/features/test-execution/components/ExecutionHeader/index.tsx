/**
 * ExecutionHeader - Top bar with back button, test badge, step progress, timer, exit
 */

import { ArrowLeft, X, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepDots } from './StepDots';
import { Timer } from './Timer';
import { cn } from '@/lib/utils';

interface ExecutionHeaderProps {
  testCaseId: string;
  testCaseTitle: string;
  currentStep: number;
  totalSteps: number;
  elapsedTime: string;
  isTimerRunning: boolean;
  steps: Array<{ status: string }>;
  onBack: () => void;
  onExit: () => void;
  onToggleTimer: () => void;
  onStepClick: (index: number) => void;
}

export function ExecutionHeader({
  testCaseId,
  testCaseTitle,
  currentStep,
  totalSteps,
  elapsedTime,
  isTimerRunning,
  steps,
  onBack,
  onExit,
  onToggleTimer,
  onStepClick,
}: ExecutionHeaderProps) {
  return (
    <header className="bg-background border-b px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Back button and test info */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Run
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{testCaseId}:</span>
            <span className="text-sm text-foreground truncate max-w-[300px]">{testCaseTitle}</span>
          </div>
        </div>
        
        {/* Center: Step progress */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </span>
          <StepDots
            steps={steps}
            currentIndex={currentStep - 1}
            onStepClick={onStepClick}
          />
        </div>
        
        {/* Right: Timer and exit */}
        <div className="flex items-center gap-3">
          <Timer time={elapsedTime} isRunning={isTimerRunning} onToggle={onToggleTimer} />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
