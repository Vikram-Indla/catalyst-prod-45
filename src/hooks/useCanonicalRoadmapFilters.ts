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

// Check if viewport equals default (for skip-filtering logic)
function isViewportDefault(viewport: RoadmapViewport): boolean {
  const defaultVp = getDefaultViewport();
  return (
    viewport.scale === defaultVp.scale &&
    JSON.stringify(viewport.selectedYears) === JSON.stringify(defaultVp.selectedYears) &&
    JSON.stringify(viewport.selectedQuarters) === JSON.stringify(defaultVp.selectedQuarters)
  );
}

// Compare two viewports for equality
function areViewportsEqual(a: RoadmapViewport, b: RoadmapViewport): boolean {
  return (
    a.scale === b.scale &&
    JSON.stringify(a.selectedYears) === JSON.stringify(b.selectedYears) &&
    JSON.stringify(a.selectedQuarters) === JSON.stringify(b.selectedQuarters)
  );
}

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
  applyFilters: () => void;          // appliedFilters = draftFilters (AND viewport), close
  cancelFilters: () => void;         // draftFilters = appliedFilters, close
  clearAll: () => void;              // Reset both filters AND viewport to defaults
  
  // Draft mutation helpers
  toggleStatus: (status: string) => void;
  toggleTheme: (themeId: string) => void;
  toggleOwner: (ownerId: string) => void;
  toggleProgressRange: (range: ProgressRange) => void;
  toggleKRCondition: (condition: KRCondition) => void;
  
  // Viewport handling (staged, not immediate)
  updateDraftViewport: (viewport: RoadmapViewport) => void;
  
  // Computed
  hasPendingChanges: boolean;
  isViewportAtDefault: boolean;
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
  
  // Check if viewport is at default (for skip-filtering)
  const isViewportAtDefault = useMemo(
    () => isViewportDefault(appliedViewport),
    [appliedViewport]
  );
  
  // Check if there are pending changes (includes viewport)
  const hasPendingChanges = useMemo(
    () => !areFiltersEqual(draftFilters, appliedFilters) || !areViewportsEqual(draftViewport, appliedViewport),
    [draftFilters, appliedFilters, draftViewport, appliedViewport]
  );
  
  // Lifecycle: Open filters panel
  const openFilters = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setDraftViewport({ ...appliedViewport });
  }, [appliedFilters, appliedViewport]);
  
  // Lifecycle: Apply filters AND viewport together
  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setAppliedViewport({ ...draftViewport });
  }, [draftFilters, draftViewport]);
  
  // Lifecycle: Cancel (discard draft changes)
  const cancelFilters = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setDraftViewport({ ...appliedViewport });
  }, [appliedFilters, appliedViewport]);
  
  // Lifecycle: Clear all (reset everything to defaults)
  const clearAll = useCallback(() => {
    const defaultViewport = getDefaultViewport();
    setAppliedFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedViewport(defaultViewport);
    setDraftViewport(defaultViewport);
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
  
  // Viewport handling (staged - updates draft only)
  const updateDraftViewport = useCallback((viewport: RoadmapViewport) => {
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
    updateDraftViewport,
    hasPendingChanges,
    isViewportAtDefault,
  };
}
