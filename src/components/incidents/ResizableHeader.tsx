/**
 * ResizableHeader — Enterprise-grade column resize for Incident List (Grid version)
 * 
 * Updated for CSS Grid layout:
 * - All columns use explicit width (no flex-1)
 * - Resize handle with proper hit zone (8px)
 * - Subtle vertical line on hover, prominent on drag
 * - Cursor col-resize
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizableHeaderProps {
  columnId: string;
  width: number;
  minWidth: number;
  maxWidth?: number;
  onResize: (columnId: string, width: number) => void;
  children: React.ReactNode;
  className?: string;
}

export function ResizableHeader({
  columnId,
  width,
  minWidth,
  maxWidth = 900,
  onResize,
  children,
  className,
}: ResizableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const delta = e.clientX - startXRef.current;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
    onResize(columnId, newWidth);
  }, [isResizing, columnId, minWidth, maxWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={cn(
        "relative select-none flex items-center h-full overflow-hidden",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isResizing && setIsHovered(false)}
    >
      {children}
      
      {/* Resize handle - 8px hit zone, subtle visual */}
      <div
        className="absolute right-0 top-0 h-full w-2 z-10 flex items-center justify-end"
        style={{ cursor: 'col-resize' }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1px vertical line - visible on hover, stronger on drag */}
        <div 
          className={cn(
            "h-4 w-px transition-all duration-100",
            isResizing 
              ? "bg-primary h-5" 
              : isHovered 
                ? "bg-muted-foreground/50 h-4" 
                : "bg-transparent"
          )}
        />
      </div>
    </div>
  );
}
