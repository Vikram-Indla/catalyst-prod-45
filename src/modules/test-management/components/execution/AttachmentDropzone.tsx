/**
 * Attachment Dropzone - Drag and drop file upload for test execution
 */

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Upload, File, X, Image, FileText, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ExecutionAttachment } from '../../hooks/useExecutionAttachments';

interface AttachmentDropzoneProps {
  onUpload: (files: File[]) => Promise<void>;
  attachments: ExecutionAttachment[];
  onDelete: (attachment: ExecutionAttachment) => void;
  isUploading: boolean;
  uploadProgress: number;
  compact?: boolean;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType === 'application/pdf') return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function AttachmentDropzone({
  onUpload,
  attachments,
  onDelete,
  isUploading,
  uploadProgress,
  compact = false,
}: AttachmentDropzoneProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv', '.log'],
      'video/*': ['.mp4', '.webm'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  });

  if (compact && attachments.length === 0 && !isDragActive) {
    return (
      <button
        {...getRootProps()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
      >
        <input {...getInputProps()} />
        <Upload className="h-3.5 w-3.5" />
        Attach
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn(
          'h-8 w-8 mx-auto mb-2 transition-colors',
          isDragActive ? 'text-primary' : 'text-muted-foreground'
        )} />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm font-medium">Drop files or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              Images, PDFs, videos up to 10MB
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Uploading... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Attachments ({attachments.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {attachments.map((attachment) => {
              const Icon = getFileIcon(attachment.mimeType);
              const isImage = attachment.mimeType.startsWith('image/');

              return (
                <div
                  key={attachment.id}
                  className="group relative flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  {isImage ? (
                    <img
                      src={attachment.url}
                      alt={attachment.fileName}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-background flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium truncate block hover:text-primary"
                    >
                      {attachment.fileName}
                    </a>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1 bg-background border shadow-sm"
                    onClick={() => onDelete(attachment)}
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
