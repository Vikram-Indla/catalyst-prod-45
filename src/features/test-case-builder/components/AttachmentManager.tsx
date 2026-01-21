// =====================================================
// ATTACHMENT MANAGER COMPONENT
// Upload and manage test case attachments
// =====================================================

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
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
import { 
  Upload, 
  Paperclip, 
  Image, 
  Video, 
  FileText, 
  File, 
  Trash2, 
  Download,
  Eye,
  X
} from 'lucide-react';
import { 
  useCaseAttachments, 
  useUploadAttachment, 
  useDeleteAttachment,
  useAttachmentUrl,
  formatFileSize,
  TestAttachment
} from '@/hooks/test-cases/useTestAttachments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AttachmentManagerProps {
  caseId: string;
  stepId?: string;
  compact?: boolean;
}

const ATTACHMENT_ICONS = {
  image: Image,
  video: Video,
  'file-text': FileText,
  file: File,
};

function getIconType(mimeType: string): keyof typeof ATTACHMENT_ICONS {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'file-text';
  return 'file';
}

function AttachmentPreview({ attachment }: { attachment: TestAttachment }) {
  const { data: signedUrl } = useAttachmentUrl(attachment.file_path);
  const [isOpen, setIsOpen] = useState(false);

  const isImage = attachment.mime_type.startsWith('image/');
  const isVideo = attachment.mime_type.startsWith('video/');

  if (!signedUrl) return null;

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <Eye className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{attachment.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px]">
            {isImage && (
              <img 
                src={signedUrl} 
                alt={attachment.file_name} 
                className="max-w-full max-h-[600px] object-contain"
              />
            )}
            {isVideo && (
              <video 
                src={signedUrl} 
                controls 
                className="max-w-full max-h-[600px]"
              />
            )}
            {!isImage && !isVideo && (
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4" />
                <p>Preview not available for this file type</p>
                <Button asChild className="mt-4">
                  <a href={signedUrl} download={attachment.file_name}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AttachmentManager({ caseId, stepId, compact = false }: AttachmentManagerProps) {
  const { data: attachments = [], isLoading } = useCaseAttachments(caseId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  
  const [deleteTarget, setDeleteTarget] = useState<TestAttachment | null>(null);

  // Filter attachments if stepId provided
  const filteredAttachments = stepId 
    ? attachments.filter(a => a.test_step_id === stepId)
    : attachments;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        await uploadAttachment.mutateAsync({
          caseId,
          stepId,
          file,
          attachmentType: file.type.startsWith('image/') ? 'screenshot' : 
                         file.type.startsWith('video/') ? 'video' : 
                         file.type.includes('pdf') || file.type.includes('document') ? 'document' : 'general',
        });
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
        console.error(error);
      }
    }
  }, [caseId, stepId, uploadAttachment]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv', '.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 52428800, // 50MB
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAttachment.mutateAsync({ 
        attachmentId: deleteTarget.id, 
        caseId 
      });
      toast.success('Attachment deleted');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete attachment');
      console.error(error);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span>{isDragActive ? 'Drop here' : 'Drop files or click'}</span>
          </div>
        </div>

        {filteredAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredAttachments.map((att) => {
              const IconComponent = ATTACHMENT_ICONS[getIconType(att.mime_type)];
              return (
                <Badge key={att.id} variant="secondary" className="gap-1 pr-1">
                  <IconComponent className="h-3 w-3" />
                  <span className="max-w-[100px] truncate">{att.file_name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-destructive/20"
                    onClick={() => setDeleteTarget(att)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
              <AlertDialogDescription>
                Delete "{deleteTarget?.file_name}"? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Attachments
          {filteredAttachments.length > 0 && (
            <Badge variant="secondary">{filteredAttachments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm">Drop files here...</p>
          ) : (
            <>
              <p className="text-sm">Drag & drop files here, or click to select</p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, videos, PDFs, documents (max 50MB)
              </p>
            </>
          )}
        </div>

        {/* Attachments List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : filteredAttachments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            No attachments yet
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredAttachments.map((att) => {
                const IconComponent = ATTACHMENT_ICONS[getIconType(att.mime_type)];
                return (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      att.mime_type.startsWith('image/') ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                      att.mime_type.startsWith('video/') ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{att.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(att.file_size)} • {att.uploader_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AttachmentPreview attachment={att} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(att)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteAttachment.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
