/**
 * Annotation Editor Component
 * TC-186 to TC-260: Full annotation editor with canvas, toolbar, and export
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { AnnotationCanvas } from './AnnotationCanvas';
import { AnnotationToolbar } from './AnnotationToolbar';
import { useAnnotationState } from './useAnnotationState';
import { Annotation } from './types';
import { toast } from 'sonner';

interface AnnotationEditorProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  existingAnnotations?: Annotation[];
  onSave: (annotatedImageBlob: Blob, annotations: Annotation[]) => void;
}

export function AnnotationEditor({
  open,
  onClose,
  imageUrl,
  imageName,
  existingAnnotations = [],
  onSave,
}: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  
  const {
    annotations,
    selectedId,
    currentTool,
    currentColor,
    strokeWidth,
    fontSize,
    canUndo,
    canRedo,
    setTool,
    setColor,
    setStrokeWidth,
    setFontSize,
    selectAnnotation,
    addRectangle,
    addArrow,
    addText,
    addBlur,
    addHighlight,
    addFreehand,
    updateAnnotation,
    deleteSelected,
    clearAll,
    undo,
    redo,
    loadAnnotations,
    reset,
  } = useAnnotationState();

  // Load existing annotations when opening
  useEffect(() => {
    if (open && existingAnnotations.length > 0) {
      loadAnnotations(existingAnnotations);
    } else if (open) {
      reset();
    }
  }, [open, existingAnnotations, loadAnnotations, reset]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); break;
          case 'r': setTool('rectangle'); break;
          case 'a': setTool('arrow'); break;
          case 't': setTool('text'); break;
          case 'b': setTool('blur'); break;
          case 'h': setTool('highlight'); break;
          case 'p': setTool('freehand'); break;
          case 'delete':
          case 'backspace':
            if (selectedId) {
              e.preventDefault();
              deleteSelected();
            }
            break;
          case 'escape':
            selectAnnotation(null);
            break;
        }
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
        }
      }

      // Zoom
      if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(z + 0.25, 3));
      } else if (e.key === '-') {
        setZoom(z => Math.max(z - 0.25, 0.25));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedId, setTool, selectAnnotation, deleteSelected, undo, redo]);

  const handleSave = useCallback(async () => {
    try {
      // Get the canvas element
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        toast.error('Failed to export image');
        return;
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 1);
      });

      onSave(blob, annotations);
      toast.success('Annotated image saved');
      onClose();
    } catch (error) {
      console.error('Failed to save annotated image:', error);
      toast.error('Failed to save annotated image');
    }
  }, [annotations, onSave, onClose]);

  const handleClose = useCallback(() => {
    if (annotations.length > 0) {
      const confirmed = window.confirm('Discard unsaved annotations?');
      if (!confirmed) return;
    }
    reset();
    onClose();
  }, [annotations, reset, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Annotate: {imageName}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="p-2 border-b shrink-0">
          <AnnotationToolbar
            currentTool={currentTool}
            currentColor={currentColor}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            canUndo={canUndo}
            canRedo={canRedo}
            hasSelection={!!selectedId}
            onToolChange={setTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
            onFontSizeChange={setFontSize}
            onUndo={undo}
            onRedo={redo}
            onDelete={deleteSelected}
            onClear={clearAll}
            onSave={handleSave}
          />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnnotationCanvas
            imageUrl={imageUrl}
            annotations={annotations}
            selectedId={selectedId}
            currentTool={currentTool}
            currentColor={currentColor}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            onAddRectangle={addRectangle}
            onAddArrow={addArrow}
            onAddText={addText}
            onAddBlur={addBlur}
            onAddHighlight={addHighlight}
            onAddFreehand={addFreehand}
            onSelectAnnotation={selectAnnotation}
            onUpdateAnnotation={updateAnnotation}
            zoom={zoom}
          />
        </div>

        {/* Zoom Controls */}
        <div className="p-2 border-t shrink-0 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
            disabled={zoom <= 0.25}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 w-48">
            <Slider
              value={[zoom * 100]}
              onValueChange={([v]) => setZoom(v / 100)}
              min={25}
              max={300}
              step={25}
            />
            <span className="text-sm text-muted-foreground w-12">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(1)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
