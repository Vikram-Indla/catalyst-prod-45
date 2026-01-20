/**
 * Step Result Buttons - Large buttons for Pass/Fail/Block/Skip
 */
import React from 'react';
import { Check, X, Ban, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StepResult } from '../../types/step-execution';

interface StepResultButtonsProps {
  onResult: (result: StepResult) => void;
  isLoading?: boolean;
  showHints?: boolean;
  currentResult?: StepResult | null;
}

const BUTTONS: { result: StepResult; label: string; hotkey: string; icon: React.ElementType; colorClass: string }[] = [
  { result: 'passed', label: 'Pass', hotkey: 'P', icon: Check, colorClass: 'bg-green-600 hover:bg-green-700 text-white' },
  { result: 'failed', label: 'Fail', hotkey: 'F', icon: X, colorClass: 'bg-red-600 hover:bg-red-700 text-white' },
  { result: 'blocked', label: 'Block', hotkey: 'B', icon: Ban, colorClass: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { result: 'skipped', label: 'Skip', hotkey: 'S', icon: SkipForward, colorClass: 'bg-gray-500 hover:bg-gray-600 text-white' },
];

export const StepResultButtons: React.FC<StepResultButtonsProps> = React.memo(({
  onResult,
  isLoading = false,
  showHints = true,
  currentResult,
}) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {BUTTONS.map(({ result, label, hotkey, icon: Icon, colorClass }) => (
        <Button
          key={result}
          onClick={() => onResult(result)}
          disabled={isLoading}
          className={cn(
            'h-16 flex flex-col items-center justify-center gap-1 transition-all',
            colorClass,
            currentResult === result && 'ring-2 ring-offset-2 ring-offset-background'
          )}
        >
          <Icon className="h-6 w-6" />
          <span className="text-sm font-medium">{label}</span>
          {showHints && (
            <span className="text-xs opacity-75">[{hotkey}]</span>
          )}
        </Button>
      ))}
    </div>
  );
});

StepResultButtons.displayName = 'StepResultButtons';
