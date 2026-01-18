/**
 * SAVING INDICATOR
 * Shows "Saving..." and "Saved ✓" feedback
 */

import { cn } from '@/lib/utils';
import { Loader2, Check } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SavingIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function SavingIndicator({ status, className }: SavingIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
      status === 'saving' && "bg-muted text-muted-foreground",
      status === 'saved' && "bg-emerald-50 text-emerald-600",
      status === 'error' && "bg-red-50 text-red-600",
      className
    )}>
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </>
      )}
      {status === 'error' && (
        <span>Failed to save</span>
      )}
    </div>
  );
}
