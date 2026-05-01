// ═══════════════════════════════════════════════════════════════════════════
// CANVAS DRAWING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

import { Annotation, Point } from './types';

// Convert screen coordinates to percentage (0-100)
export const toPercentage = (x: number, y: number, canvas: HTMLCanvasElement): Point => ({
  x: (x / canvas.width) * 100,
  y: (y / canvas.height) * 100
});

// Convert percentage to screen coordinates
export const fromPercentage = (point: Point, canvas: HTMLCanvasElement): Point => ({
  x: (point.x / 100) * canvas.width,
  y: (point.y / 100) * canvas.height
});

// Draw arrow
export const drawArrow = (
  ctx: CanvasRenderingContext2D, 
  start: Point, 
  end: Point
) => {
  if (!start || !end) return;
  
  const headLength = 15;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
  // Line
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  
  // Arrowhead
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
};

// Draw rectangle
export const drawRectangle = (
  ctx: CanvasRenderingContext2D, 
  start: Point, 
  end: Point, 
  filled?: boolean
) => {
  if (!start || !end) return;
  
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  
  if (filled) {
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.strokeRect(x, y, w, h);
  }
};

// Draw circle
export const drawCircle = (
  ctx: CanvasRenderingContext2D, 
  start: Point, 
  end: Point, 
  filled?: boolean
) => {
  if (!start || !end) return;
  
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;
  
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  
  if (filled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
};

// Draw text
export const drawText = (
  ctx: CanvasRenderingContext2D, 
  position: Point, 
  text: string, 
  fontSize: number, 
  color: string
) => {
  if (!position || !text) return;
  
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, position.x, position.y);
};

// Draw freehand path
export const drawFreehand = (
  ctx: CanvasRenderingContext2D, 
  points: Point[]
) => {
  if (!points || points.length < 2) return;
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
};

// Draw blur effect (pixelate)
export const drawBlur = (
  ctx: CanvasRenderingContext2D, 
  start: Point, 
  end: Point,
  imageData?: ImageData
) => {
  if (!start || !end) return;
  
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  
  if (w < 2 || h < 2) return;
  
  // Draw semi-transparent overlay as blur placeholder
  ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
  ctx.fillRect(x, y, w, h);
  
  // Add grid pattern to indicate blur
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  const blockSize = 8;
  for (let py = y; py < y + h; py += blockSize) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }
  for (let px = x; px < x + w; px += blockSize) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }
};

// Draw highlight
export const drawHighlight = (
  ctx: CanvasRenderingContext2D, 
  start: Point, 
  end: Point, 
  color: string
) => {
  if (!start || !end) return;
  
  ctx.fillStyle = color + '40'; // 25% opacity
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  ctx.fillRect(x, y, w, h);
};

// Draw selection handles
export const drawSelectionHandles = (
  ctx: CanvasRenderingContext2D, 
  annotation: Annotation,
  canvas: HTMLCanvasElement
) => {
  const points = annotation.points.map(p => fromPercentage(p, canvas));
  if (points.length < 1) return;
  
  ctx.strokeStyle = 'var(--ds-text-brand, #2563eb)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  
  if (annotation.type === 'freehand') {
    // Bounding box for freehand
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs) - 5;
    const minY = Math.min(...ys) - 5;
    const maxX = Math.max(...xs) + 5;
    const maxY = Math.max(...ys) + 5;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  } else if (points.length >= 2) {
    const start = points[0];
    const end = points[1];
    const x = Math.min(start.x, end.x) - 5;
    const y = Math.min(start.y, end.y) - 5;
    const w = Math.abs(end.x - start.x) + 10;
    const h = Math.abs(end.y - start.y) + 10;
    ctx.strokeRect(x, y, w, h);
  } else {
    // Single point (text)
    ctx.strokeRect(points[0].x - 5, points[0].y - 20, 100, 25);
  }
  
  ctx.setLineDash([]);
};

// Find annotation at position
export const findAnnotationAt = (
  x: number, 
  y: number, 
  annotations: Annotation[],
  canvas: HTMLCanvasElement
): Annotation | null => {
  // Check from top (last) to bottom (first)
  for (let i = annotations.length - 1; i >= 0; i--) {
    const ann = annotations[i];
    const points = ann.points.map(p => fromPercentage(p, canvas));
    
    if (ann.type === 'freehand') {
      // Check if near any point in path
      for (const point of points) {
        if (Math.abs(point.x - x) < 10 && Math.abs(point.y - y) < 10) {
          return ann;
        }
      }
    } else if (ann.type === 'text') {
      // Check text bounding box
      if (points.length >= 1) {
        const pos = points[0];
        if (x >= pos.x - 5 && x <= pos.x + 100 && y >= pos.y - 20 && y <= pos.y + 5) {
          return ann;
        }
      }
    } else if (points.length >= 2) {
      const start = points[0];
      const end = points[1];
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      
      if (x >= minX - 5 && x <= maxX + 5 && y >= minY - 5 && y <= maxY + 5) {
        return ann;
      }
    }
  }
  
  return null;
};

// Render a single annotation
export const renderAnnotation = (
  ctx: CanvasRenderingContext2D, 
  annotation: Annotation,
  canvas: HTMLCanvasElement,
  isSelected: boolean
) => {
  ctx.strokeStyle = annotation.color;
  ctx.fillStyle = annotation.color;
  ctx.lineWidth = annotation.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const points = annotation.points.map(p => fromPercentage(p, canvas));
  
  switch (annotation.type) {
    case 'arrow':
      if (points.length >= 2) drawArrow(ctx, points[0], points[1]);
      break;
    case 'rectangle':
      if (points.length >= 2) drawRectangle(ctx, points[0], points[1], annotation.filled);
      break;
    case 'circle':
      if (points.length >= 2) drawCircle(ctx, points[0], points[1], annotation.filled);
      break;
    case 'text':
      if (points.length >= 1 && annotation.text) {
        drawText(ctx, points[0], annotation.text, annotation.fontSize || 16, annotation.color);
      }
      break;
    case 'freehand':
      drawFreehand(ctx, points);
      break;
    case 'blur':
      if (points.length >= 2) drawBlur(ctx, points[0], points[1]);
      break;
    case 'highlight':
      if (points.length >= 2) drawHighlight(ctx, points[0], points[1], annotation.color);
      break;
  }
  
  // Selection indicator
  if (isSelected) {
    drawSelectionHandles(ctx, annotation, canvas);
  }
};
