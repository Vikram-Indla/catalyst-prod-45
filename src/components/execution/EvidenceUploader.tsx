import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { uploadEvidence, EvidenceFile } from '@/services/executionService';
import { Upload, Image, Video, FileText, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EvidenceUploaderProps {
  executionId: string;
  stepOrder?: number;
  onUploadComplete?: (evidence: EvidenceFile) => void;
}

export function EvidenceUploader({
  executionId,
  stepOrder,
  onUploadComplete,
}: EvidenceUploaderProps) {
  const [uploads, setUploads] = useState<EvidenceFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    const maxFiles = 10;

    if (uploads.length + files.length > maxFiles) {
      toast({
        title: 'Too Many Files',
        description: `Maximum ${maxFiles} files per execution`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > maxSize) {
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds 50MB limit`,
            variant: 'destructive',
          });
          continue;
        }

        const evidence = await uploadEvidence(executionId, file, stepOrder || null);
        setUploads(prev => [...prev, evidence]);
        
        if (onUploadComplete) {
          onUploadComplete(evidence);
        }
      }

      toast({
        title: 'Upload Complete',
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [executionId, stepOrder, uploads.length, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          await handleFileSelect(dataTransfer.files);
        }
      }
    }
  }, [handleFileSelect]);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <Image className="h-8 w-8" />;
      case 'video': return <Video className="h-8 w-8" />;
      case 'document':
      case 'log':
        return <FileText className="h-8 w-8" />;
      default: return <FileText className="h-8 w-8" />;
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center hover:border-[#c69c6d] transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag & drop, paste (Ctrl+V), or click to upload
        </p>
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.log,.json"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id={`evidence-upload-${stepOrder || 'general'}`}
          disabled={isUploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(`evidence-upload-${stepOrder || 'general'}`)?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Browse Files'}
        </Button>
      </div>

      {uploads.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {uploads.map((evidence) => (
            <div
              key={evidence.id}
              className="relative border rounded-lg p-2 text-center hover:bg-muted transition-colors"
            >
              <div className="text-muted-foreground mb-1">
                {getFileIcon(evidence.file_type)}
              </div>
              <p className="text-xs truncate">{evidence.file_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
