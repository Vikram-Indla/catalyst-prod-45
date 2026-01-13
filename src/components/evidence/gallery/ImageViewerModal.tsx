// ═══════════════════════════════════════════════════════════════════════════
// IMAGE VIEWER MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { 
  X, ZoomIn, ZoomOut, Maximize2, Pencil, Download, Trash2,
  ChevronLeft, ChevronRight, Loader2, Play, FileText
} from 'lucide-react';
import { Attachment } from '../types';
import { cn } from '@/lib/utils';

interface ImageViewerModalProps {
  attachments: Attachment[];
  currentIndex: number;
  signedUrls: Record<string, string>;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onAnnotate: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (attachment: Attachment) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ 
  attachments, 
  currentIndex, 
  signedUrls, 
  onClose, 
  onNavigate, 
  onAnnotate, 
  onDelete,
  onDownload
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const current = attachments[currentIndex];
  const imageUrl = signedUrls[current.id];
  const isImage = current.mimeType.startsWith('image/');
  const isVideo = current.mimeType.startsWith('video/');
  const isPdf = current.mimeType === 'application/pdf';
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) onNavigate(currentIndex - 1);
          break;
        case 'ArrowRight':
          if (currentIndex < attachments.length - 1) onNavigate(currentIndex + 1);
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.25, 3));
          break;
        case '-':
          setZoom(z => Math.max(z - 0.25, 0.5));
          break;
        case '0':
          setZoom(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, attachments.length, onClose, onNavigate]);
  
  // Reset zoom when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);
  
  const handleMouseDown = () => {
    if (zoom > 1) setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition(p => ({
        x: p.x + e.movementX,
        y: p.y + e.movementY
      }));
    }
  };
  
  return (
    <div className="fixed inset-0 bg-foreground/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-foreground/50">
        <div className="flex items-center gap-4">
          <span className="text-background font-medium">{current.fileName}</span>
          <span className="text-background/60 text-sm">
            {currentIndex + 1} of {attachments.length}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
            className="p-2 text-background hover:bg-background/10 rounded-lg"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-background text-sm w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="p-2 text-background hover:bg-background/10 rounded-lg"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
            className="p-2 text-background hover:bg-background/10 rounded-lg"
            title="Reset (0)"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-background/20 mx-2" />
          
          {/* Actions */}
          <button
            onClick={() => onAnnotate(current.id)}
            className="p-2 text-background hover:bg-background/10 rounded-lg"
            title="Annotate"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDownload(current)}
            className="p-2 text-background hover:bg-background/10 rounded-lg"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => { onDelete(current.id); onClose(); }}
            className="p-2 text-destructive hover:bg-destructive/20 rounded-lg"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-background/20 mx-2" />
          
          <button
            onClick={onClose}
            className="p-2 text-background hover:bg-background/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Content Container */}
      <div 
        className="flex-1 relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-foreground/50 
                       hover:bg-foreground/70 rounded-full text-background z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        
        {currentIndex < attachments.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-foreground/50 
                       hover:bg-foreground/70 rounded-full text-background z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
        
        {/* Content Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isImage && imageUrl ? (
            <img
              src={imageUrl}
              alt={current.fileName}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: isDragging ? 'none' : 'transform 0.2s ease'
              }}
              draggable={false}
            />
          ) : isVideo && imageUrl ? (
            <video
              src={imageUrl}
              controls
              className="max-w-full max-h-full"
            >
              Your browser does not support video playback.
            </video>
          ) : isPdf ? (
            <div className="flex flex-col items-center gap-4 text-background">
              <FileText className="w-16 h-16" />
              <p>PDF Preview not available</p>
              <button
                onClick={() => onDownload(current)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Download PDF
              </button>
            </div>
          ) : (
            <Loader2 className="w-8 h-8 text-background animate-spin" />
          )}
        </div>
      </div>
      
      {/* Thumbnail Strip */}
      <div className="p-4 bg-foreground/50">
        <div className="flex items-center justify-center gap-2 overflow-x-auto">
          {attachments.map((att, index) => (
            <button
              key={att.id}
              onClick={() => onNavigate(index)}
              className={cn(
                "w-16 h-12 rounded overflow-hidden border-2 flex-shrink-0",
                index === currentIndex 
                  ? "border-background" 
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {att.mimeType.startsWith('image/') && signedUrls[att.id] ? (
                <img
                  src={signedUrls[att.id]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : att.mimeType.startsWith('video/') ? (
                <div className="w-full h-full bg-foreground/70 flex items-center justify-center">
                  <Play className="w-4 h-4 text-background" />
                </div>
              ) : att.mimeType === 'application/pdf' ? (
                <div className="w-full h-full bg-destructive/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-destructive" />
                </div>
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
