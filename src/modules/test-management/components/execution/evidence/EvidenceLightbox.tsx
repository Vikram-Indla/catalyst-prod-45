/**
 * Evidence Lightbox Component
 * Full-screen image viewer with navigation, zoom, and actions
 * Implements TC-152, TC-176 to TC-185
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Trash2,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  FileText,
  Video,
  Info,
  Camera,
  Clipboard,
  Upload,
  MousePointer,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Evidence, CaptureMethod } from './types';

interface EvidenceLightboxProps {
  evidence: Evidence[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (evidence: Evidence) => void;
  onDownload?: (evidence: Evidence) => void;
}

const captureMethodLabels: Record<CaptureMethod, { icon: typeof Camera; label: string }> = {
  screen_capture: { icon: Camera, label: 'Screen Capture' },
  clipboard_paste: { icon: Clipboard, label: 'Clipboard Paste' },
  drag_drop: { icon: MousePointer, label: 'Drag & Drop' },
  file_browser: { icon: Upload, label: 'File Upload' },
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function EvidenceLightbox({
  evidence,
  initialIndex,
  isOpen,
  onClose,
  onDelete,
  onDownload,
}: EvidenceLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentItem = evidence[currentIndex];
  const isImage = currentItem?.fileType === 'image';
  const isVideo = currentItem?.fileType === 'video';

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleRotate();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowInfo(prev => !prev);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, evidence.length]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : evidence.length - 1));
    setZoom(1);
    setRotation(0);
  }, [evidence.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev < evidence.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  }, [evidence.length]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (onDownload && currentItem) {
      onDownload(currentItem);
    } else if (currentItem?.url) {
      const link = document.createElement('a');
      link.href = currentItem.url;
      link.download = currentItem.fileName;
      link.click();
    }
  }, [currentItem, onDownload]);

  const handleDelete = useCallback(() => {
    if (onDelete && currentItem) {
      onDelete(currentItem);
      if (evidence.length === 1) {
        onClose();
      } else if (currentIndex >= evidence.length - 1) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  }, [currentItem, onDelete, currentIndex, evidence.length, onClose]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  }, [handleZoomIn, handleZoomOut]);

  if (!isOpen || !currentItem) return null;

  const MethodIcon = captureMethodLabels[currentItem.captureMethod]?.icon || Upload;

  const content = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onWheel={handleWheel}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="text-white border-white/20 shrink-0">
            {currentIndex + 1} / {evidence.length}
          </Badge>
          <h3 className="text-sm font-medium text-white truncate">
            {currentItem.fileName}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          {isImage && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out (-)</TooltipContent>
              </Tooltip>
              <span className="text-xs text-white/70 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In (+)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate (R)</TooltipContent>
              </Tooltip>
            </>
          )}

          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Info toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showInfo ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  !showInfo && 'text-white hover:bg-white/10'
                )}
                onClick={() => setShowInfo(prev => !prev)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Info (I)</TooltipContent>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/10"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fullscreen (F)</TooltipContent>
          </Tooltip>

          {/* Download */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/10"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          {/* Delete */}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          )}

          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Close */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close (Esc)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden p-4">
        {/* Navigation buttons */}
        {evidence.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 text-white hover:bg-white/10 z-10"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 text-white hover:bg-white/10 z-10"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Image/Video/Document display */}
        <div
          className="max-w-full max-h-full transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          {isImage && currentItem.url ? (
            <img
              ref={imageRef}
              src={currentItem.url}
              alt={currentItem.fileName}
              className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-2xl"
              draggable={false}
            />
          ) : isVideo && currentItem.url ? (
            <video
              src={currentItem.url}
              controls
              className="max-w-full max-h-[calc(100vh-200px)] rounded-lg shadow-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-8 bg-muted/10 rounded-xl">
              <FileText className="h-16 w-16 text-white/50" />
              <p className="text-white/70 text-sm">{currentItem.fileName}</p>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download to view
              </Button>
            </div>
          )}
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="absolute right-4 top-4 w-64 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white text-sm space-y-3">
            <h4 className="font-medium border-b border-white/10 pb-2">Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/60">Type</span>
                <span className="capitalize">{currentItem.fileType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Size</span>
                <span>{formatFileSize(currentItem.fileSize)}</span>
              </div>
              {currentItem.width && currentItem.height && (
                <div className="flex justify-between">
                  <span className="text-white/60">Dimensions</span>
                  <span>{currentItem.width} × {currentItem.height}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-white/60">Capture Method</span>
                <span className="flex items-center gap-1">
                  <MethodIcon className="h-3 w-3" />
                  {captureMethodLabels[currentItem.captureMethod]?.label || 'Upload'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Uploaded</span>
                <span>{format(currentItem.createdAt, 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip for multiple images */}
      {evidence.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 bg-black/50 overflow-x-auto">
          {evidence.map((item, index) => (
            <button
              key={item.id}
              className={cn(
                'h-12 w-12 rounded-md overflow-hidden border-2 transition-colors flex-shrink-0',
                index === currentIndex
                  ? 'border-primary'
                  : 'border-transparent opacity-50 hover:opacity-75'
              )}
              onClick={() => {
                setCurrentIndex(index);
                setZoom(1);
                setRotation(0);
              }}
            >
              {item.fileType === 'image' && item.url ? (
                <img
                  src={item.url}
                  alt={item.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  {item.fileType === 'video' ? (
                    <Video className="h-4 w-4 text-white/50" />
                  ) : (
                    <FileText className="h-4 w-4 text-white/50" />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
