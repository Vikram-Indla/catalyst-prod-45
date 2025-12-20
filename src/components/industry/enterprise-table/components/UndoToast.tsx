import React from 'react';
import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UndoToastProps {
  changeCount: number;
  onUndo: () => void;
  className?: string;
}

export function UndoToast({
  changeCount,
  onUndo,
  className,
}: UndoToastProps) {
  if (changeCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg",
      "bg-foreground text-background",
      "animate-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      <Undo2 className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">
        {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={onUndo}
        className="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Undo (Ctrl+Z)
      </Button>
    </div>
  );
}

// Success toast for confirmations
interface SuccessToastProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessToast({
  message,
  onDismiss,
  className,
}: SuccessToastProps) {
  return (
    <div className={cn(
      "fixed top-6 right-6 z-50",
      "flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg",
      "bg-green-600 text-white",
      "animate-in slide-in-from-top-4 duration-300",
      className
    )}>
      <svg 
        className="h-4 w-4 flex-shrink-0" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 13l4 4L19 7" 
        />
      </svg>
      <span className="text-sm">{message}</span>
    </div>
  );
}
