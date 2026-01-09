/**
 * Hook to manage folder panel collapsed state with localStorage persistence
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'tm_folder_panel_collapsed';

export function useFolderPanelState() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'true';
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return {
    isCollapsed,
    toggle,
    collapse,
    expand,
  };
}
