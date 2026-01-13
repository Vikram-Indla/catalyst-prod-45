/**
 * Annotation Canvas Hook
 * TC-221 to TC-240: Canvas drawing and interaction
 */

import { useRef, useCallback, useEffect } from 'react';
import type { Annotation, Point, AnnotationTool, AnnotationColor } from './types';

interface UseAnnotationCanvasOptions {
  tool: AnnotationTool;
  color: AnnotationColor;
  strokeWidth: number;
  fontSize: number;
  annotations: Annotation[];
  selectedId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  addRectangle: (x: number, y: number, width: number, height: number, filled?: boolean) => string;
  addArrow: (startX: number, startY: number, endX: number, endY: number) => string;
  addText: (x: number, y: number, text: string) => string;
  addBlur: (x: number, y: number, width: number, height: number, blurAmount?: number) => string;
  addHighlight: (x: number, y: number, width: number, height: number) => string;
  addFreehand: (points: Point[]) => string;
}

const COLOR_MAP: Record<AnnotationColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  white: '#ffffff',
  black: '#000000',
};

export function useAnnotationCanvas({
  tool,
  color,
  strokeWidth,
  annotations,
  selectedId,
  onSelectAnnotation,
  addRectangle,
  addArrow,
  addText,
  addBlur,
  addHighlight,
  addFreehand
}: UseAnnotationCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const startPoint = useRef<Point | null>(null);

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const hitTest = useCallback((point: Point): Annotation | null => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      
      if (ann.type === 'rectangle' || ann.type === 'blur' || ann.type === 'highlight') {
        if (point.x >= ann.x && point.x <= ann.x + ann.width &&
            point.y >= ann.y && point.y <= ann.y + ann.height) {
          return ann;
        }
      } else if (ann.type === 'text') {
        if (point.x >= ann.x && point.x <= ann.x + 100 &&
            point.y >= ann.y - 20 && point.y <= ann.y) {
          return ann;
        }
      } else if (ann.type === 'freehand') {
        for (const p of ann.points) {
          const dist = Math.sqrt((point.x - p.x) ** 2 + (point.y - p.y) ** 2);
          if (dist < 10) return ann;
        }
      } else if (ann.type === 'arrow') {
        const dist = pointToLineDistance(
          point, 
          { x: ann.startX, y: ann.startY }, 
          { x: ann.endX, y: ann.endY }
        );
        if (dist < 10) return ann;
      }
    }
    return null;
  }, [annotations]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach(ann => {
      ctx.save();
      ctx.strokeStyle = COLOR_MAP[ann.color];
      ctx.fillStyle = COLOR_MAP[ann.color];
      ctx.lineWidth = ann.strokeWidth;
      ctx.globalAlpha = ann.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (ann.type === 'freehand') {
        if (ann.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
          }
          ctx.stroke();
        }
      } else if (ann.type === 'rectangle') {
        if (ann.filled) {
          ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        } else {
          ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        }
      } else if (ann.type === 'highlight') {
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'blur') {
        ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'arrow') {
        drawArrow(ctx, { x: ann.startX, y: ann.startY }, { x: ann.endX, y: ann.endY });
      } else if (ann.type === 'text') {
        ctx.globalAlpha = 1;
        ctx.font = `${ann.fontSize}px ${ann.fontFamily}`;
        ctx.fillText(ann.text, ann.x, ann.y);
      }

      // Selection indicator
      if (ann.id === selectedId) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 1;
        
        if (ann.type === 'rectangle' || ann.type === 'highlight' || ann.type === 'blur') {
          ctx.strokeRect(ann.x - 5, ann.y - 5, ann.width + 10, ann.height + 10);
        }
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  }, [annotations, selectedId]);

  const drawPreview = useCallback((currentPoint?: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !startPoint.current) return;

    redrawCanvas();

    ctx.save();
    ctx.strokeStyle = COLOR_MAP[color];
    ctx.fillStyle = COLOR_MAP[color];
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = tool === 'highlight' ? 0.4 : 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'freehand') {
      if (currentPoints.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentPoints.current[0].x, currentPoints.current[0].y);
        for (let i = 1; i < currentPoints.current.length; i++) {
          ctx.lineTo(currentPoints.current[i].x, currentPoints.current[i].y);
        }
        ctx.stroke();
      }
    } else if (currentPoint) {
      if (tool === 'rectangle' || tool === 'highlight' || tool === 'blur') {
        const x = Math.min(startPoint.current.x, currentPoint.x);
        const y = Math.min(startPoint.current.y, currentPoint.y);
        const w = Math.abs(currentPoint.x - startPoint.current.x);
        const h = Math.abs(currentPoint.y - startPoint.current.y);
        
        if (tool === 'highlight') {
          ctx.fillRect(x, y, w, h);
        } else if (tool === 'blur') {
          ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.strokeRect(x, y, w, h);
        }
      } else if (tool === 'arrow') {
        drawArrow(ctx, startPoint.current, currentPoint);
      }
    }

    ctx.restore();
  }, [color, strokeWidth, tool, redrawCanvas]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    
    if (tool === 'select') {
      const hit = hitTest(point);
      onSelectAnnotation(hit?.id || null);
      return;
    }

    isDrawingRef.current = true;
    startPoint.current = point;
    currentPoints.current = [point];
  }, [tool, getCanvasPoint, hitTest, onSelectAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    
    const point = getCanvasPoint(e);
    
    if (tool === 'freehand') {
      currentPoints.current.push(point);
    }
    drawPreview(point);
  }, [tool, getCanvasPoint, drawPreview]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !startPoint.current) return;
    
    const endPoint = getCanvasPoint(e);
    isDrawingRef.current = false;

    if (tool === 'freehand') {
      if (currentPoints.current.length > 1) {
        addFreehand([...currentPoints.current]);
      }
    } else if (tool === 'arrow') {
      addArrow(startPoint.current.x, startPoint.current.y, endPoint.x, endPoint.y);
    } else if (tool === 'rectangle') {
      const x = Math.min(startPoint.current.x, endPoint.x);
      const y = Math.min(startPoint.current.y, endPoint.y);
      const width = Math.abs(endPoint.x - startPoint.current.x);
      const height = Math.abs(endPoint.y - startPoint.current.y);
      
      if (width > 5 && height > 5) {
        addRectangle(x, y, width, height, false);
      }
    } else if (tool === 'highlight') {
      const x = Math.min(startPoint.current.x, endPoint.x);
      const y = Math.min(startPoint.current.y, endPoint.y);
      const width = Math.abs(endPoint.x - startPoint.current.x);
      const height = Math.abs(endPoint.y - startPoint.current.y);
      
      if (width > 5 && height > 5) {
        addHighlight(x, y, width, height);
      }
    } else if (tool === 'blur') {
      const x = Math.min(startPoint.current.x, endPoint.x);
      const y = Math.min(startPoint.current.y, endPoint.y);
      const width = Math.abs(endPoint.x - startPoint.current.x);
      const height = Math.abs(endPoint.y - startPoint.current.y);
      
      if (width > 5 && height > 5) {
        addBlur(x, y, width, height);
      }
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        addText(startPoint.current.x, startPoint.current.y, text);
      }
    }

    currentPoints.current = [];
    startPoint.current = null;
    redrawCanvas();
  }, [tool, getCanvasPoint, addFreehand, addArrow, addRectangle, addHighlight, addBlur, addText, redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [annotations, selectedId, redrawCanvas]);

  return {
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    redrawCanvas
  };
}

function drawArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  const headLength = 15;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  return Math.sqrt((point.x - xx) ** 2 + (point.y - yy) ** 2);
}
