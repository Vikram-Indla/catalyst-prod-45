// ============================================================
// ATTACHMENTS SECTION - CONTENT ONLY (no header, wrapped by CollapsibleSection)
// Compact upload zone, no huge box for empty state
// ============================================================

import { useState, useCallback } from 'react';
import { Upload, FileText, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskAttachment } from '../../hooks/useTaskDetails';
import { useDeleteAttachment } from '../../hooks/useTaskDetails';

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

export function AttachmentsSection({ taskId, attachments }: AttachmentsSectionProps) {
  const deleteAttachment = useDeleteAttachment();
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    console.log('Files dropped:', e.dataTransfer.files);
  }, []);

  const hasAttachments = attachments && attachments.length > 0;

  // CONTENT ONLY - no header (CollapsibleSection provides the header)
  return (
    <div className="space-y-2">
      {/* Attachment List */}
      {hasAttachments && (
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

      {/* COMPACT Upload Zone - not huge box */}
      <label
        className={cn(
          "flex items-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer transition-all",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input type="file" multiple className="hidden" />
        <Upload className={cn("w-4 h-4", isDragging ? "text-primary" : "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground">
          Drop files here or <span className="text-primary font-medium">click to upload</span>
        </span>
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
  
  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
      {/* Thumbnail or Icon */}
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {isImage && attachment.file_url ? (
          <img 
            src={attachment.file_url} 
            alt={attachment.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      
      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{attachment.file_name}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      
      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
