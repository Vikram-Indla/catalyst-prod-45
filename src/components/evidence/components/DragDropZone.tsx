// ═══════════════════════════════════════════════════════════════════════════
// DRAG & DROP ZONE
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateFile } from '../utils/validation';

interface DragDropZoneProps {
  onDrop: (files: File[]) => void;
  disabled?: boolean;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({ onDrop, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(validateFile);

    if (validFiles.length < files.length) {
      toast.error('Some files were rejected (invalid type or too large)');
    }

    if (validFiles.length > 0) {
      onDrop(validFiles);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-all",
        isDragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Upload className={cn(
        "w-10 h-10 mx-auto mb-3 transition-colors",
        isDragOver ? "text-primary" : "text-muted-foreground"
      )} />
      <p className="text-sm text-muted-foreground mb-1">
        {isDragOver ? "Drop files here" : "Drag and drop files"}
      </p>
      <p className="text-xs text-muted-foreground/70">
        PNG, JPEG, GIF, WebP, PDF, MP4, WebM • Max 10MB
      </p>
    </div>
  );
};
