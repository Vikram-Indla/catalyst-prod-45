// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationEditorProps, Annotation, Point } from './types';
import { EditorHeader } from './EditorHeader';
import { AnnotationToolbar } from './AnnotationToolbar';
import { TextInputDialog } from './TextInputDialog';
import { useAnnotationEditor } from './useAnnotationEditor';
import { 
  toPercentage, 
  fromPercentage, 
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
  
  const {
    annotations,
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
    hasChanges
  } = useAnnotationEditor(existingAnnotations);

  // Extract filename from URL
  const fileName = imageUrl.split('/').pop() || 'image';

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

  // Handle save
  const handleSave = () => {
    onSave(annotations);
  };

  return (
    <div className="fixed inset-0 bg-foreground/95 z-50 flex flex-col">
      {/* Header */}
      <EditorHeader 
        fileName={fileName}
        annotationCount={annotations.length}
        onSave={handleSave}
        onCancel={onCancel}
        hasChanges={hasChanges}
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
        onClear={handleClear}
        onDelete={handleDeleteSelected}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedId !== null}
      />
    </div>
  );
};
