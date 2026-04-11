/**
 * EntityAttachmentsPanel — Generic reusable attachments panel for TestHub entities
 */
import React, { useState, useCallback } from 'react';
import { Paperclip, Upload, FileText, Image, Film, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useEntityAttachments,
  useUploadEntityAttachment,
  useDeleteEntityAttachment,
  EntityAttachment,
} from '@/hooks/useEntityAttachments';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

interface EntityAttachmentsPanelProps {
  entityType: string;
  entityId: string | undefined;
  title?: string;
}

const BUCKET = 'defect-attachments';

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(mime: string | null) {
  if (!mime) return FileText;
  if (mime.startsWith('image/')) return Image;
  if (mime.startsWith('video/')) return Film;
  return FileText;
}

export function EntityAttachmentsPanel({
  entityType,
  entityId,
  title = 'Attachments',
}: EntityAttachmentsPanelProps) {
  const { data: attachments = [], isLoading } = useEntityAttachments(entityType, entityId);
  const uploadMutation = useUploadEntityAttachment(entityType, entityId);
  const deleteMutation = useDeleteEntityAttachment(entityType, entityId);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(files);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [uploadMutation]);

  const handleDownload = useCallback(async (att: EntityAttachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Failed to generate download link');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }, []);

  const handleDelete = useCallback(async (att: EntityAttachment) => {
    try {
      await deleteMutation.mutateAsync(att);
      toast.success('Attachment deleted');
    } catch {
      toast.error('Failed to delete attachment');
    }
  }, [deleteMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    multiple: true,
    maxSize: 10485760,
  });

  if (!entityId) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">({attachments.length})</span>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-[#2563EB] bg-[#2563EB]/5'
            : 'border-border hover:border-[#2563EB]/50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground">Max 10MB per file</p>
          </div>
        )}
      </div>

      {/* Attachment list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No attachments yet</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mime_type);
            return (
              <div
                key={att.id}
                className="group flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-xs">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(att.file_size)}
                      {att.created_at && (
                        <> · {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => { e.stopPropagation(); handleDownload(att); }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(att); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
