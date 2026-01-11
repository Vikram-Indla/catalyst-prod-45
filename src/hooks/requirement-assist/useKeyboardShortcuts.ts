// ============================================================
// USE KEYBOARD SHORTCUTS HOOK
// Global keyboard shortcuts for the module
// ============================================================

import { useEffect, useCallback } from 'react';
import { useRequirementAssistStore } from '@/stores/requirementAssistStore';
import { useGeneration } from './useGeneration';

export function useKeyboardShortcuts() {
  const { 
    isGenerating, 
    isDetailOpen, 
    selectedItemId,
    workItems,
    closeDetail, 
    selectItem,
    toggleExpanded,
    expandAll,
    collapseAll,
    openDetail,
  } = useRequirementAssistStore();
  
  const { startGeneration } = useGeneration();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable;

    // ⌘G or Ctrl+G - Generate (works even in input)
    if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
      e.preventDefault();
      if (!isGenerating) {
        startGeneration();
      }
      return;
    }

    // Escape - Close detail panel or deselect
    if (e.key === 'Escape') {
      if (isDetailOpen) {
        closeDetail();
      } else if (selectedItemId) {
        selectItem(null);
      }
      return;
    }

    // Don't process other shortcuts if in input
    if (isInput) return;

    // ⌘K or Ctrl+K - Command palette (future)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      // TODO: Open command palette
      return;
    }

    // ⌘E or Ctrl+E - Expand all
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      expandAll();
      return;
    }

    // ⌘⇧E or Ctrl+Shift+E - Collapse all
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      collapseAll();
      return;
    }

    // Arrow navigation in tree
    if (selectedItemId && workItems.length > 0) {
      const currentIndex = workItems.findIndex(w => w.id === selectedItemId);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, workItems.length - 1);
        selectItem(workItems[nextIndex].id);
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        selectItem(workItems[prevIndex].id);
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const item = workItems[currentIndex];
        if (item.itemType === 'epic' || item.itemType === 'feature') {
          toggleExpanded(item.id);
        }
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const item = workItems[currentIndex];
        if (item.itemType === 'epic' || item.itemType === 'feature') {
          toggleExpanded(item.id);
        } else if (item.parentId) {
          selectItem(item.parentId);
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isDetailOpen) {
          openDetail();
        }
      }
    }

  }, [
    isGenerating, 
    isDetailOpen, 
    selectedItemId, 
    workItems,
    startGeneration, 
    closeDetail, 
    selectItem,
    toggleExpanded,
    expandAll,
    collapseAll,
    openDetail,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
