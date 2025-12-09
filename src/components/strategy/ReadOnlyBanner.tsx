import { AlertTriangle, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadOnlyBannerProps {
  message?: string;
  className?: string;
}

export function ReadOnlyBanner({ 
  message = "Archived snapshot • Read-only", 
  className 
}: ReadOnlyBannerProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 bg-muted border-b text-sm text-muted-foreground',
      className
    )}>
      <Archive className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

interface ReadOnlyWarningProps {
  className?: string;
}

export function ReadOnlyWarning({ className }: ReadOnlyWarningProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm',
      className
    )}>
      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <span className="text-amber-800">
        This snapshot is archived and cannot be modified.
      </span>
    </div>
  );
}
