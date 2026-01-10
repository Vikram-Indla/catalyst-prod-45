/**
 * ExecutionFooter — Sticky footer with save/complete actions
 */

import { Button } from '@/components/ui/button';
import { X, Save, CheckCircle } from 'lucide-react';

interface ExecutionFooterProps {
  completedSteps: number;
  totalSteps: number;
  allStepsComplete: boolean;
  onCancel: () => void;
  onSaveProgress: () => void;
  onCompleteExecution: () => void;
}

export function ExecutionFooter({
  completedSteps,
  totalSteps,
  allStepsComplete,
  onCancel,
  onSaveProgress,
  onCompleteExecution,
}: ExecutionFooterProps) {
  return (
    <div className="fixed bottom-0 left-64 right-0 bg-background border-t px-6 py-4 flex items-center justify-between z-40">
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="text-muted-foreground" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel Execution
        </Button>

        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{completedSteps} of {totalSteps}</span> steps completed
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onSaveProgress}>
          <Save className="w-4 h-4 mr-2" />
          Save Progress
        </Button>

        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={!allStepsComplete}
          onClick={onCompleteExecution}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Execution
        </Button>
      </div>
    </div>
  );
}
