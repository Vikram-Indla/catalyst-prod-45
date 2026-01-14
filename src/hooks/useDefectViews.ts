import { useState, useCallback, useMemo } from 'react';
import type { SavedView, DefectFilters } from '@/types/defect.types';

const DEFAULT_VIEWS: SavedView[] = [
  { id: 'all', name: 'All', filters: {}, isDefault: true },
  { 
    id: 'open', 
    name: 'Open', 
    filters: { statuses: ['new', 'triaged', 'in_progress', 'reopened'] }, 
    isDefault: true 
  },
  { 
    id: 'my-issues', 
    name: 'My Issues', 
    filters: { assigneeIds: ['CURRENT_USER'] }, 
    isDefault: true 
  },
  { 
    id: 'critical', 
    name: 'Critical', 
    filters: { severities: ['critical'] }, 
    isDefault: true 
  },
];

export function useDefectViews(_projectId: string) {
  const [views, setViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [activeViewId, setActiveViewId] = useState<string>('all');

  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) || views[0],
    [views, activeViewId]
  );

  const saveView = useCallback((name: string, filters: Partial<DefectFilters>) => {
    const newView: SavedView = {
      id: `custom-${Date.now()}`,
      name,
      filters,
      isDefault: false,
    };
    setViews(prev => [...prev, newView]);
    setActiveViewId(newView.id);
    // TODO: Persist to user preferences in database
  }, []);

  const deleteView = useCallback((viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId || v.isDefault));
    if (activeViewId === viewId) {
      setActiveViewId('all');
    }
  }, [activeViewId]);

  const selectView = useCallback((viewId: string) => {
    setActiveViewId(viewId);
  }, []);

  return {
    views,
    activeView,
    activeViewId,
    saveView,
    deleteView,
    selectView,
  };
}
