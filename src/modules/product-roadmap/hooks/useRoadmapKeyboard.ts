/**
 * Keyboard navigation hook for roadmap
 * Provides vim-like navigation and standard shortcuts
 */

import { useEffect, useCallback, useState } from 'react';
import type { RoadmapDemand } from '../types/roadmap';

interface KeyboardConfig {
  items: RoadmapDemand[];
  onSelect: (id: string | null) => void;
  onOpenDrawer: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onCreateNew: () => void;
  enabled?: boolean;
}

interface UseRoadmapKeyboardReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  isNavigating: boolean;
}

export const keyboardShortcuts = [
  { keys: ['↑', 'k'], description: 'Move focus up' },
  { keys: ['↓', 'j'], description: 'Move focus down' },
  { keys: ['Enter'], description: 'Open item details' },
  { keys: ['e'], description: 'Edit item' },
  { keys: ['⌘', 'Delete'], description: 'Delete item' },
  { keys: ['Shift', '↑'], description: 'Move item up' },
  { keys: ['Shift', '↓'], description: 'Move item down' },
  { keys: ['/'], description: 'Focus search' },
  { keys: ['⌘', 'n'], description: 'Create new item' },
  { keys: ['Esc'], description: 'Clear focus' },
];

export function useRoadmapKeyboard(config: KeyboardConfig): UseRoadmapKeyboardReturn {
  const { 
    items, 
    onSelect, 
    onOpenDrawer, 
    onEdit, 
    onDelete, 
    onMove, 
    onCreateNew,
    enabled = true,
  } = config;

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Only handle if roadmap container is focused or its children
    const roadmapContainer = document.querySelector('[data-roadmap-container]');
    if (!roadmapContainer?.contains(document.activeElement) && 
        document.activeElement !== document.body) {
      return;
    }

    // Ignore if typing in an input
    const activeEl = document.activeElement;
    if (activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' ||
      (activeEl as HTMLElement).contentEditable === 'true'
    )) {
      // Only handle Escape in inputs
      if (event.key === 'Escape') {
        (activeEl as HTMLElement).blur();
        event.preventDefault();
      }
      return;
    }

    const key = event.key;
    const hasModifier = event.metaKey || event.ctrlKey;
    const hasShift = event.shiftKey;

    switch (key) {
      // Navigation - Down
      case 'ArrowDown':
      case 'j':
        if (hasShift && focusedIndex < items.length - 1 && items[focusedIndex]) {
          // Move item down
          event.preventDefault();
          onMove(items[focusedIndex].id, 'down');
          setFocusedIndex(prev => prev + 1);
        } else if (!hasShift) {
          event.preventDefault();
          setIsNavigating(true);
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
        }
        break;

      // Navigation - Up
      case 'ArrowUp':
      case 'k':
        if (hasShift && focusedIndex > 0 && items[focusedIndex]) {
          // Move item up
          event.preventDefault();
          onMove(items[focusedIndex].id, 'up');
          setFocusedIndex(prev => prev - 1);
        } else if (!hasShift) {
          event.preventDefault();
          setIsNavigating(true);
          setFocusedIndex(prev => Math.max(prev - 1, 0));
        }
        break;

      // Jump to start
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      // Jump to end
      case 'End':
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;

      // Selection / Open
      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && items[focusedIndex]) {
          event.preventDefault();
          if (hasModifier) {
            onEdit(items[focusedIndex].id);
          } else {
            onOpenDrawer(items[focusedIndex].id);
          }
        }
        break;

      // Edit
      case 'e':
        if (!hasModifier && focusedIndex >= 0 && items[focusedIndex]) {
          event.preventDefault();
          onEdit(items[focusedIndex].id);
        }
        break;

      // Delete
      case 'Delete':
      case 'Backspace':
        if (hasModifier && focusedIndex >= 0 && items[focusedIndex]) {
          event.preventDefault();
          onDelete(items[focusedIndex].id);
        }
        break;

      // Focus search
      case '/':
        if (!hasModifier) {
          event.preventDefault();
          const searchInput = document.querySelector('[data-roadmap-search]') as HTMLInputElement;
          searchInput?.focus();
        }
        break;

      // Create new
      case 'n':
        if (hasModifier) {
          event.preventDefault();
          onCreateNew();
        }
        break;

      // Escape - clear focus
      case 'Escape':
        event.preventDefault();
        setFocusedIndex(-1);
        setIsNavigating(false);
        onSelect(null);
        (document.activeElement as HTMLElement)?.blur();
        break;
    }
  }, [enabled, items, focusedIndex, onSelect, onOpenDrawer, onEdit, onDelete, onMove, onCreateNew]);

  // Attach/detach event listener
  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  // Focus the row element when index changes via keyboard
  useEffect(() => {
    if (focusedIndex >= 0 && isNavigating) {
      const row = document.querySelector(`[data-row-index="${focusedIndex}"]`) as HTMLElement;
      row?.focus();
      
      // Update selection
      if (items[focusedIndex]) {
        onSelect(items[focusedIndex].id);
      }
    }
  }, [focusedIndex, isNavigating, items, onSelect]);

  return {
    focusedIndex,
    setFocusedIndex,
    isNavigating,
  };
}
