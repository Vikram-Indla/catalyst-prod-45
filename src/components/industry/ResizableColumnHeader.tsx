import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizableColumnHeaderProps {
  columnId: string;
  width: number;
  minWidth: number;
  maxWidth?: number;
  onResize: (columnId: string, width: number) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResizableColumnHeader({
  columnId,
  width,
  minWidth,
  maxWidth = 800,
  onResize,
  children,
  className,
  style,
}: ResizableColumnHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const thRef = useRef<HTMLTableCellElement>(null);

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
    <th
      ref={thRef}
      className={cn("relative group", className)}
      style={{ ...style, width: `${width}px`, minWidth: `${minWidth}px` }}
    >
      {children}
      
      {/* Resize handle */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-1 cursor-col-resize z-10 transition-colors",
          "hover:bg-brand-gold/60 active:bg-brand-gold",
          isResizing && "bg-brand-gold"
        )}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Wider hit area for easier grabbing */}
        <div className="absolute -left-1 -right-1 top-0 h-full" />
      </div>
      
      {/* Visual resize indicator line on hover */}
      <div 
        className={cn(
          "absolute right-0 top-0 w-px h-full bg-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
          isResizing && "opacity-100 bg-brand-gold"
        )}
      />
    </th>
  );
}

// Hook for managing column widths with localStorage persistence
export function useResizableColumns(storageKey: string, defaultWidths: Record<string, number>) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...defaultWidths, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load column widths:', e);
    }
    return defaultWidths;
  });

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => {
      const newWidths = { ...prev, [columnId]: width };
      try {
        localStorage.setItem(storageKey, JSON.stringify(newWidths));
      } catch (e) {
        console.error('Failed to save column widths:', e);
      }
      return newWidths;
    });
  }, [storageKey]);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths(defaultWidths);
    localStorage.removeItem(storageKey);
  }, [storageKey, defaultWidths]);

  return { columnWidths, handleColumnResize, resetColumnWidths };
}
