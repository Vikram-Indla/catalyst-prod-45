// ============================================================
// FILES SECTION - ENTERPRISE V2 DESIGN
// Full file upload, preview, download functionality
// Wired to Supabase storage + task_attachments table
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  File,
  X, 
  Loader2, 
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import type { TaskAttachment } from '../../hooks/useTaskDetails';
import { useDeleteAttachment, useUploadAttachment, useTaskAttachments } from '../../hooks/useTaskDetails';

interface FilesSectionProps {
  taskId: string;
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

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType.startsWith('video/')) return FileVideo;
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return FileArchive;
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
  
  return File;
}

export function FilesSection({ taskId }: FilesSectionProps) {
  const { data: attachments = [], isLoading } = useTaskAttachments(taskId);
  const deleteAttachment = useDeleteAttachment();
  const uploadAttachment = useUploadAttachment();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TaskAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 50MB.`);
        continue;
      }
      
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

  const handleDownload = async (attachment: TaskAttachment) => {
    if (!attachment.file_url) return;

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

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success('Download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Failed to download ${attachment.file_name}`);
      window.open(attachment.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await deleteAttachment.mutateAsync(attachmentId);
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Attachments</span>
          {attachments.length > 0 && (
            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
              {attachments.length}
            </span>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all",
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
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className={cn("w-8 h-8", isDragging ? "text-primary" : "text-muted-foreground")} />
            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Drop files here or <span className="text-primary font-medium">click to browse</span>
              </span>
              <p className="text-xs text-muted-foreground/70 mt-1">Maximum file size: 50MB</p>
            </div>
          </>
        )}
      </label>

      {/* Files Grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map(att => (
            <FileCard
              key={att.id}
              attachment={att}
              onDownload={() => handleDownload(att)}
              onDelete={() => handleDelete(att.id)}
              onPreview={() => setSelectedFile(att)}
              isDeleting={deleteAttachment.isPending}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">No files attached yet</p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={() => handleDownload(selectedFile)}
        />
      )}
    </div>
  );
}

function FileCard({ 
  attachment, 
  onDownload,
  onDelete,
  onPreview,
  isDeleting 
}: { 
  attachment: TaskAttachment;
  onDownload: () => void;
  onDelete: () => void;
  onPreview: () => void;
  isDeleting: boolean;
}) {
  const isImage = attachment.file_type?.startsWith('image/');
  const Icon = getFileIcon(attachment.file_type);
  
  return (
    <div className="group relative flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
      {/* Thumbnail/Icon */}
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {isImage && attachment.file_url ? (
          <img 
            src={attachment.file_url} 
            alt={attachment.file_name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={onPreview}
          />
        ) : (
          <Icon className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      
      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isImage && (
          <button
            onClick={onPreview}
            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDownload}
          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={isDeleting}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{attachment.file_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function FilePreviewModal({ 
  file, 
  onClose,
  onDownload 
}: { 
  file: TaskAttachment; 
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Download button */}
        <button
          onClick={onDownload}
          className="absolute top-2 right-14 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <Download className="w-5 h-5" />
        </button>
        
        {/* Image */}
        <img
          src={file.file_url}
          alt={file.file_name}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        
        {/* File name */}
        <p className="text-white text-center mt-3 text-sm">{file.file_name}</p>
      </div>
    </div>
  );
}
