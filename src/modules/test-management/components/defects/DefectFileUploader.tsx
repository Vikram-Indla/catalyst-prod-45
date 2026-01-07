/**
 * DefectFileUploader - Drag & drop file uploader for defect attachments
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image, Video, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DefectFileUploaderProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxSize?: number; // in bytes
  accept?: string;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  'image': Image,
  'video': Video,
  'application/pdf': FileText,
};

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  if (type === 'application/pdf') return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DefectFileUploader({ 
  value, 
  onChange, 
  maxSize = 25 * 1024 * 1024,
  accept = 'image/*,video/*,.pdf'
}: DefectFileUploaderProps) {
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Create previews for images
    acceptedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviews(prev => new Map(prev).set(file.name, reader.result as string));
        };
        reader.readAsDataURL(file);
      }
    });
    
    onChange([...value, ...acceptedFiles]);
  }, [value, onChange]);

  const removeFile = useCallback((index: number) => {
    const newFiles = [...value];
    const removed = newFiles.splice(index, 1)[0];
    setPreviews(prev => {
      const next = new Map(prev);
      next.delete(removed.name);
      return next;
    });
    onChange(newFiles);
  }, [value, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {isDragActive 
            ? "Drop files here..." 
            : "Drop files here or click to upload"
          }
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          PNG, JPG, MP4, PDF up to {formatFileSize(maxSize)}
        </p>
      </div>

      {/* File List */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {value.map((file, index) => {
            const Icon = getFileIcon(file.type);
            const preview = previews.get(file.name);
            
            return (
              <div 
                key={`${file.name}-${index}`}
                className="relative group rounded-lg border bg-muted/30 overflow-hidden"
              >
                {/* Preview or Icon */}
                {preview ? (
                  <div className="aspect-square">
                    <img 
                      src={preview} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-muted/50">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                {/* File Info */}
                <div className="p-2 border-t">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DefectFileUploader;
