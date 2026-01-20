// ============================================================
// UploadProgressDisplay - Progress indicator for file uploads
// ============================================================

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { UploadProgress } from '../../types/evidence';

interface UploadProgressDisplayProps {
  uploads: UploadProgress[];
  onClear?: () => void;
}

export function UploadProgressDisplay({ uploads, onClear }: UploadProgressDisplayProps) {
  if (uploads.length === 0) return null;

  const allComplete = uploads.every(u => u.status === 'complete' || u.status === 'error');

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Uploading files...</span>
        {allComplete && onClear && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {uploads.map((upload, index) => (
        <div key={`${upload.file_name}-${index}`} className="space-y-1">
          <div className="flex items-center gap-2">
            {upload.status === 'uploading' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {upload.status === 'complete' && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {upload.status === 'error' && (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm truncate flex-1">{upload.file_name}</span>
            <span className="text-xs text-muted-foreground">
              {upload.progress}%
            </span>
          </div>

          <Progress
            value={upload.progress}
            className={cn(
              'h-1',
              upload.status === 'error' && 'bg-destructive/20'
            )}
          />

          {upload.error_message && (
            <p className="text-xs text-destructive">{upload.error_message}</p>
          )}
        </div>
      ))}
    </div>
  );
}
