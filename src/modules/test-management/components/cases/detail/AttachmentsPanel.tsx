/**
 * Attachments Panel - Section 3
 * Displays and manages file attachments
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Paperclip,
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  ExternalLink,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attachment, AttachmentTypeEnum } from '../../../types/test-case-detail';

// =============================================
// FILE ICON
// =============================================

function FileIcon({ type, mimeType }: { type: AttachmentTypeEnum; mimeType: string }) {
  if (type === 'image' || mimeType.startsWith('image/')) {
    return <Image className="w-5 h-5 text-purple-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileText className="w-5 h-5 text-emerald-500" />;
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return <FileText className="w-5 h-5 text-blue-500" />;
  }
  return <File className="w-5 h-5 text-slate-400" />;
}

// =============================================
// ATTACHMENT ITEM
// =============================================

interface AttachmentItemProps {
  attachment: Attachment;
  isEditing: boolean;
  onDelete: () => void;
  onPreview: () => void;
}

function AttachmentItem({ attachment, isEditing, onDelete, onPreview }: AttachmentItemProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = attachment.type === 'image' || attachment.mimeType.startsWith('image/');

  return (
    <div className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors">
      {/* Preview or Icon */}
      {isImage ? (
        <div
          className="w-12 h-12 rounded bg-slate-100 bg-cover bg-center cursor-pointer"
          style={{ backgroundImage: `url(${attachment.url})` }}
          onClick={onPreview}
        />
      ) : (
        <div className="w-12 h-12 rounded bg-slate-50 flex items-center justify-center">
          <FileIcon type={attachment.type} mimeType={attachment.mimeType} />
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate font-medium">{attachment.name}</p>
        <p className="text-xs text-slate-400">
          {formatSize(attachment.size)} • Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isImage && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPreview}>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <a href={attachment.url} download={attachment.name}>
            <Download className="w-3.5 h-3.5" />
          </a>
        </Button>
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================
// UPLOAD PROGRESS
// =============================================

interface UploadingFile {
  name: string;
  progress: number;
  error?: string;
}

function UploadProgress({ files, onCancel }: { files: UploadingFile[]; onCancel: (name: string) => void }) {
  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.name}
          className={cn(
            'flex items-center gap-3 p-3 border rounded-lg',
            file.error ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">{file.name}</p>
            {file.error ? (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                {file.error}
              </p>
            ) : (
              <Progress value={file.progress} className="h-1 mt-2" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onCancel(file.name)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// =============================================
// MAIN PANEL
// =============================================

interface AttachmentsPanelProps {
  attachments: Attachment[];
  isEditing: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

export function AttachmentsPanel({
  attachments,
  isEditing,
  onUpload,
  onDelete,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  allowedMimeTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'],
}: AttachmentsPanelProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        // Check file size
        if (file.size > maxFileSize) {
          setUploadingFiles((prev) => [
            ...prev,
            { name: file.name, progress: 0, error: 'File too large (max 5MB)' },
          ]);
          continue;
        }

        // Add to uploading list
        setUploadingFiles((prev) => [...prev, { name: file.name, progress: 0 }]);

        try {
          // Simulate progress
          for (let i = 0; i <= 100; i += 20) {
            await new Promise((r) => setTimeout(r, 100));
            setUploadingFiles((prev) =>
              prev.map((f) => (f.name === file.name ? { ...f, progress: i } : f))
            );
          }

          await onUpload(file);

          // Remove from uploading
          setUploadingFiles((prev) => prev.filter((f) => f.name !== file.name));
        } catch (error) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.name === file.name ? { ...f, error: 'Upload failed' } : f
            )
          );
        }
      }
    },
    [onUpload, maxFileSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !isEditing,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
  });

  const handleCancelUpload = (name: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.name !== name));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700">Attachments</h3>
          <Badge variant="secondary" className="text-xs">
            {attachments.length}
          </Badge>
        </div>
      </div>

      {/* Drop Zone */}
      {isEditing && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">
            {isDragActive
              ? 'Drop files here...'
              : 'Drag & drop files, or click to select'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Max 5MB per file. Supports images, PDFs, and documents.
          </p>
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <UploadProgress files={uploadingFiles} onCancel={handleCancelUpload} />
      )}

      {/* Attachments List */}
      {attachments.length === 0 && uploadingFiles.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No attachments</p>
          {isEditing && (
            <p className="text-xs text-slate-400 mt-1">
              Upload files to attach to this test case
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              isEditing={isEditing}
              onDelete={() => onDelete(attachment.id)}
              onPreview={() => setPreviewUrl(attachment.url)}
            />
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
