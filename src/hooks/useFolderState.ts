/**
 * Custom hook for managing folder panel state
 * Persists collapsed state and expanded folders to localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { FolderPanelState, EntityType } from '@/types/folder';

const STORAGE_KEY = 'catalyst_tests_folder_panel_state';

const DEFAULT_STATE: FolderPanelState = {
  test_cases_collapsed: false,
  test_sets_collapsed: false,
  test_cycles_collapsed: false,
  expanded_folders: []
};

export function useFolderState(entityType: EntityType) {
  const [state, setState] = useState<FolderPanelState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_STATE, ...JSON.parse(stored) } : DEFAULT_STATE;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const isCollapsed = state[`${entityType}_collapsed` as keyof FolderPanelState] as boolean;
  
  const toggleCollapse = useCallback(() => {
    setState(prev => ({
      ...prev,
      [`${entityType}_collapsed`]: !prev[`${entityType}_collapsed` as keyof FolderPanelState]
    }));
  }, [entityType]);

  const expandedFolders = state.expanded_folders;

  const toggleFolder = useCallback((folderId: string) => {
    setState(prev => {
      const expanded = prev.expanded_folders;
      const isExpanded = expanded.includes(folderId);
      
      return {
        ...prev,
        expanded_folders: isExpanded
          ? expanded.filter(id => id !== folderId)
          : [...expanded, folderId]
      };
    });
  }, []);

  const expandFolder = useCallback((folderId: string) => {
    setState(prev => {
      if (prev.expanded_folders.includes(folderId)) {
        return prev;
      }
      return {
        ...prev,
        expanded_folders: [...prev.expanded_folders, folderId]
      };
    });
  }, []);

  const collapseFolder = useCallback((folderId: string) => {
    setState(prev => ({
      ...prev,
      expanded_folders: prev.expanded_folders.filter(id => id !== folderId)
    }));
  }, []);

  const collapseAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      expanded_folders: []
    }));
  }, []);

  return {
    isCollapsed,
    toggleCollapse,
    expandedFolders,
    toggleFolder,
    expandFolder,
    collapseFolder,
    collapseAll
  };
}
