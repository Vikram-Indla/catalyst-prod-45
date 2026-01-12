/**
 * useTestCaseKeyboardShortcuts — Keyboard shortcuts for Test Cases module
 * Features:
 * - Cmd/Ctrl + K: Focus search
 * - Cmd/Ctrl + N: Open create dialog
 * - Escape: Clear selection
 */

import { useEffect, useCallback } from 'react';

interface TestCaseKeyboardShortcutsConfig {
  onSearch?: () => void;
  onCreate?: () => void;
  onEscape?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

export function useTestCaseKeyboardShortcuts({
  onSearch,
  onCreate,
  onEscape,
  onDelete,
  enabled = true,
}: TestCaseKeyboardShortcutsConfig) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable;

    // Escape always works
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    // Don't trigger other shortcuts in inputs (except search shortcut)
    const isMod = event.metaKey || event.ctrlKey;
    
    // Cmd/Ctrl + K: Focus search (works even in inputs)
    if (isMod && event.key === 'k' && onSearch) {
      event.preventDefault();
      onSearch();
      return;
    }

    if (isInput) return;

    // Cmd/Ctrl + N: Open create dialog
    if (isMod && event.key === 'n' && onCreate) {
      event.preventDefault();
      onCreate();
      return;
    }

    // Delete/Backspace: Delete selected items
    if ((event.key === 'Delete' || event.key === 'Backspace') && onDelete) {
      event.preventDefault();
      onDelete();
      return;
    }
  }, [enabled, onSearch, onCreate, onEscape, onDelete]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const TEST_CASE_KEYBOARD_SHORTCUTS = [
  { key: '⌘K', description: 'Focus search' },
  { key: '⌘N', description: 'Create new test case' },
  { key: 'Esc', description: 'Clear selection' },
  { key: 'Delete', description: 'Delete selected' },
];
