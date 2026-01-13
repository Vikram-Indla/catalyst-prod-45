// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnnotationEditorProps, Annotation, Point } from './types';
import { EditorHeader } from './EditorHeader';
import { AnnotationToolbar } from './AnnotationToolbar';
import { TextInputDialog } from './TextInputDialog';
import { DiscardChangesDialog } from './DiscardChangesDialog';
import { ClearConfirmDialog } from './ClearConfirmDialog';
import { useAnnotationEditor } from './useAnnotationEditor';
import { 
  toPercentage, 
  renderAnnotation, 
  findAnnotationAt 
} from './canvasUtils';

export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  attachmentId,
  imageUrl,
  existingAnnotations,
  onSave,
  onCancel
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(null);
  const [pendingTextPoint, setPendingTextPoint] = useState<Point | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | undefined>(undefined);
  
  const {
    annotations,
    setAnnotations,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    strokeWidth,
    setStrokeWidth,
    selectedId,
    setSelectedId,
    currentAnnotation,
    setCurrentAnnotation,
    isDrawing,
    setIsDrawing,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleClear,
    handleDeleteSelected,
    addAnnotation,
    hasChanges,
    initializeHistory
  } = useAnnotationEditor(existingAnnotations);

  // Extract filename from URL
  const fileName = imageUrl.split('/').pop()?.split('?')[0] || 'image';

  // Load existing annotations from database
  useEffect(() => {
    const loadAnnotations = async () => {
      const { data, error } = await supabase
        .from('step_result_attachments')
        .select('annotations, updated_at')
        .eq('id', attachmentId)
        .single();
      
      if (error) {
        console.error('Error loading annotations:', error);
        return;
      }
      
      if (data?.annotations && Array.isArray(data.annotations)) {
        // Parse the JSON annotations with proper typing
        const loadedAnnotations = (data.annotations as unknown as Annotation[]).map(a => ({
          id: a.id as string,
          type: a.type as Annotation['type'],
          points: a.points as { x: number; y: number }[],
          color: a.color as string,
          strokeWidth: a.strokeWidth as number,
          text: a.text as string | undefined,
          fontSize: a.fontSize as number | undefined,
          filled: a.filled as boolean | undefined,
          blurIntensity: a.blurIntensity as number | undefined,
          createdAt: a.createdAt as string
        }));
        setAnnotations(loadedAnnotations);
        initializeHistory(loadedAnnotations);
      }
      
      if (data?.updated_at) {
        setLastSaved(data.updated_at);
      }
    };
    
    loadAnnotations();
  }, [attachmentId, setAnnotations, initializeHistory]);

  // Setup canvas dimensions
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const image = imageRef.current;
    
    if (!canvas || !container || !image || !imageLoaded) return;
    
    // Match canvas to container size
    const rect = container.getBoundingClientRect();
    
    // Calculate scale to fit image
    const scaleX = rect.width / image.naturalWidth;
    const scaleY = rect.height / image.naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const displayWidth = image.naturalWidth * scale;
    const displayHeight = image.naturalHeight * scale;
    
    // Set canvas size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // Center canvas
    canvas.style.left = `${(rect.width - displayWidth) / 2}px`;
    canvas.style.top = `${(rect.height - displayHeight) / 2}px`;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Position image the same way
    image.style.left = `${(rect.width - displayWidth) / 2}px`;
    image.style.top = `${(rect.height - displayHeight) / 2}px`;
    image.style.width = `${displayWidth}px`;
    image.style.height = `${displayHeight}px`;
  }, [imageLoaded]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all annotations
    annotations.forEach(annotation => {
      renderAnnotation(ctx, annotation, canvas, annotation.id === selectedId);
    });
    
    // Draw current annotation being created
    if (currentAnnotation) {
      renderAnnotation(ctx, currentAnnotation, canvas, false);
    }
  }, [annotations, selectedId, currentAnnotation]);

  // Setup on image load and resize
  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  // Redraw when annotations change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Get canvas-relative coordinates
  const getCanvasCoords = (e: React.MouseEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Mouse down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!coords || !canvas) return;
    
    if (activeTool === 'select') {
      const clicked = findAnnotationAt(coords.x, coords.y, annotations, canvas);
      setSelectedId(clicked?.id || null);
      return;
    }
    
    // Start new annotation
    setIsDrawing(true);
    setSelectedId(null);
    const point = toPercentage(coords.x, coords.y, canvas);
    
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: activeTool,
      points: [point],
      color: activeColor,
      strokeWidth,
      createdAt: new Date().toISOString()
    };
    
    if (activeTool === 'text') {
      // Show text input dialog
      setPendingTextPoint(point);
      setTextInputPosition({ x: e.clientX, y: e.clientY });
      setIsDrawing(false);
      return;
    }
    
    setCurrentAnnotation(newAnnotation);
  };

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentAnnotation) return;
    
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!coords || !canvas) return;
    
    const point = toPercentage(coords.x, coords.y, canvas);
    
    if (activeTool === 'freehand') {
      // Add point to path
      setCurrentAnnotation(prev => prev ? {
        ...prev,
        points: [...prev.points, point]
      } : null);
    } else {
      // Update end point
      setCurrentAnnotation(prev => prev ? {
        ...prev,
        points: [prev.points[0], point]
      } : null);
    }
  };

  // Mouse up handler
  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation) return;
    
    setIsDrawing(false);
    
    // Only add if it has meaningful size
    const points = currentAnnotation.points;
    if (points.length >= 2 || currentAnnotation.type === 'freehand' && points.length > 3) {
      addAnnotation(currentAnnotation);
    }
    
    setCurrentAnnotation(null);
  };

  // Text submit handler
  const handleTextSubmit = (text: string) => {
    if (pendingTextPoint && text.trim()) {
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'text',
        points: [pendingTextPoint],
        color: activeColor,
        strokeWidth,
        text,
        fontSize: 16,
        createdAt: new Date().toISOString()
      };
      addAnnotation(newAnnotation);
    }
    setPendingTextPoint(null);
    setTextInputPosition(null);
  };

  // Handle save to database
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Convert annotations to JSON-serializable format
      const annotationData = annotations.map(a => ({
        id: a.id,
        type: a.type,
        points: a.points,
        color: a.color,
        strokeWidth: a.strokeWidth,
        text: a.text,
        fontSize: a.fontSize,
        filled: a.filled,
        blurIntensity: a.blurIntensity,
        createdAt: a.createdAt
      }));
      
      // Save to database
      const { error } = await supabase
        .from('step_result_attachments')
        .update({ 
          annotations: annotationData,
          updated_at: new Date().toISOString()
        })
        .eq('id', attachmentId);
      
      if (error) throw error;
      
      const savedAt = new Date().toISOString();
      setLastSaved(savedAt);
      toast.success('Annotations saved');
      onSave(annotations);
      
    } catch (error) {
      toast.error('Failed to save annotations');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel with unsaved changes check
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onCancel();
    }
  }, [hasChanges, onCancel]);

  // Handle clear with confirmation
  const handleClearWithConfirmation = useCallback(() => {
    if (annotations.length === 0) return;
    setShowClearDialog(true);
  }, [annotations.length]);

  const confirmClear = useCallback(() => {
    handleClear();
    setShowClearDialog(false);
    toast.success('All annotations cleared');
  }, [handleClear]);

  // Keyboard shortcuts for save and escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Save shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) {
          handleSave();
        }
      }

      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, saving, handleCancel]);

  return (
    <div className="fixed inset-0 bg-foreground/95 z-50 flex flex-col">
      {/* Header */}
      <EditorHeader 
        fileName={fileName}
        annotationCount={annotations.length}
        lastSaved={lastSaved}
        onSave={handleSave}
        onCancel={handleCancel}
        hasChanges={hasChanges}
        saving={saving}
      />
      
      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-foreground/80">
        <img 
          ref={imageRef}
          src={imageUrl}
          alt="Annotating"
          className="absolute object-contain pointer-events-none"
          onLoad={() => {
            setImageLoaded(true);
            setupCanvas();
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Text Input Dialog */}
        {textInputPosition && (
          <TextInputDialog
            isOpen={true}
            position={textInputPosition}
            onSubmit={handleTextSubmit}
            onCancel={() => {
              setPendingTextPoint(null);
              setTextInputPosition(null);
            }}
          />
        )}
      </div>
      
      {/* Bottom Toolbar */}
      <AnnotationToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        strokeWidth={strokeWidth}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onStrokeChange={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearWithConfirmation}
        onDelete={handleDeleteSelected}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedId !== null}
      />

      {/* Discard Changes Dialog */}
      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        onKeepEditing={() => setShowDiscardDialog(false)}
        onDiscard={onCancel}
      />

      {/* Clear Confirmation Dialog */}
      <ClearConfirmDialog
        isOpen={showClearDialog}
        annotationCount={annotations.length}
        onCancel={() => setShowClearDialog(false)}
        onConfirm={confirmClear}
      />
    </div>
  );
};
