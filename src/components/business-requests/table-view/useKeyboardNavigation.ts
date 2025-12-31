import { useCallback, useEffect } from 'react';

interface UseKeyboardNavigationProps {
  dataLength: number;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  toggleSelection: (id: string) => void;
  onRowClick: (id: string) => void;
  getIdAtIndex: (index: number) => string | undefined;
  isEnabled?: boolean;
}

export function useKeyboardNavigation({
  dataLength,
  focusedIndex,
  setFocusedIndex,
  toggleSelection,
  onRowClick,
  getIdAtIndex,
  isEnabled = true,
}: UseKeyboardNavigationProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEnabled || dataLength === 0) return;

    // Don't interfere with input fields
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest('[role="dialog"]') ||
      target.closest('[role="listbox"]') ||
      target.closest('[data-radix-popper-content-wrapper]')
    ) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(Math.min(focusedIndex + 1, dataLength - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(Math.max(focusedIndex - 1, 0));
        break;
      case ' ':
        e.preventDefault();
        const spaceId = getIdAtIndex(focusedIndex);
        if (spaceId) {
          toggleSelection(spaceId);
        }
        break;
      case 'Enter':
        e.preventDefault();
        const enterId = getIdAtIndex(focusedIndex);
        if (enterId) {
          onRowClick(enterId);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(dataLength - 1);
        break;
      case 'Escape':
        // Could be used to clear selection if needed
        break;
    }
  }, [dataLength, focusedIndex, setFocusedIndex, toggleSelection, onRowClick, getIdAtIndex, isEnabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const row = document.querySelector(`[data-row-index="${focusedIndex}"]`);
      if (row) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  return { focusedIndex };
}
