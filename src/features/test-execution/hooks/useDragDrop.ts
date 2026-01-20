// ============================================================
// Hook for drag and drop file handling
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { DragDropState } from '../types/evidence';

interface UseDragDropOptions {
  onDrop: (files: File[]) => void;
  accept?: string[];
}

export function useDragDrop({ onDrop, accept }: UseDragDropOptions) {
  const [state, setState] = useState<DragDropState>({
    is_dragging: false,
    is_over_drop_zone: false,
    files: [],
  });
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setState(prev => ({ ...prev, is_dragging: true, is_over_drop_zone: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setState(prev => ({ ...prev, is_dragging: false, is_over_drop_zone: false }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setState(prev => ({ ...prev, is_dragging: false, is_over_drop_zone: false }));

    const files = Array.from(e.dataTransfer.files);
    const validFiles = accept
      ? files.filter(f => accept.includes(f.type) || accept.some(a => f.name.endsWith(a.replace('*', ''))))
      : files;

    if (validFiles.length > 0) {
      onDrop(validFiles);
    }
  }, [accept, onDrop]);

  return {
    ...state,
    handlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
