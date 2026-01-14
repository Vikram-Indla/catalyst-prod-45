// ============================================================
// ATTACHMENTS SECTION - POLISHED
// Better upload zone with icon circle, drag feedback
// ============================================================

import { useState, useCallback } from 'react';
import { Paperclip, Upload, FileText, X } from 'lucide-react';
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
    // File upload would go here - requires storage bucket setup
    console.log('Files dropped:', e.dataTransfer.files);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">Attachments</span>
        {attachments && attachments.length > 0 && (
          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-semibold text-gray-500">
            {attachments.length}
          </span>
        )}
      </div>
      
      {/* Attachment Grid */}
      {attachments && attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map(att => (
            <AttachmentCard
              key={att.id}
              attachment={att}
              onDelete={() => deleteAttachment.mutate(att.id)}
            />
          ))}
        </div>
      )}

      {/* STYLED Upload Zone */}
      <label
        className={cn(
          "flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all",
          isDragging 
            ? "border-primary bg-blue-50" 
            : "border-gray-300 hover:border-primary hover:bg-gray-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input type="file" multiple className="hidden" />
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
          isDragging ? "bg-primary/10" : "bg-gray-100"
        )}>
          <Upload className={cn("w-5 h-5", isDragging ? "text-primary" : "text-gray-400")} />
        </div>
        <div className="text-center">
          <span className="text-sm text-gray-600">
            <span className="text-primary font-medium">Click to upload</span> or drag and drop
          </span>
          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, PDF up to 10MB</p>
        </div>
      </label>
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
    <div className="group relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-primary hover:shadow-sm transition-all">
      <div className="aspect-video flex items-center justify-center bg-gray-100">
        {isImage && attachment.file_url ? (
          <img 
            src={attachment.file_url} 
            alt={attachment.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-8 h-8 text-gray-400" />
        )}
      </div>
      
      <div className="p-2">
        <p className="text-xs font-medium text-gray-700 truncate">{attachment.file_name}</p>
        <p className="text-[10px] text-gray-400">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-white/90 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 shadow-sm transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
