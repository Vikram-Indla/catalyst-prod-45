// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — COLUMN RESIZE HANDLE
// Draggable handle for resizing table columns
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ColumnResizeHandleProps {
  columnId: string;
  onResize: (columnId: string, delta: number) => void;
  onResizeStart?: (columnId: string) => void;
  onResizeEnd?: (columnId: string) => void;
  disabled?: boolean;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ColumnResizeHandle({
  columnId,
  onResize,
  onResizeStart,
  onResizeEnd,
  disabled = false,
  className,
}: ColumnResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      setStartX(e.clientX);
      onResizeStart?.(columnId);
    },
    [columnId, disabled, onResizeStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = e.clientX - startX;
      setStartX(e.clientX);
      onResize(columnId, delta);
    },
    [isResizing, startX, columnId, onResize]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      onResizeEnd?.(columnId);
    }
  }, [isResizing, columnId, onResizeEnd]);

  // Global event listeners for resize tracking
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

  if (disabled) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize',
        'bg-transparent hover:bg-primary/30 transition-colors',
        'group-hover:bg-border/50',
        isResizing && 'bg-primary/50',
        className
      )}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${columnId} column`}
    >
      {/* Visual indicator line */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-px',
          'bg-border group-hover:bg-primary/50',
          isResizing && 'bg-primary'
        )}
      />
    </div>
  );
}

// ─── Double-click to auto-fit ───────────────────────────────────────────────

interface AutoFitResizeHandleProps extends ColumnResizeHandleProps {
  onAutoFit?: (columnId: string) => void;
}

export function AutoFitResizeHandle({
  onAutoFit,
  ...props
}: AutoFitResizeHandleProps) {
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAutoFit?.(props.columnId);
    },
    [props.columnId, onAutoFit]
  );

  return (
    <div onDoubleClick={handleDoubleClick} className="contents">
      <ColumnResizeHandle {...props} />
    </div>
  );
}
