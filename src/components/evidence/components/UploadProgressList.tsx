// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD PROGRESS LIST
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Check, AlertCircle, X, FileIcon, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadProgress } from '../types';
import { formatFileSize } from '../utils/validation';

interface UploadProgressListProps {
  uploads: UploadProgress[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export const UploadProgressList: React.FC<UploadProgressListProps> = ({
  uploads,
  onCancel,
  onRetry
}) => {
  if (uploads.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {uploads.map(upload => (
        <div
          key={upload.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-colors",
            upload.status === 'error' ? "bg-destructive/10" : "bg-muted/50"
          )}
        >
          {/* Thumbnail */}
          {upload.thumbnailUrl ? (
            <img
              src={upload.thumbnailUrl}
              alt=""
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
              <FileIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {upload.fileName}
            </p>

            {upload.status === 'uploading' && (
              <div className="mt-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{upload.progress}%</span>
              </div>
            )}

            {upload.status === 'success' && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Uploaded
              </span>
            )}

            {upload.status === 'error' && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {upload.error || 'Upload failed'}
              </span>
            )}
          </div>

          {/* Actions */}
          {upload.status === 'uploading' && (
            <button
              onClick={() => onCancel(upload.id)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Cancel upload"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {upload.status === 'error' && (
            <button
              onClick={() => onRetry(upload.id)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
