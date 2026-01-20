// ============================================================
// EvidenceGallery - Thumbnail grid with preview/download/delete
// ============================================================

import { useState } from 'react';
import { Download, Trash2, Eye, FileText, Image, Film, FileCode } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useStepEvidence } from '../../hooks/useStepEvidence';
import { EvidencePreview } from './EvidencePreview';
import type { EvidenceFile } from '../../types/evidence';

interface EvidenceGalleryProps {
  stepResultId: string | null;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: EvidenceFile['type']) {
  switch (type) {
    case 'screenshot':
      return Image;
    case 'video':
      return Film;
    case 'log':
      return FileCode;
    default:
      return FileText;
  }
}

export function EvidenceGallery({ stepResultId, disabled = false }: EvidenceGalleryProps) {
  const { evidence, isLoading, deleteEvidence } = useStepEvidence(stepResultId);
  const [previewFile, setPreviewFile] = useState<EvidenceFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvidenceFile | null>(null);

  const handleDownload = async (file: EvidenceFile) => {
    if (!file.url) return;
    
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.original_filename || file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEvidence.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Loading evidence...
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
        No evidence attached yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {evidence.map((file) => {
          const Icon = getFileIcon(file.type);
          const isImage = file.type === 'screenshot' && file.url;

          return (
            <div
              key={file.id}
              className={cn(
                'group relative border rounded-lg overflow-hidden bg-muted/30',
                'hover:ring-2 hover:ring-primary/50 transition-all'
              )}
            >
              {/* Thumbnail */}
              <div
                className="aspect-square flex items-center justify-center cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                {isImage ? (
                  <img
                    src={file.thumbnail_url || file.url}
                    alt={file.original_filename || file.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewFile(file)}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(file)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteTarget(file)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* File Info */}
              <div className="p-2 border-t bg-background">
                <p className="text-xs font-medium truncate" title={file.original_filename || file.filename}>
                  {file.original_filename || file.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file_size)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <EvidencePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => handleDownload(previewFile)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.original_filename || deleteTarget?.filename}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
