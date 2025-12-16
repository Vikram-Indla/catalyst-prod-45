import { useState, useCallback, useMemo } from 'react';
import {
  FilterState,
  TimelineState,
  EMPTY_FILTERS,
  DEFAULT_TIMELINE,
  countFilterSelections,
  areFiltersEqual,
  ProgressRange,
  KRCondition,
} from '@/types/canonical-roadmap-filters';
import { RoadmapViewport, getDefaultViewport } from '@/components/roadmaps/RoadmapDateFilterV2';

interface UseCanonicalRoadmapFiltersReturn {
  // Applied state (drives data display)
  appliedFilters: FilterState;
  appliedViewport: RoadmapViewport;
  
  // Draft state (for staged editing)
  draftFilters: FilterState;
  draftViewport: RoadmapViewport;
  
  // Badge count (excludes timeline)
  activeFilterCount: number;
  
  // Lifecycle actions
  openFilters: () => void;           // draftFilters = appliedFilters
  applyFilters: () => void;          // appliedFilters = draftFilters, close
  cancelFilters: () => void;         // draftFilters = appliedFilters, close
  clearAll: () => void;              // Reset both filters AND timeline to defaults
  
  // Draft mutation helpers
  toggleStatus: (status: string) => void;
  toggleTheme: (themeId: string) => void;
  toggleOwner: (ownerId: string) => void;
  toggleProgressRange: (range: ProgressRange) => void;
  toggleKRCondition: (condition: KRCondition) => void;
  
  // Viewport handling
  applyViewport: (viewport: RoadmapViewport) => void;
  
  // Computed
  hasPendingChanges: boolean;
}

export function useCanonicalRoadmapFilters(): UseCanonicalRoadmapFiltersReturn {
  // Applied state (drives data)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedViewport, setAppliedViewport] = useState<RoadmapViewport>(getDefaultViewport);
  
  // Draft state (for staged editing in panel)
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftViewport, setDraftViewport] = useState<RoadmapViewport>(getDefaultViewport);
  
  // Badge count
  const activeFilterCount = useMemo(
    () => countFilterSelections(appliedFilters),
    [appliedFilters]
  );
  
  // Check if there are pending changes
  const hasPendingChanges = useMemo(
    () => !areFiltersEqual(draftFilters, appliedFilters),
    [draftFilters, appliedFilters]
  );
  
  // Lifecycle: Open filters panel
  const openFilters = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setDraftViewport({ ...appliedViewport });
  }, [appliedFilters, appliedViewport]);
  
  // Lifecycle: Apply filters
  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    // Note: viewport is applied separately via applyViewport
  }, [draftFilters]);
  
  // Lifecycle: Cancel (discard draft changes)
  const cancelFilters = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setDraftViewport({ ...appliedViewport });
  }, [appliedFilters, appliedViewport]);
  
  // Lifecycle: Clear all (reset everything)
  const clearAll = useCallback(() => {
    setAppliedFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedViewport(getDefaultViewport());
    setDraftViewport(getDefaultViewport());
  }, []);
  
  // Draft mutations
  const toggleStatus = useCallback((status: string) => {
    setDraftFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  }, []);
  
  const toggleTheme = useCallback((themeId: string) => {
    setDraftFilters(prev => ({
      ...prev,
      themeIds: prev.themeIds.includes(themeId)
        ? prev.themeIds.filter(t => t !== themeId)
        : [...prev.themeIds, themeId],
    }));
  }, []);
  
  const toggleOwner = useCallback((ownerId: string) => {
    setDraftFilters(prev => ({
      ...prev,
      ownerIds: prev.ownerIds.includes(ownerId)
        ? prev.ownerIds.filter(o => o !== ownerId)
        : [...prev.ownerIds, ownerId],
    }));
  }, []);
  
  const toggleProgressRange = useCallback((range: ProgressRange) => {
    setDraftFilters(prev => ({
      ...prev,
      progressRanges: prev.progressRanges.includes(range)
        ? prev.progressRanges.filter(r => r !== range)
        : [...prev.progressRanges, range],
    }));
  }, []);
  
  const toggleKRCondition = useCallback((condition: KRCondition) => {
    setDraftFilters(prev => ({
      ...prev,
      krConditions: prev.krConditions.includes(condition)
        ? prev.krConditions.filter(c => c !== condition)
        : [...prev.krConditions, condition],
    }));
  }, []);
  
  // Viewport handling (applied immediately, not staged)
  const applyViewport = useCallback((viewport: RoadmapViewport) => {
    setAppliedViewport(viewport);
    setDraftViewport(viewport);
  }, []);
  
  return {
    appliedFilters,
    appliedViewport,
    draftFilters,
    draftViewport,
    activeFilterCount,
    openFilters,
    applyFilters,
    cancelFilters,
    clearAll,
    toggleStatus,
    toggleTheme,
    toggleOwner,
    toggleProgressRange,
    toggleKRCondition,
    applyViewport,
    hasPendingChanges,
  };
}
