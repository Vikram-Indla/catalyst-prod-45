/**
 * AttachmentUploadModal - Modal for uploading attachments to business requests
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, FileText, Image, File, Trash2, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AttachmentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestKey: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType?.startsWith('image/')) return Image;
  if (mimeType?.includes('pdf') || mimeType?.includes('document')) return FileText;
  return File;
};

export function AttachmentUploadModal({
  open,
  onOpenChange,
  requestId,
  requestKey,
}: AttachmentUploadModalProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch existing attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['business-request-attachments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', 'business_request')
        .eq('entity_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Attachment[];
    },
    enabled: open && !!requestId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileName = `business-requests/${requestId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          entity_type: 'business_request',
          entity_id: requestId,
          uploaded_by: user.user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-attachments', requestId] });
      toast.success('Attachment uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.file_path]);

      if (storageError) console.warn('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-attachments', requestId] });
      toast.success('Attachment deleted');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Handle file drop/select
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      await uploadMutation.mutateAsync(file);
    }
    setUploading(false);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Download file
  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Attachments for {requestKey}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? 'Drop files here...'
                    : 'Drag & drop files here, or click to select'}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Max 10MB per file. Supports images, PDFs, and documents.
                </p>
              </div>
            )}
          </div>

          {/* Attachments List */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Uploaded Files ({attachments.length})
            </h4>
            <ScrollArea className="h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No attachments yet
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => {
                    const FileIcon = getFileIcon(attachment.mime_type);
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group"
                      >
                        <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.file_size)} •{' '}
                            {format(new Date(attachment.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDownload(attachment)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(attachment)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
