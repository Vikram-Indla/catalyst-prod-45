// ============================================================
// MY TASKS KEYBOARD SHORTCUTS
// Planner V9: Global keyboard shortcuts for task management
// ============================================================

import { useEffect, useCallback } from 'react';

interface KeyboardHandlers {
  onQuickAdd: () => void;
  onCommandPalette: () => void;
  onClearSelection: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onComplete?: () => void;
}

export function useMyTasksKeyboard(handlers: KeyboardHandlers) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    // Command palette: ⌘K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      handlers.onCommandPalette();
      return;
    }

    // Quick add: Q (without modifiers)
    if (e.key === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      handlers.onQuickAdd();
      return;
    }

    // Clear selection / close modals: Escape
    if (e.key === 'Escape') {
      handlers.onClearSelection();
      return;
    }

    // Navigate up: K or ArrowUp
    if ((e.key === 'k' || e.key === 'ArrowUp') && !e.metaKey && !e.ctrlKey) {
      if (handlers.onNavigateUp) {
        e.preventDefault();
        handlers.onNavigateUp();
      }
      return;
    }

    // Navigate down: J or ArrowDown
    if ((e.key === 'j' || e.key === 'ArrowDown') && !e.metaKey && !e.ctrlKey) {
      if (handlers.onNavigateDown) {
        e.preventDefault();
        handlers.onNavigateDown();
      }
      return;
    }

    // Complete task: X
    if (e.key === 'x' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (handlers.onComplete) {
        e.preventDefault();
        handlers.onComplete();
      }
      return;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
