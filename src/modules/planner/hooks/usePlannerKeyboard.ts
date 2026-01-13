// ============================================================
// PLANNER KEYBOARD SHORTCUTS HOOK
// Global keyboard shortcuts for Planner module
// ============================================================

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface PlannerKeyboardActions {
  onCreateTask: () => void;
  onOpenSearch: () => void;
  onToggleAIPanel: () => void;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onEscape: () => void;
}

export function usePlannerKeyboard(
  actions: PlannerKeyboardActions,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                          target.isContentEditable;

    // Escape always works
    if (e.key === 'Escape') {
      actions.onEscape();
      return;
    }

    // Skip other shortcuts if input is focused
    if (isInputFocused) return;

    // Cmd/Ctrl + K: Open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      actions.onOpenSearch();
      return;
    }

    // C: Create new task
    if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      actions.onCreateTask();
      return;
    }

    // A: Toggle AI panel
    if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      actions.onToggleAIPanel();
      return;
    }

    // J: Navigate to next task
    if (e.key === 'j') {
      e.preventDefault();
      actions.onNavigateNext();
      return;
    }

    // K: Navigate to previous task
    if (e.key === 'k' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      actions.onNavigatePrev();
      return;
    }

    // ?: Show shortcuts help
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      toast.info(
        'Keyboard Shortcuts',
        {
          description: 'C: Create task | A: AI Panel | ⌘K: Search | J/K: Navigate | Esc: Close',
          duration: 4000,
        }
      );
      return;
    }
  }, [actions]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
