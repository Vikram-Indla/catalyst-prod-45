import { Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  className?: string;
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-[10px]",
      className
    )}>
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">Saving draft...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3 h-3 text-[#0d9488]" />
          <span className="text-gray-500 dark:text-gray-400">Draft saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-red-500">Failed to save</span>
        </>
      )}
    </div>
  );
}
