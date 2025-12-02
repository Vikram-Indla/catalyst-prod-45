// ==============================================
// IDEA ATTACHMENT UPLOAD COMPONENT
// Based on Jira Align Ideation documentation
// File size limit: 4MB, Valid types per spec
// ==============================================

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Per Jira Align spec: 4MB limit
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

// Allowed file types per spec
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  // Text
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
};

interface IdeaAttachmentUploadProps {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function IdeaAttachmentUpload({ onUpload, disabled, compact }: IdeaAttachmentUploadProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(rejection => {
      rejection.errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`${rejection.file.name} is too large. Maximum size is 4MB.`);
        } else if (error.code === 'file-invalid-type') {
          toast.error(`${rejection.file.name} has an invalid file type.`);
        } else {
          toast.error(`${rejection.file.name}: ${error.message}`);
        }
      });
    });

    // Add accepted files
    if (acceptedFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...acceptedFiles]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled,
  });

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (pendingFiles.length > 0) {
      onUpload(pendingFiles);
      setPendingFiles([]);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div
          {...getRootProps()}
          className={cn(
            "border border-dashed rounded-md p-3 text-center cursor-pointer transition-colors",
            isDragActive ? "border-brand-gold bg-brand-gold/5" : "border-border hover:border-brand-gold/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span>{isDragActive ? 'Drop files here' : 'Drop files or click to upload'}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Max 4MB per file</p>
        </div>

        {pendingFiles.length > 0 && (
          <div className="space-y-1">
            {pendingFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 text-sm bg-muted/30 rounded px-2 py-1">
                {getFileIcon(file.type)}
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button size="sm" onClick={handleUpload} className="w-full">
              Upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-brand-gold bg-brand-gold/5" : "border-border hover:border-brand-gold/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        {isDragActive ? (
          <p className="text-sm">Drop the files here...</p>
        ) : (
          <>
            <p className="text-sm">Drag & drop files here, or click to select</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supported: Images, PDF, Word, Excel, PowerPoint, Text (Max 4MB)
            </p>
          </>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pending uploads:</p>
          {pendingFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-sm bg-muted/30 rounded-md px-3 py-2">
              {getFileIcon(file.type)}
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={handleUpload} className="w-full">
            Upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
