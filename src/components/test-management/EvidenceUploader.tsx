import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, FileVideo, FileText, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadEvidence } from '@/hooks/useEvidence';
import { useToast } from '@/hooks/use-toast';

interface EvidenceUploaderProps {
  stepId: string;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPTED_FILES = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.mov', '.avi', '.webm'],
  'application/pdf': ['.pdf'],
  'text/*': ['.txt', '.log', '.json', '.xml'],
};

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  stepId,
  onUploadComplete,
}) => {
  const { toast } = useToast();
  const uploadMutation = useUploadEvidence();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        await uploadMutation.mutateAsync({ stepId, file });
        toast({
          title: 'Success',
          description: `${file.name} uploaded successfully`,
        });
        onUploadComplete?.();
      } catch (error: any) {
        toast({
          title: 'Upload Failed',
          description: error.message || `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }
  }, [stepId, uploadMutation, toast, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-brand-gold bg-brand-gold/10' : 'border-border hover:border-brand-gold/50'}
        ${uploadMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} disabled={uploadMutation.isPending} />
      <div className="flex flex-col items-center gap-2">
        <Paperclip className={`h-8 w-8 ${isDragActive ? 'text-brand-gold' : 'text-muted-foreground'}`} />
        {uploadMutation.isPending ? (
          <p className="text-sm text-foreground">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-sm text-brand-gold font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm text-foreground font-medium">Drag files here or click to upload</p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, MP4, PDF, TXT, LOG (Max 10MB per file)
            </p>
          </>
        )}
      </div>
    </div>
  );
};
