/**
 * useTestCaseKeyboardShortcuts — Comprehensive keyboard shortcuts for Test Cases module
 * Features:
 * - Cmd/Ctrl + K: Focus search
 * - Cmd/Ctrl + N: Open create dialog
 * - Cmd/Ctrl + F: Open advanced filters
 * - Cmd/Ctrl + E: Edit selected test case
 * - Cmd/Ctrl + D: Duplicate selected
 * - Cmd/Ctrl + 1/2/3: Switch views (list/grid/kanban)
 * - Escape: Clear selection / Close dialogs
 * - ?: Show keyboard shortcuts dialog
 * - Delete: Delete selected items
 * - j/k: Navigate through items
 * - Enter: Open selected item
 */

import { useEffect, useCallback } from 'react';

interface TestCaseKeyboardShortcutsConfig {
  onSearch?: () => void;
  onCreate?: () => void;
  onEscape?: () => void;
  onDelete?: () => void;
  onAdvancedFilters?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onShowHelp?: () => void;
  onViewChange?: (view: 'list' | 'grid' | 'kanban') => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  onOpenSelected?: () => void;
  onSelectAll?: () => void;
  enabled?: boolean;
}

export function useTestCaseKeyboardShortcuts({
  onSearch,
  onCreate,
  onEscape,
  onDelete,
  onAdvancedFilters,
  onEdit,
  onDuplicate,
  onShowHelp,
  onViewChange,
  onNavigateNext,
  onNavigatePrev,
  onOpenSelected,
  onSelectAll,
  enabled = true,
}: TestCaseKeyboardShortcutsConfig) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // CRITICAL: Check if ANY dialog/modal is open - if so, DO NOT intercept any keys
    const hasOpenDialog = document.querySelector('[role="dialog"]') !== null;
    const hasOpenSheet = document.querySelector('[data-state="open"][role="dialog"]') !== null;
    const hasOpenPopover = document.querySelector('[data-radix-popper-content-wrapper]') !== null;
    
    if (hasOpenDialog || hasOpenSheet || hasOpenPopover) {
      // Let dialogs handle their own keyboard events completely
      return;
    }

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable ||
                    target.closest('[role="dialog"]') !== null;

    // If in input context, only allow Escape
    if (isInput) {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
      return;
    }

    // Escape for clearing selection (not in dialogs)
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    // ? for keyboard shortcuts help (works even in inputs for discoverability)
    if (event.key === '?' && !isInput && onShowHelp) {
      event.preventDefault();
      onShowHelp();
      return;
    }

    const isMod = event.metaKey || event.ctrlKey;
    
    // Cmd/Ctrl + K: Focus search (works even in inputs)
    if (isMod && event.key === 'k' && onSearch) {
      event.preventDefault();
      onSearch();
      return;
    }

    // Don't trigger other shortcuts in inputs
    if (isInput) return;

    // Cmd/Ctrl + N: Open create dialog
    if (isMod && event.key === 'n' && onCreate) {
      event.preventDefault();
      onCreate();
      return;
    }

    // Cmd/Ctrl + F: Open advanced filters
    if (isMod && event.key === 'f' && onAdvancedFilters) {
      event.preventDefault();
      onAdvancedFilters();
      return;
    }

    // Cmd/Ctrl + E: Edit selected
    if (isMod && event.key === 'e' && onEdit) {
      event.preventDefault();
      onEdit();
      return;
    }

    // Cmd/Ctrl + D: Duplicate selected
    if (isMod && event.key === 'd' && onDuplicate) {
      event.preventDefault();
      onDuplicate();
      return;
    }

    // Cmd/Ctrl + A: Select all
    if (isMod && event.key === 'a' && onSelectAll) {
      event.preventDefault();
      onSelectAll();
      return;
    }

    // Cmd/Ctrl + 1/2/3: Switch views
    if (isMod && onViewChange) {
      if (event.key === '1') {
        event.preventDefault();
        onViewChange('list');
        return;
      }
      if (event.key === '2') {
        event.preventDefault();
        onViewChange('grid');
        return;
      }
      if (event.key === '3') {
        event.preventDefault();
        onViewChange('kanban');
        return;
      }
    }

    // j/k navigation (vim-style)
    if (event.key === 'j' && onNavigateNext) {
      event.preventDefault();
      onNavigateNext();
      return;
    }
    if (event.key === 'k' && onNavigatePrev) {
      event.preventDefault();
      onNavigatePrev();
      return;
    }

    // Enter: Open selected
    if (event.key === 'Enter' && onOpenSelected) {
      event.preventDefault();
      onOpenSelected();
      return;
    }

    // Delete/Backspace: Delete selected items
    if ((event.key === 'Delete' || event.key === 'Backspace') && onDelete) {
      event.preventDefault();
      onDelete();
      return;
    }
  }, [
    enabled, onSearch, onCreate, onEscape, onDelete, onAdvancedFilters,
    onEdit, onDuplicate, onShowHelp, onViewChange, onNavigateNext,
    onNavigatePrev, onOpenSelected, onSelectAll
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const TEST_CASE_KEYBOARD_SHORTCUTS = [
  { key: '⌘K', description: 'Focus search' },
  { key: '⌘N', description: 'Create new test case' },
  { key: '⌘F', description: 'Advanced filters' },
  { key: '⌘E', description: 'Edit selected' },
  { key: '⌘D', description: 'Duplicate selected' },
  { key: '⌘A', description: 'Select all' },
  { key: '⌘1', description: 'List view' },
  { key: '⌘2', description: 'Grid view' },
  { key: '⌘3', description: 'Kanban view' },
  { key: 'j / k', description: 'Navigate items' },
  { key: 'Enter', description: 'Open selected' },
  { key: 'Esc', description: 'Clear selection' },
  { key: 'Delete', description: 'Delete selected' },
  { key: '?', description: 'Keyboard shortcuts' },
];
