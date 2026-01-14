import { useState, useEffect, useCallback } from 'react';
import type { DefectSummary } from '@/types/defect.types';

interface UseDefectKeyboardProps {
  defects: DefectSummary[];
  selection: {
    toggle: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clear: () => void;
  };
  onOpen: (id: string) => void;
  onCreate: () => void;
}

export function useDefectKeyboard({
  defects,
  selection,
  onOpen,
  onCreate,
}: UseDefectKeyboardProps) {
  const [focusIndex, setFocusIndex] = useState(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if in input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
      }
      return;
    }

    switch (e.key) {
      case '/':
        e.preventDefault();
        document.getElementById('defect-search')?.focus();
        break;

      case 'c':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          onCreate();
        }
        break;

      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        setFocusIndex(prev => {
          const next = Math.min(prev + 1, defects.length - 1);
          if (e.shiftKey && next >= 0 && defects[next]) {
            selection.toggle(defects[next].id);
          }
          return next;
        });
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        setFocusIndex(prev => {
          const next = Math.max(prev - 1, 0);
          if (e.shiftKey && next >= 0 && defects[next]) {
            selection.toggle(defects[next].id);
          }
          return next;
        });
        break;

      case 'x':
        e.preventDefault();
        if (focusIndex >= 0 && defects[focusIndex]) {
          selection.toggle(defects[focusIndex].id);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (focusIndex >= 0 && defects[focusIndex]) {
          onOpen(defects[focusIndex].id);
        }
        break;

      case 'Escape':
        selection.clear();
        setFocusIndex(-1);
        break;

      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          selection.selectAll(defects.map(d => d.id));
        }
        break;
    }
  }, [defects, focusIndex, selection, onOpen, onCreate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusIndex >= 0) {
      const row = document.querySelector(`[data-defect-index="${focusIndex}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusIndex]);

  return { focusIndex, setFocusIndex };
}
