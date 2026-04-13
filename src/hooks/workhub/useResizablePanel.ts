/**
 * useResizablePanel — Draggable panel resizer with localStorage persistence
 * ════════════════════════════════════════════════════════════════════════════
 * Manages column widths for the 3-column issue view layout.
 * Persists widths per route key to localStorage.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

interface PanelWidths {
  left: number;
  right: number;
}

interface ResizablePanelOptions {
  storageKey: string;
  defaultLeft?: number;
  defaultRight?: number;
  minLeft?: number;
  maxLeft?: number;
  minRight?: number;
  maxRight?: number;
}

interface ResizablePanelReturn {
  leftWidth: number;
  rightWidth: number;
  isDraggingLeft: boolean;
  isDraggingRight: boolean;
  onLeftSplitterMouseDown: (e: React.MouseEvent) => void;
  onRightSplitterMouseDown: (e: React.MouseEvent) => void;
  resetWidths: () => void;
}

function loadWidths(storageKey: string, defaults: PanelWidths): PanelWidths {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        left: typeof parsed.left === 'number' ? parsed.left : defaults.left,
        right: typeof parsed.right === 'number' ? parsed.right : defaults.right,
      };
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveWidths(storageKey: string, widths: PanelWidths): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch { /* ignore */ }
}

export function useResizablePanel({
  storageKey,
  defaultLeft = 360,
  defaultRight = 360,
  minLeft = 280,
  maxLeft = 520,
  minRight = 320,
  maxRight = 520,
}: ResizablePanelOptions): ResizablePanelReturn {
  const defaults = { left: defaultLeft, right: defaultRight };
  const [widths, setWidths] = useState<PanelWidths>(() => loadWidths(storageKey, defaults));
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const sideRef = useRef<'left' | 'right'>('left');

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const delta = e.clientX - startXRef.current;
    const side = sideRef.current;

    setWidths(prev => {
      if (side === 'left') {
        const newLeft = Math.min(maxLeft, Math.max(minLeft, startWidthRef.current + delta));
        return { ...prev, left: newLeft };
      }
      // Right panel: dragging left increases width, dragging right decreases
      const newRight = Math.min(maxRight, Math.max(minRight, startWidthRef.current - delta));
      return { ...prev, right: newRight };
    });
  }, [minLeft, maxLeft, minRight, maxRight]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (!isDraggingLeft && !isDraggingRight) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

  // Persist on change (debounced via effect)
  useEffect(() => {
    saveWidths(storageKey, widths);
  }, [storageKey, widths]);

  const onLeftSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = widths.left;
    sideRef.current = 'left';
    setIsDraggingLeft(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths.left]);

  const onRightSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = widths.right;
    sideRef.current = 'right';
    setIsDraggingRight(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths.right]);

  const resetWidths = useCallback(() => {
    setWidths(defaults);
    saveWidths(storageKey, defaults);
  }, [storageKey, defaultLeft, defaultRight]);

  return {
    leftWidth: widths.left,
    rightWidth: widths.right,
    isDraggingLeft,
    isDraggingRight,
    onLeftSplitterMouseDown,
    onRightSplitterMouseDown,
    resetWidths,
  };
}
