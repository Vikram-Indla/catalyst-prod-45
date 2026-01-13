/**
 * Evidence Uploader Component
 * Unified upload zone with screen capture, clipboard paste, drag & drop, and file browser
 */

import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Camera,
  Clipboard,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Video,
  File,
  Loader2,
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PendingEvidence, Evidence, UploadProgress, CaptureMethod } from './types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './types';
import { useScreenCapture } from './useScreenCapture';
import { useClipboardPaste } from './useClipboardPaste';

interface EvidenceUploaderProps {
  pendingEvidence: PendingEvidence[];
  uploadedEvidence: Evidence[];
  uploadProgress: UploadProgress[];
  isUploading: boolean;
  onAddPending: (file: File, captureMethod: CaptureMethod) => void;
  onRemovePending: (id: string) => void;
  onDeleteEvidence: (evidence: Evidence) => void;
  disabled?: boolean;
  compact?: boolean;
}

// File icon mapping
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType === 'application/pdf') return FileText;
  return File;
};

// Format file size
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function EvidenceUploader({
  pendingEvidence,
  uploadedEvidence,
  uploadProgress,
  isUploading,
  onAddPending,
  onRemovePending,
  onDeleteEvidence,
  disabled = false,
  compact = false,
}: EvidenceUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Screen capture hook
  const { captureScreen, isCapturing, isSupported: screenCaptureSupported } = useScreenCapture({
    onCapture: (file) => onAddPending(file, 'screen_capture'),
  });

  // Clipboard paste hook
  const { readClipboard } = useClipboardPaste({
    enabled: !disabled,
    onPaste: onAddPending,
  });

  // Handle drag and drop
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(rejection => {
      const errors = rejection.errors.map((e: any) => e.message).join(', ');
      console.warn(`File rejected: ${rejection.file.name} - ${errors}`);
    });

    // Add accepted files
    acceptedFiles.forEach(file => {
      onAddPending(file, 'drag_drop');
    });
  }, [onAddPending]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'video/*': ['.mp4', '.webm'],
    },
    maxSize: MAX_FILE_SIZE,
    disabled: disabled || isUploading,
    noClick: true, // We'll handle click ourselves
    noKeyboard: true,
  });

  // Handle file browser click
  const handleBrowseClick = useCallback(() => {
    open();
  }, [open]);

  // Handle screen capture
  const handleCaptureScreen = useCallback(async () => {
    if (disabled || isCapturing) return;
    await captureScreen();
  }, [disabled, isCapturing, captureScreen]);

  // All items (pending + uploaded)
  const allItems = [
    ...pendingEvidence.map(p => ({ type: 'pending' as const, item: p })),
    ...uploadedEvidence.map(u => ({ type: 'uploaded' as const, item: u })),
  ];

  const hasItems = allItems.length > 0;

  // Compact mode - just show a button row
  if (compact && !hasItems && !isDragActive) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {screenCaptureSupported && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCaptureScreen}
            disabled={disabled || isCapturing}
            className="h-8"
          >
            {isCapturing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5 mr-1.5" />
            )}
            Capture
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => readClipboard()}
          disabled={disabled}
          className="h-8"
        >
          <Clipboard className="h-3.5 w-3.5 mr-1.5" />
          Paste
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBrowseClick}
          disabled={disabled}
          className="h-8"
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload
        </Button>
        <span className="text-xs text-muted-foreground">
          or Ctrl+V to paste
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {screenCaptureSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCaptureScreen}
                disabled={disabled || isCapturing}
                className="h-8"
              >
                {isCapturing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                )}
                Capture Screen
              </Button>
            </TooltipTrigger>
            <TooltipContent>Capture your screen, window, or tab</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => readClipboard()}
              disabled={disabled}
              className="h-8"
            >
              <Clipboard className="h-3.5 w-3.5 mr-1.5" />
              Paste from Clipboard
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paste image from clipboard (or use Ctrl+V)</TooltipContent>
        </Tooltip>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          (disabled || isUploading) && 'pointer-events-none opacity-50'
        )}
        onClick={handleBrowseClick}
      >
        <input {...getInputProps()} />
        <Upload 
          className={cn(
            'h-8 w-8 mx-auto mb-2 transition-colors',
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          )} 
        />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Images, PDFs, videos up to 10MB • Ctrl+V to paste
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map(progress => (
            <div key={progress.fileId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate">{progress.fileName}</span>
                <span className={cn(
                  progress.status === 'error' && 'text-destructive',
                  progress.status === 'success' && 'text-[var(--sem-success)]'
                )}>
                  {progress.status === 'uploading' && `${Math.round(progress.progress)}%`}
                  {progress.status === 'success' && 'Done'}
                  {progress.status === 'error' && 'Failed'}
                </span>
              </div>
              <Progress 
                value={progress.progress} 
                className={cn(
                  'h-1.5',
                  progress.status === 'error' && '[&>div]:bg-destructive'
                )} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Pending & Uploaded Items */}
      {hasItems && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Evidence ({allItems.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allItems.map(({ type, item }) => {
              const isPending = type === 'pending';
              const pending = isPending ? item as PendingEvidence : null;
              const uploaded = !isPending ? item as Evidence : null;

              const preview = pending?.preview || uploaded?.url;
              const fileName = pending?.file.name || uploaded?.fileName || 'Unknown';
              const fileSize = pending?.file.size || uploaded?.fileSize || 0;
              const mimeType = pending?.file.type || uploaded?.mimeType || 'application/octet-stream';
              const isImage = mimeType.startsWith('image/');
              const Icon = getFileIcon(mimeType);

              return (
                <div
                  key={pending?.id || uploaded?.id}
                  className={cn(
                    'group relative flex items-center gap-2 p-2 rounded-lg border transition-colors',
                    isPending 
                      ? 'bg-muted/30 border-dashed border-muted-foreground/30' 
                      : 'bg-muted/50 border-border hover:border-primary/30'
                  )}
                >
                  {/* Thumbnail */}
                  {isImage && preview ? (
                    <img
                      src={preview}
                      alt={fileName}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-background flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{fileName}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{formatFileSize(fileSize)}</span>
                      {isPending && (
                        <span className="text-amber-600 dark:text-amber-400">• Pending</span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1 bg-background border shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPending) {
                        onRemovePending(pending!.id);
                      } else {
                        onDeleteEvidence(uploaded!);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
