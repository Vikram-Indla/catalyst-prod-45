import { useState, useCallback, useMemo } from 'react';
import {
  DemandFilterState,
  EMPTY_DEMAND_FILTERS,
  countDemandFilterSelections,
  areDemandFiltersEqual,
} from '@/types/product-roadmap';
import { RoadmapViewport, getDefaultViewport } from '@/components/roadmaps/RoadmapDateFilterV2';

// Check if viewport equals default
function isViewportDefault(viewport: RoadmapViewport): boolean {
  const defaultVp = getDefaultViewport();
  return (
    viewport.scale === defaultVp.scale &&
    JSON.stringify(viewport.selectedYears) === JSON.stringify(defaultVp.selectedYears) &&
    JSON.stringify(viewport.selectedQuarters) === JSON.stringify(defaultVp.selectedQuarters)
  );
}

// Compare viewports
function areViewportsEqual(a: RoadmapViewport, b: RoadmapViewport): boolean {
  return (
    a.scale === b.scale &&
    JSON.stringify(a.selectedYears) === JSON.stringify(b.selectedYears) &&
    JSON.stringify(a.selectedQuarters) === JSON.stringify(b.selectedQuarters)
  );
}

interface UseProductRoadmapFiltersReturn {
  appliedFilters: DemandFilterState;
  appliedViewport: RoadmapViewport;
  draftFilters: DemandFilterState;
  draftViewport: RoadmapViewport;
  activeFilterCount: number;
  
  openFilters: () => void;
  applyFilters: () => void;
  cancelFilters: () => void;
  clearAll: () => void;
  
  // Status & Workflow
  toggleStatus: (status: string) => void;
  // Business Owner
  toggleOwner: (ownerId: string) => void;
  // Platform
  togglePlatform: (platform: string) => void;
  // Assignee
  toggleAssignee: (assigneeId: string) => void;
  // Planned Quarter
  toggleQuarter: (quarter: string) => void;
  // Priority Tier
  togglePriorityTier: (tier: string) => void;
  // Health
  toggleHealth: (health: string) => void;
  // Milestone Condition
  toggleMilestoneCondition: (condition: string) => void;
  
  updateDraftViewport: (viewport: RoadmapViewport) => void;
  
  hasPendingChanges: boolean;
  isViewportAtDefault: boolean;
}

export function useProductRoadmapFilters(): UseProductRoadmapFiltersReturn {
  // Applied state (drives data)
  const [appliedFilters, setAppliedFilters] = useState<DemandFilterState>(EMPTY_DEMAND_FILTERS);
  const [appliedViewport, setAppliedViewport] = useState<RoadmapViewport>(getDefaultViewport);
  
  // Draft state (for staged editing)
  const [draftFilters, setDraftFilters] = useState<DemandFilterState>(EMPTY_DEMAND_FILTERS);
  const [draftViewport, setDraftViewport] = useState<RoadmapViewport>(getDefaultViewport);
  
  // Badge count
  const activeFilterCount = useMemo(
    () => countDemandFilterSelections(appliedFilters),
    [appliedFilters]
  );
  
  // Check if viewport is at default
  const isViewportAtDefault = useMemo(
    () => isViewportDefault(appliedViewport),
    [appliedViewport]
  );
  
  // Check for pending changes
  const hasPendingChanges = useMemo(
    () => !areDemandFiltersEqual(draftFilters, appliedFilters) || !areViewportsEqual(draftViewport, appliedViewport),
    [draftFilters, appliedFilters, draftViewport, appliedViewport]
  );
  
  // Lifecycle: Open filters panel
  const openFilters = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setDraftViewport({ ...appliedViewport });
  }, [appliedFilters, appliedViewport]);
  
  // Lifecycle: Apply filters AND viewport
  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setAppliedViewport({ ...draftViewport });
  }, [draftFilters, draftViewport]);
  
  // Lifecycle: Cancel (discard draft)
  const cancelFilters = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setDraftViewport({ ...appliedViewport });
  }, [appliedFilters, appliedViewport]);
  
  // Lifecycle: Clear all (reset everything)
  const clearAll = useCallback(() => {
    const defaultViewport = getDefaultViewport();
    setAppliedFilters(EMPTY_DEMAND_FILTERS);
    setDraftFilters(EMPTY_DEMAND_FILTERS);
    setAppliedViewport(defaultViewport);
    setDraftViewport(defaultViewport);
  }, []);
  
  // Draft mutations - Status
  const toggleStatus = useCallback((status: string) => {
    setDraftFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  }, []);
  
  // Draft mutations - Owner
  const toggleOwner = useCallback((ownerId: string) => {
    setDraftFilters(prev => ({
      ...prev,
      ownerIds: prev.ownerIds.includes(ownerId)
        ? prev.ownerIds.filter(o => o !== ownerId)
        : [...prev.ownerIds, ownerId],
    }));
  }, []);
  
  // Draft mutations - Platform
  const togglePlatform = useCallback((platform: string) => {
    setDraftFilters(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  }, []);
  
  // Draft mutations - Assignee
  const toggleAssignee = useCallback((assigneeId: string) => {
    setDraftFilters(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(assigneeId)
        ? prev.assigneeIds.filter(a => a !== assigneeId)
        : [...prev.assigneeIds, assigneeId],
    }));
  }, []);
  
  // Draft mutations - Quarter
  const toggleQuarter = useCallback((quarter: string) => {
    setDraftFilters(prev => ({
      ...prev,
      quarters: prev.quarters.includes(quarter)
        ? prev.quarters.filter(q => q !== quarter)
        : [...prev.quarters, quarter],
    }));
  }, []);
  
  // Draft mutations - Priority Tier
  const togglePriorityTier = useCallback((tier: string) => {
    setDraftFilters(prev => ({
      ...prev,
      priorityTiers: prev.priorityTiers.includes(tier)
        ? prev.priorityTiers.filter(t => t !== tier)
        : [...prev.priorityTiers, tier],
    }));
  }, []);
  
  // Draft mutations - Health
  const toggleHealth = useCallback((health: string) => {
    setDraftFilters(prev => ({
      ...prev,
      health: prev.health.includes(health)
        ? prev.health.filter(h => h !== health)
        : [...prev.health, health],
    }));
  }, []);
  
  // Draft mutations - Milestone Condition
  const toggleMilestoneCondition = useCallback((condition: string) => {
    setDraftFilters(prev => ({
      ...prev,
      milestoneConditions: prev.milestoneConditions.includes(condition)
        ? prev.milestoneConditions.filter(c => c !== condition)
        : [...prev.milestoneConditions, condition],
    }));
  }, []);
  
  // Viewport handling
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
    toggleOwner,
    togglePlatform,
    toggleAssignee,
    toggleQuarter,
    togglePriorityTier,
    toggleHealth,
    toggleMilestoneCondition,
    updateDraftViewport,
    hasPendingChanges,
    isViewportAtDefault,
  };
}
