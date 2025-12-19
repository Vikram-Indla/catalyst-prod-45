/**
 * ResizableHeader — Enterprise-grade column resize for Incident List
 * 
 * Affordance spec:
 * - Resize handle invisible by default
 * - On header hover: cursor col-resize, 1px vertical line appears
 * - On drag: line slightly higher contrast
 * - No background shading, no header highlight blocks
 * - Feels discovered, not advertised
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizableHeaderProps {
  columnId: string;
  width: number;
  minWidth: number;
  onResize: (columnId: string, width: number) => void;
  children: React.ReactNode;
  className?: string;
  isFlexible?: boolean; // For Summary column - grows but still resizable
}

export function ResizableHeader({
  columnId,
  width,
  minWidth,
  onResize,
  children,
  className,
  isFlexible = false,
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
    const newWidth = Math.max(minWidth, Math.min(600, startWidthRef.current + delta));
    onResize(columnId, newWidth);
  }, [isResizing, columnId, minWidth, onResize]);

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
        "relative shrink-0 select-none",
        isFlexible && "flex-1",
        className
      )}
      style={{ 
        width: isFlexible ? undefined : `${width}px`,
        minWidth: `${minWidth}px`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isResizing && setIsHovered(false)}
    >
      {children}
      
      {/* Resize handle - invisible by default, discovered on hover */}
      <div
        className="absolute right-0 top-0 h-full w-2 z-10"
        style={{ cursor: 'col-resize' }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1px vertical line - only visible on hover or drag */}
        <div 
          className={cn(
            "absolute right-0 top-1 bottom-1 w-px transition-all duration-150",
            isResizing 
              ? "bg-[var(--brand-primary)] opacity-100" 
              : isHovered 
                ? "bg-[var(--border-color)] opacity-60" 
                : "opacity-0"
          )}
        />
      </div>
    </div>
  );
}
