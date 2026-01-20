// ============================================================
// EvidencePreview - Lightbox modal for viewing evidence
// ============================================================

import { useEffect, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { EvidenceFile } from '../../types/evidence';
import { useState } from 'react';

interface EvidencePreviewProps {
  file: EvidenceFile;
  onClose: () => void;
  onDownload: () => void;
}

export function EvidencePreview({ file, onClose, onDownload }: EvidencePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isImage = file.type === 'screenshot' && file.url;
  const isPdf = file.mime_type === 'application/pdf';
  const isText = file.type === 'log' || file.mime_type?.startsWith('text/');

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        setZoom(z => Math.min(z + 0.25, 3));
        break;
      case '-':
        setZoom(z => Math.max(z - 0.25, 0.5));
        break;
      case 'r':
        setRotation(r => (r + 90) % 360);
        break;
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">
              {file.original_filename || file.filename}
            </h3>
            {file.width && file.height && (
              <p className="text-sm text-muted-foreground">
                {file.width} × {file.height} px
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 p-4">
          {isImage && file.url && (
            <img
              src={file.url}
              alt={file.original_filename || file.filename}
              className={cn(
                'max-w-full max-h-full object-contain transition-transform',
              )}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />
          )}

          {isPdf && file.url && (
            <iframe
              src={file.url}
              className="w-full h-full"
              title={file.original_filename || file.filename}
            />
          )}

          {isText && (
            <div className="w-full h-full bg-background p-4 rounded border overflow-auto">
              <p className="text-sm text-muted-foreground">
                Text preview not available. Click download to view the file.
              </p>
            </div>
          )}

          {!isImage && !isPdf && !isText && (
            <div className="text-center text-muted-foreground">
              <p>Preview not available for this file type.</p>
              <Button variant="outline" className="mt-4" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>
            Uploaded {new Date(file.created_at).toLocaleString()}
            {file.uploaded_by?.name && ` by ${file.uploaded_by.name}`}
          </span>
          <span>
            Use +/- to zoom, R to rotate, Esc to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
