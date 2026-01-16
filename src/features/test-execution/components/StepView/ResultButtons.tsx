/**
 * ResultButtons - Pass/Fail/Blocked action buttons
 */

import { Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StepStatus } from '../../stores/executionStore';

interface ResultButtonsProps {
  currentStatus: StepStatus;
  onPass: () => void;
  onFail: () => void;
  onBlocked: () => void;
}

export function ResultButtons({ currentStatus, onPass, onFail, onBlocked }: ResultButtonsProps) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button
        onClick={onPass}
        className={cn(
          'flex-1 h-12 text-base font-medium transition-all duration-200',
          currentStatus === 'passed'
            ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/30'
            : 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100 hover:shadow-md'
        )}
      >
        <Check className="w-5 h-5 mr-2" />
        PASS
      </Button>
      
      <Button
        onClick={onFail}
        className={cn(
          'flex-1 h-12 text-base font-medium transition-all duration-200',
          currentStatus === 'failed'
            ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30'
            : 'bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100 hover:shadow-md'
        )}
      >
        <X className="w-5 h-5 mr-2" />
        FAIL
      </Button>
      
      <Button
        onClick={onBlocked}
        className={cn(
          'flex-1 h-12 text-base font-medium transition-all duration-200',
          currentStatus === 'blocked'
            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/30'
            : 'bg-amber-50 text-amber-700 border-2 border-amber-300 hover:bg-amber-100 hover:shadow-md'
        )}
      >
        <AlertTriangle className="w-5 h-5 mr-2" />
        BLOCKED
      </Button>
    </div>
  );
}
