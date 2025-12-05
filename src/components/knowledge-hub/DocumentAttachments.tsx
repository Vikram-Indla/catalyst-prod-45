/**
 * Document Attachments Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/upload-and-manage-files/
 * - Users can upload and manage files
 * - Files can be attached to pages
 * - Supports various file types
 */
import { useState, useCallback } from 'react';
import { Paperclip, Upload, File, Trash2, Download, FileText, Image, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

interface DocumentAttachmentsProps {
  documentId: string;
}

interface Attachment {
  id: string;
  document_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

const BUCKET_NAME = 'attachments';

export function DocumentAttachments({ documentId }: DocumentAttachmentsProps) {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch attachments
  const { data: attachments, isLoading } = useQuery({
    queryKey: ['kb-attachments', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_document_attachments')
        .select('*')
        .eq('document_id', documentId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as Attachment[];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const filePath = `kb/${documentId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      // Create attachment record
      const { error: dbError } = await supabase
        .from('kb_document_attachments')
        .insert({
          document_id: documentId,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-attachments', documentId] });
      toast.success('File uploaded');
    },
    onError: () => {
      toast.error('Failed to upload file');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([attachment.file_path]);
      
      if (storageError) console.warn('Storage delete error:', storageError);

      // Delete record
      const { error: dbError } = await supabase
        .from('kb_document_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-attachments', documentId] });
      toast.success('File deleted');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });

  // Download file
  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(attachment.file_path);
      
      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
    }
  };

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      uploadMutation.mutate(file);
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const attachmentToDelete = attachments?.find(a => a.id === deleteId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="h-5 w-5 text-brand-gold" />
        <h3 className="font-semibold">Attachments</h3>
        {attachments && attachments.length > 0 && (
          <Badge variant="secondary">{attachments.length}</Badge>
        )}
      </div>

      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-brand-gold bg-brand-gold/5' : 'border-muted hover:border-brand-gold/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Max 10MB per file</p>
      </div>

      {/* Attachments list */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading attachments...</div>
      ) : attachments && attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {getFileIcon(attachment.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(attachment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-2">
          No attachments yet
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{attachmentToDelete?.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => attachmentToDelete && deleteMutation.mutate(attachmentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
