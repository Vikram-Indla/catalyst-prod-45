/**
 * Keyboard Shortcuts Hook for Catalyst V5 Capacity Heatmap
 * Provides keyboard navigation and shortcuts
 */

import { useEffect, useCallback } from 'react';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import { toast } from 'sonner';

export function useKeyboardShortcuts() {
  const store = useHeatmapStore();
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    // ? = Show keyboard shortcuts
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      store.toggleKeyboardShortcuts();
      return;
    }
    
    // Ctrl/Cmd + Z = Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      const action = store.undo();
      if (action) {
        toast.info('Undo: ' + action.type);
      }
    }
    
    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      const action = store.redo();
      if (action) {
        toast.info('Redo: ' + action.type);
      }
    }
    
    // Escape = Clear selection or close panels
    if (e.key === 'Escape') {
      if (store.keyboardShortcutsOpen) {
        store.toggleKeyboardShortcuts();
      } else if (store.detailPanelOpen) {
        store.closeDetailPanel();
      } else {
        store.clearSelection();
      }
    }
    
    // Space = Toggle time-lapse
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      if (store.isTimeLapsePlaying) {
        store.stopTimeLapse();
        toast.info('Time-lapse paused');
      } else {
        store.startTimeLapse();
        toast.info('Time-lapse playing');
      }
    }
    
    // T = Toggle thermal view
    if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
      store.setViewMode(store.viewMode === 'thermal' ? 'standard' : 'thermal');
      toast.info(`View: ${store.viewMode === 'thermal' ? 'Standard' : 'Thermal'}`);
    }
    
    // P = Toggle pattern mode
    if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
      store.togglePatternMode();
      toast.info(`Pattern mode: ${!store.patternMode ? 'On' : 'Off'}`);
    }
    
    // W = Toggle what-if mode
    if (e.key === 'w' && !e.ctrlKey && !e.metaKey) {
      store.toggleScenarioMode();
      toast.info(`What-If mode: ${!store.scenarioMode ? 'On' : 'Off'}`);
    }
    
    // / = Focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const searchInput = document.getElementById('heatmap-search');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // 1-4 = Zoom levels
    if (['1', '2', '3', '4'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
      const levels: ('organization' | 'department' | 'team' | 'individual')[] = 
        ['organization', 'department', 'team', 'individual'];
      const level = levels[parseInt(e.key) - 1];
      store.setZoomLevel(level);
      toast.info(`Zoom: ${level}`);
    }
    
    // E = Expand all groups
    if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
      store.expandAllGroups();
      toast.info('All groups expanded');
    }
    
    // C = Collapse all groups
    if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
      store.collapseAllGroups();
      toast.info('All groups collapsed');
    }
    
    // R = Reset filters
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      store.resetFilters();
      toast.info('Filters reset');
    }
    
  }, [store]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const KEYBOARD_SHORTCUTS = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'T', description: 'Toggle thermal view' },
  { key: 'P', description: 'Toggle pattern mode (accessibility)' },
  { key: 'W', description: 'Toggle What-If mode' },
  { key: 'Space', description: 'Play/pause time-lapse' },
  { key: '/', description: 'Focus search' },
  { key: '1-4', description: 'Change zoom level' },
  { key: 'E', description: 'Expand all groups' },
  { key: 'C', description: 'Collapse all groups' },
  { key: 'R', description: 'Reset filters' },
  { key: 'Esc', description: 'Clear selection / Close panels' },
  { key: 'Ctrl+Z', description: 'Undo' },
  { key: 'Ctrl+Shift+Z', description: 'Redo' },
];
