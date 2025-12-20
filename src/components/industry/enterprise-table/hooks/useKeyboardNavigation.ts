import { useEffect, useCallback, useRef } from 'react';

interface UseKeyboardNavigationOptions<T extends { id: string }> {
  enabled: boolean;
  data: T[];
  selectedRows: string[];
  onSelectionChange: (ids: string[]) => void;
  onRowActivate?: (row: T) => void;
  onUndo?: () => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export function useKeyboardNavigation<T extends { id: string }>({
  enabled,
  data,
  selectedRows,
  onSelectionChange,
  onRowActivate,
  onUndo,
  containerRef,
}: UseKeyboardNavigationOptions<T>) {
  const focusedRowIndex = useRef<number>(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ctrl+A - Select all
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      onSelectionChange(data.map(r => r.id));
      return;
    }

    // Ctrl+Z - Undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      onUndo?.();
      return;
    }

    // Escape - Clear selection
    if (e.key === 'Escape') {
      onSelectionChange([]);
      focusedRowIndex.current = -1;
      return;
    }

    // Arrow navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(focusedRowIndex.current + 1, data.length - 1);
      if (newIndex >= 0) {
        focusedRowIndex.current = newIndex;
        if (e.shiftKey) {
          // Multi-select with shift
          const rowId = data[newIndex].id;
          if (!selectedRows.includes(rowId)) {
            onSelectionChange([...selectedRows, rowId]);
          }
        }
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(focusedRowIndex.current - 1, 0);
      focusedRowIndex.current = newIndex;
      if (e.shiftKey && newIndex >= 0) {
        const rowId = data[newIndex].id;
        if (!selectedRows.includes(rowId)) {
          onSelectionChange([...selectedRows, rowId]);
        }
      }
    }

    // Enter - Activate focused row
    if (e.key === 'Enter' && focusedRowIndex.current >= 0) {
      e.preventDefault();
      const row = data[focusedRowIndex.current];
      if (row) {
        onRowActivate?.(row);
      }
    }

    // Space - Toggle selection on focused row
    if (e.key === ' ' && focusedRowIndex.current >= 0) {
      e.preventDefault();
      const rowId = data[focusedRowIndex.current]?.id;
      if (rowId) {
        if (selectedRows.includes(rowId)) {
          onSelectionChange(selectedRows.filter(id => id !== rowId));
        } else {
          onSelectionChange([...selectedRows, rowId]);
        }
      }
    }

    // Home - Go to first row
    if (e.key === 'Home') {
      e.preventDefault();
      focusedRowIndex.current = 0;
    }

    // End - Go to last row
    if (e.key === 'End') {
      e.preventDefault();
      focusedRowIndex.current = data.length - 1;
    }
  }, [enabled, data, selectedRows, onSelectionChange, onRowActivate, onUndo]);

  useEffect(() => {
    const container = containerRef?.current || document;
    container.addEventListener('keydown', handleKeyDown as EventListener);
    return () => container.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown, containerRef]);

  return {
    focusedRowIndex: focusedRowIndex.current,
    setFocusedRowIndex: (index: number) => { focusedRowIndex.current = index; },
  };
}
