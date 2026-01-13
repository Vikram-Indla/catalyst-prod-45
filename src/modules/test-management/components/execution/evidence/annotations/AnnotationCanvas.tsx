/**
 * Annotation Canvas Component
 * TC-186 to TC-230: Canvas-based annotation rendering and interaction
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Annotation, 
  AnnotationTool, 
  Point, 
  COLOR_VALUES,
  RectangleAnnotation,
  ArrowAnnotation,
  TextAnnotation,
  BlurAnnotation,
  HighlightAnnotation,
  FreehandAnnotation
} from './types';

interface AnnotationCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  selectedId: string | null;
  currentTool: AnnotationTool;
  currentColor: string;
  strokeWidth: number;
  fontSize: number;
  onAddRectangle: (x: number, y: number, width: number, height: number) => string;
  onAddArrow: (startX: number, startY: number, endX: number, endY: number) => string;
  onAddText: (x: number, y: number, text: string) => string;
  onAddBlur: (x: number, y: number, width: number, height: number) => string;
  onAddHighlight: (x: number, y: number, width: number, height: number) => string;
  onAddFreehand: (points: Point[]) => string;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  zoom: number;
}

export function AnnotationCanvas({
  imageUrl,
  annotations,
  selectedId,
  currentTool,
  currentColor,
  strokeWidth,
  fontSize,
  onAddRectangle,
  onAddArrow,
  onAddText,
  onAddBlur,
  onAddHighlight,
  onAddFreehand,
  onSelectAnnotation,
  onUpdateAnnotation,
  zoom,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [textValue, setTextValue] = useState('');

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Draw functions
  const drawRectangle = useCallback((ctx: CanvasRenderingContext2D, ann: RectangleAnnotation, isPreview = false) => {
    ctx.strokeStyle = COLOR_VALUES[ann.color];
    ctx.lineWidth = ann.strokeWidth;
    ctx.globalAlpha = isPreview ? 0.5 : ann.opacity;
    
    if (ann.filled) {
      ctx.fillStyle = COLOR_VALUES[ann.color];
      ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
    } else {
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, ann: ArrowAnnotation, isPreview = false) => {
    ctx.strokeStyle = COLOR_VALUES[ann.color];
    ctx.fillStyle = COLOR_VALUES[ann.color];
    ctx.lineWidth = ann.strokeWidth;
    ctx.globalAlpha = isPreview ? 0.5 : ann.opacity;
    
    const headLength = 15;
    const angle = Math.atan2(ann.endY - ann.startY, ann.endX - ann.startX);
    
    ctx.beginPath();
    ctx.moveTo(ann.startX, ann.startY);
    ctx.lineTo(ann.endX, ann.endY);
    ctx.stroke();
    
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(ann.endX, ann.endY);
    ctx.lineTo(
      ann.endX - headLength * Math.cos(angle - Math.PI / 6),
      ann.endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      ann.endX - headLength * Math.cos(angle + Math.PI / 6),
      ann.endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }, []);

  const drawText = useCallback((ctx: CanvasRenderingContext2D, ann: TextAnnotation) => {
    ctx.fillStyle = COLOR_VALUES[ann.color];
    ctx.font = `${ann.fontSize}px ${ann.fontFamily}`;
    ctx.globalAlpha = ann.opacity;
    ctx.fillText(ann.text, ann.x, ann.y);
    ctx.globalAlpha = 1;
  }, []);

  const drawBlur = useCallback((ctx: CanvasRenderingContext2D, ann: BlurAnnotation, img: HTMLImageElement) => {
    // Create a temporary canvas for blur effect
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ann.width;
    tempCanvas.height = ann.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      // Draw the region from the original image
      tempCtx.drawImage(img, ann.x, ann.y, ann.width, ann.height, 0, 0, ann.width, ann.height);
      
      // Apply pixelation effect (simulated blur)
      const pixelSize = Math.max(1, Math.floor(ann.blurAmount / 2));
      tempCtx.imageSmoothingEnabled = false;
      
      // Scale down
      tempCtx.drawImage(tempCanvas, 0, 0, ann.width, ann.height, 0, 0, ann.width / pixelSize, ann.height / pixelSize);
      // Scale back up
      tempCtx.drawImage(tempCanvas, 0, 0, ann.width / pixelSize, ann.height / pixelSize, 0, 0, ann.width, ann.height);
      
      ctx.drawImage(tempCanvas, ann.x, ann.y);
    }
  }, []);

  const drawHighlight = useCallback((ctx: CanvasRenderingContext2D, ann: HighlightAnnotation) => {
    ctx.fillStyle = COLOR_VALUES[ann.color];
    ctx.globalAlpha = ann.opacity;
    ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
    ctx.globalAlpha = 1;
  }, []);

  const drawFreehand = useCallback((ctx: CanvasRenderingContext2D, ann: FreehandAnnotation, isPreview = false) => {
    if (ann.points.length < 2) return;
    
    ctx.strokeStyle = COLOR_VALUES[ann.color];
    ctx.lineWidth = ann.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = isPreview ? 0.5 : ann.opacity;
    
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x, ann.points[0].y);
    
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x, ann.points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  const drawSelection = useCallback((ctx: CanvasRenderingContext2D, ann: Annotation) => {
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    let x = 0, y = 0, width = 0, height = 0;
    
    switch (ann.type) {
      case 'rectangle':
      case 'blur':
      case 'highlight':
        x = ann.x - 4;
        y = ann.y - 4;
        width = ann.width + 8;
        height = ann.height + 8;
        break;
      case 'arrow':
        x = Math.min(ann.startX, ann.endX) - 4;
        y = Math.min(ann.startY, ann.endY) - 4;
        width = Math.abs(ann.endX - ann.startX) + 8;
        height = Math.abs(ann.endY - ann.startY) + 8;
        break;
      case 'text':
        ctx.font = `${ann.fontSize}px ${ann.fontFamily}`;
        const metrics = ctx.measureText(ann.text);
        x = ann.x - 4;
        y = ann.y - ann.fontSize - 4;
        width = metrics.width + 8;
        height = ann.fontSize + 8;
        break;
      case 'freehand':
        const xs = ann.points.map(p => p.x);
        const ys = ann.points.map(p => p.y);
        x = Math.min(...xs) - 4;
        y = Math.min(...ys) - 4;
        width = Math.max(...xs) - x + 8;
        height = Math.max(...ys) - y + 8;
        break;
    }
    
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  }, []);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    // Set canvas size to match image
    canvas.width = image.width;
    canvas.height = image.height;

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // Draw annotations
    for (const ann of annotations) {
      switch (ann.type) {
        case 'rectangle':
          drawRectangle(ctx, ann);
          break;
        case 'arrow':
          drawArrow(ctx, ann);
          break;
        case 'text':
          drawText(ctx, ann);
          break;
        case 'blur':
          drawBlur(ctx, ann, image);
          break;
        case 'highlight':
          drawHighlight(ctx, ann);
          break;
        case 'freehand':
          drawFreehand(ctx, ann);
          break;
      }
      
      // Draw selection
      if (ann.id === selectedId) {
        drawSelection(ctx, ann);
      }
    }

    // Draw preview for current drawing
    if (isDrawing && startPoint && currentPoint) {
      const width = currentPoint.x - startPoint.x;
      const height = currentPoint.y - startPoint.y;

      switch (currentTool) {
        case 'rectangle':
          drawRectangle(ctx, {
            id: 'preview',
            type: 'rectangle',
            color: currentColor as any,
            strokeWidth,
            opacity: 1,
            createdAt: 0,
            x: startPoint.x,
            y: startPoint.y,
            width,
            height,
            filled: false,
          }, true);
          break;
        case 'arrow':
          drawArrow(ctx, {
            id: 'preview',
            type: 'arrow',
            color: currentColor as any,
            strokeWidth,
            opacity: 1,
            createdAt: 0,
            startX: startPoint.x,
            startY: startPoint.y,
            endX: currentPoint.x,
            endY: currentPoint.y,
          }, true);
          break;
        case 'blur':
        case 'highlight':
          ctx.fillStyle = currentTool === 'blur' ? '#000000' : COLOR_VALUES[currentColor as keyof typeof COLOR_VALUES];
          ctx.globalAlpha = 0.3;
          ctx.fillRect(startPoint.x, startPoint.y, width, height);
          ctx.globalAlpha = 1;
          break;
      }
    }

    // Draw freehand preview
    if (isDrawing && currentTool === 'freehand' && freehandPoints.length > 0) {
      drawFreehand(ctx, {
        id: 'preview',
        type: 'freehand',
        color: currentColor as any,
        strokeWidth,
        opacity: 1,
        createdAt: 0,
        points: freehandPoints,
      }, true);
    }
  }, [
    image, annotations, selectedId, isDrawing, startPoint, currentPoint, 
    currentTool, currentColor, strokeWidth, freehandPoints,
    drawRectangle, drawArrow, drawText, drawBlur, drawHighlight, drawFreehand, drawSelection
  ]);

  // Re-render on changes
  useEffect(() => {
    render();
  }, [render]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getCanvasCoords(e);
    
    if (currentTool === 'select') {
      // Find clicked annotation
      const clicked = [...annotations].reverse().find(ann => {
        switch (ann.type) {
          case 'rectangle':
          case 'blur':
          case 'highlight':
            return point.x >= ann.x && point.x <= ann.x + ann.width &&
                   point.y >= ann.y && point.y <= ann.y + ann.height;
          case 'arrow':
            const minX = Math.min(ann.startX, ann.endX);
            const maxX = Math.max(ann.startX, ann.endX);
            const minY = Math.min(ann.startY, ann.endY);
            const maxY = Math.max(ann.startY, ann.endY);
            return point.x >= minX - 10 && point.x <= maxX + 10 &&
                   point.y >= minY - 10 && point.y <= maxY + 10;
          case 'text':
            return point.x >= ann.x && point.x <= ann.x + 100 &&
                   point.y >= ann.y - ann.fontSize && point.y <= ann.y;
          case 'freehand':
            const xs = ann.points.map(p => p.x);
            const ys = ann.points.map(p => p.y);
            return point.x >= Math.min(...xs) - 10 && point.x <= Math.max(...xs) + 10 &&
                   point.y >= Math.min(...ys) - 10 && point.y <= Math.max(...ys) + 10;
          default:
            return false;
        }
      });
      onSelectAnnotation(clicked?.id || null);
      return;
    }

    if (currentTool === 'text') {
      setTextInput({ x: point.x, y: point.y, visible: true });
      setTextValue('');
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoint(point);
    
    if (currentTool === 'freehand') {
      setFreehandPoints([point]);
    }
  }, [currentTool, annotations, getCanvasCoords, onSelectAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    const point = getCanvasCoords(e);
    setCurrentPoint(point);
    
    if (currentTool === 'freehand') {
      setFreehandPoints(prev => [...prev, point]);
    }
  }, [isDrawing, currentTool, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPoint || !currentPoint) {
      setIsDrawing(false);
      return;
    }

    const width = currentPoint.x - startPoint.x;
    const height = currentPoint.y - startPoint.y;

    // Only create annotation if it has meaningful size
    const minSize = 5;
    const hasSize = Math.abs(width) > minSize || Math.abs(height) > minSize;

    if (hasSize || currentTool === 'freehand') {
      switch (currentTool) {
        case 'rectangle':
          onAddRectangle(
            Math.min(startPoint.x, currentPoint.x),
            Math.min(startPoint.y, currentPoint.y),
            Math.abs(width),
            Math.abs(height)
          );
          break;
        case 'arrow':
          onAddArrow(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y);
          break;
        case 'blur':
          onAddBlur(
            Math.min(startPoint.x, currentPoint.x),
            Math.min(startPoint.y, currentPoint.y),
            Math.abs(width),
            Math.abs(height)
          );
          break;
        case 'highlight':
          onAddHighlight(
            Math.min(startPoint.x, currentPoint.x),
            Math.min(startPoint.y, currentPoint.y),
            Math.abs(width),
            Math.abs(height)
          );
          break;
        case 'freehand':
          if (freehandPoints.length > 2) {
            onAddFreehand(freehandPoints);
          }
          break;
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setFreehandPoints([]);
  }, [
    isDrawing, startPoint, currentPoint, currentTool, freehandPoints,
    onAddRectangle, onAddArrow, onAddBlur, onAddHighlight, onAddFreehand
  ]);

  const handleTextSubmit = useCallback(() => {
    if (textValue.trim()) {
      onAddText(textInput.x, textInput.y, textValue.trim());
    }
    setTextInput({ x: 0, y: 0, visible: false });
    setTextValue('');
  }, [textInput, textValue, onAddText]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setTextInput({ x: 0, y: 0, visible: false });
      setTextValue('');
    }
  }, [handleTextSubmit]);

  const cursorStyle = useMemo(() => {
    switch (currentTool) {
      case 'select': return 'default';
      case 'text': return 'text';
      default: return 'crosshair';
    }
  }, [currentTool]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto bg-muted/20"
      style={{ maxHeight: '70vh' }}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={{ 
          cursor: cursorStyle,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* Text input overlay */}
      {textInput.visible && (
        <div
          className="absolute"
          style={{
            left: textInput.x * zoom,
            top: textInput.y * zoom,
          }}
        >
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextSubmit}
            autoFocus
            className="border-2 border-primary bg-background px-2 py-1 text-sm outline-none"
            style={{ 
              fontSize: `${fontSize}px`,
              minWidth: '100px',
            }}
            placeholder="Enter text..."
          />
        </div>
      )}
    </div>
  );
}
