// ============================================================
// IDEA ATTACHMENTS SECTION - Wired to useIdeaAttachments hooks
// ============================================================

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { useIdeaAttachments, useUploadIdeaAttachment, useDeleteIdeaAttachment } from '@/hooks/ideas';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface IdeaAttachmentsSectionProps {
  ideaId: string;
}

const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'image': Image,
  'application/pdf': FileText,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'text/csv': FileSpreadsheet,
  'text/plain': FileCode,
  'application/json': FileCode,
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  return FILE_ICONS[mimeType] || File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IdeaAttachmentsSection({ ideaId }: IdeaAttachmentsSectionProps) {
  const { user } = useAuth();
  const { data: attachments = [], isLoading } = useIdeaAttachments(ideaId);
  const uploadAttachment = useUploadIdeaAttachment();
  const deleteAttachment = useDeleteIdeaAttachment();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadAttachment.mutateAsync({ ideaId, file });
    }
  }, [ideaId, uploadAttachment]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('attachments')
      .download(filePath);
    
    if (error) {
      console.error('Download error:', error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (attachmentId: string, filePath: string) => {
    await deleteAttachment.mutateAsync({ attachmentId, ideaId, filePath });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
          ${uploadAttachment.isPending ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="font-medium">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (max 10MB per file)
            </p>
          </>
        )}
        {uploadAttachment.isPending && (
          <p className="text-sm text-primary mt-2">Uploading...</p>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No attachments uploaded for this idea.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mime_type);
            
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)} • 
                    {attachment.uploader?.full_name || 'Unknown'} • 
                    {format(new Date(attachment.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {user?.id === attachment.uploaded_by && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id, attachment.file_path)}
                      disabled={deleteAttachment.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
