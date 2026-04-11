// ============================================================
// ATTACHMENTS SECTION - CONTENT ONLY (no header, wrapped by CollapsibleSection)
// Compact upload zone with real file upload functionality
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { TaskAttachment } from '../../hooks/useTaskDetails';
import { useDeleteAttachment, useUploadAttachment } from '../../hooks/useTaskDetails';

interface AttachmentsSectionProps {
  taskId: string;
  attachments: TaskAttachment[];
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getStoragePathFromUrl(fileUrl: string): string | null {
  // We store a public URL, but downloads are more reliable via storage.download().
  // Extract the object path after the bucket segment: /.../attachments/<path>
  try {
    const safeUrl = fileUrl.replace(/ /g, '%20');
    const url = new URL(safeUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const bucketIndex = segments.findIndex((s) => s === 'attachments');
    if (bucketIndex === -1) return null;
    const path = segments.slice(bucketIndex + 1).join('/');
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

export function AttachmentsSection({ taskId, attachments }: AttachmentsSectionProps) {
  const deleteAttachment = useDeleteAttachment();
  const uploadAttachment = useUploadAttachment();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      try {
        await uploadAttachment.mutateAsync({ taskId, file });
        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [taskId, uploadAttachment]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // CONTENT ONLY - no header (CollapsibleSection provides the header)
  return (
    <div className="space-y-2">
      {/* Attachment List */}
      {attachments?.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map(att => (
            <AttachmentItem
              key={att.id}
              attachment={att}
              onDelete={() => deleteAttachment.mutate(att.id)}
            />
          ))}
        </div>
      )}

      {/* Upload Zone with real functionality */}
      <label
        className={cn(
          "flex items-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer transition-all",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5",
          uploadAttachment.isPending && "opacity-50 pointer-events-none"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          className="hidden" 
          onChange={handleFileChange}
        />
        {uploadAttachment.isPending ? (
          <>
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className={cn("w-4 h-4", isDragging ? "text-primary" : "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground">
              Drop files here or <span className="text-primary font-medium">click to upload</span>
            </span>
          </>
        )}
      </label>
    </div>
  );
}

function AttachmentItem({ 
  attachment, 
  onDelete 
}: { 
  attachment: TaskAttachment;
  onDelete: () => void;
}) {
  const isImage = attachment.file_type?.startsWith('image/');

  const handleDownload = async () => {
    if (!attachment.file_url) return;

    // Prefer authenticated download (works even when browsers block cross-origin download attr)
    const storagePath = getStoragePathFromUrl(attachment.file_url);
    if (!storagePath) {
      window.open(attachment.file_url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(storagePath);

      if (error) throw new Error(error.message);

      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Failed to download ${attachment.file_name}`);

      // Last-resort fallback
      window.open(attachment.file_url, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <div 
      className="group flex items-center gap-2 px-3 py-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={handleDownload}
      title={`Click to download ${attachment.file_name}`}
    >
      {/* Thumbnail or Icon */}
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {isImage && attachment.file_url ? (
          <img
            src={attachment.file_url}
            alt={attachment.file_name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      
      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)} · Click to download
        </p>
      </div>
      
      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
