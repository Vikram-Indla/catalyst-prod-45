import React, { useState } from 'react';
import { FileImage, FileVideo, FileText, File, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStepEvidence, useDeleteEvidence } from '@/hooks/useEvidence';
import { useToast } from '@/hooks/use-toast';
import { EvidenceViewer } from './EvidenceViewer';

interface EvidenceGalleryProps {
  stepId: string;
}

export const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({ stepId }) => {
  const { toast } = useToast();
  const { data: evidence = [], isLoading } = useStepEvidence(stepId);
  const deleteMutation = useDeleteEvidence();

  const [viewingEvidence, setViewingEvidence] = useState<any | null>(null);

  const handleDelete = async (id: string, filePath: string, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      await deleteMutation.mutateAsync({ id, filePath, stepId });
      toast({
        title: 'Success',
        description: 'Evidence deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete evidence',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <FileImage className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-purple-500" />;
      case 'log':
        return <FileText className="h-8 w-8 text-gray-500" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No evidence attached yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {evidence.map((item: any) => (
          <div
            key={item.id}
            className="relative group border border-border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {item.file_type === 'image' && item.signedUrl ? (
                  <img
                    src={item.signedUrl}
                    alt={item.file_name}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  getFileIcon(item.file_type)
                )}
              </div>
              
              <div className="text-center w-full">
                <p className="text-xs font-medium text-foreground truncate" title={item.file_name}>
                  {item.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.file_size)}
                </p>
              </div>
            </div>

            <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingEvidence(item)}
                className="h-8 w-8 p-0 text-white hover:text-brand-gold hover:bg-white/20"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id, item.file_path, item.file_name)}
                className="h-8 w-8 p-0 text-white hover:text-destructive hover:bg-white/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {viewingEvidence && (
        <EvidenceViewer
          evidence={viewingEvidence}
          isOpen={!!viewingEvidence}
          onClose={() => setViewingEvidence(null)}
        />
      )}
    </>
  );
};
