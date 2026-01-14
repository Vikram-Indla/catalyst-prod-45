// ============================================================\
// ATTACHMENTS SECTION COMPONENT
// File grid with drag-drop upload zone
// ============================================================\

import { useState, useCallback } from 'react';
import { Paperclip, Upload, FileText, Image, X } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '../../types/kanban';
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
    // File upload would go here - requires storage bucket setup
    console.log('Files dropped:', e.dataTransfer.files);
  }, []);

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Paperclip}
        title="Attachments"
        badge={attachments?.length || 0}
      />
      
      <div className="space-y-3">
        {/* Existing attachments */}
        {attachments?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {attachments.map(att => (
              <AttachmentCard
                key={att.id}
                attachment={att}
                onDelete={() => deleteAttachment.mutate(att.id)}
              />
            ))}
          </div>
        )}
        
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted hover:border-muted-foreground/50"
          )}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            PNG, JPG, PDF up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
}

function AttachmentCard({ 
  attachment, 
  onDelete 
}: { 
  attachment: TaskAttachment;
  onDelete: () => void;
}) {
  const isImage = attachment.file_type?.startsWith('image/');
  
  return (
    <div className="group relative bg-muted/30 rounded-lg overflow-hidden border border-border hover:border-muted-foreground/30 transition-colors">
      <div className="aspect-video flex items-center justify-center bg-muted/50">
        {isImage && attachment.file_url ? (
          <img 
            src={attachment.file_url} 
            alt={attachment.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      
      <div className="p-2">
        <p className="text-xs font-medium truncate">{attachment.file_name}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-background/80 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
