/**
 * Capacity & Allocation Planning Hook
 * Manages state for the capacity planning module
 */

import { useState, useMemo, useCallback } from 'react';
import { 
  Resource, 
  CapacityProject, 
  Vacancy, 
  CapacityFilterState, 
  CapacityQuickFilter,
  CopyWeekOptions,
  Allocation
} from '@/types/capacity';
import { 
  MOCK_RESOURCES, 
  MOCK_PROJECTS, 
  MOCK_VACANCIES,
  getCurrentWeek,
  getCurrentYear,
  calculateUtilization,
  getStatus
} from '@/lib/capacityUtils';

export function useCapacity() {
  const [resources, setResources] = useState<Resource[]>(MOCK_RESOURCES);
  const [projects] = useState<CapacityProject[]>(MOCK_PROJECTS);
  const [vacancies, setVacancies] = useState<Vacancy[]>(MOCK_VACANCIES);
  const [currentWeek] = useState(getCurrentWeek());
  const [currentYear] = useState(getCurrentYear());
  const [startWeek, setStartWeek] = useState(currentWeek);
  const [startYear, setStartYear] = useState(currentYear);
  const [adminMode, setAdminMode] = useState(false);
  const [gridChanges, setGridChanges] = useState<Record<string, number>>({});
  const [activeFilters, setActiveFilters] = useState<CapacityFilterState>({});
  const [activeQuickFilters, setActiveQuickFilters] = useState<CapacityQuickFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate summary stats
  const stats = useMemo(() => {
    const result = { total: resources.length, under: 0, full: 0, over: 0 };
    resources.forEach(r => {
      const pct = calculateUtilization(r.allocations, startWeek, startYear);
      const status = getStatus(pct);
      if (status.status === 'over') result.over++;
      else if (status.status === 'full') result.full++;
      else result.under++;
    });
    return result;
  }, [resources, startWeek, startYear]);

  const openVacancies = useMemo(() => 
    vacancies.filter(v => v.status !== 'FILLED').length
  , [vacancies]);

  // Calculate available capacity for next 4 weeks
  const capacityPreview = useMemo(() => {
    const weeks: { week: number; year: number; available: number; peopleWithCapacity: number }[] = [];
    for (let i = 0; i < 4; i++) {
      let weekNum = startWeek + i;
      let yearNum = startYear;
      if (weekNum > 52) {
        weekNum = weekNum - 52;
        yearNum++;
      }
      
      let totalAvailable = 0;
      let peopleWithCapacity = 0;
      
      resources.forEach(r => {
        const used = calculateUtilization(r.allocations, weekNum, yearNum);
        const available = Math.max(0, r.capacity - used);
        totalAvailable += available;
        if (available > 0) peopleWithCapacity++;
      });
      
      weeks.push({ week: weekNum, year: yearNum, available: totalAvailable, peopleWithCapacity });
    }
    return weeks;
  }, [resources, startWeek, startYear]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      // Search filter
      if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Quick filters
      if (activeQuickFilters.includes('underallocated')) {
        const pct = calculateUtilization(r.allocations, startWeek, startYear);
        if (pct >= 80) return false;
      }
      if (activeQuickFilters.includes('overallocated')) {
        const pct = calculateUtilization(r.allocations, startWeek, startYear);
        if (pct <= 100) return false;
      }
      if (activeQuickFilters.includes('available')) {
        const pct = calculateUtilization(r.allocations, startWeek, startYear);
        if (pct >= 100) return false;
      }
      if (activeQuickFilters.includes('onsite') && r.location !== 'Onsite') return false;
      if (activeQuickFilters.includes('offshore') && r.location !== 'Offshore') return false;

      // Advanced filters
      if (activeFilters.department && r.department !== activeFilters.department) return false;
      if (activeFilters.location && r.location !== activeFilters.location) return false;
      if (activeFilters.skill && r.primarySkill !== activeFilters.skill) return false;

      return true;
    });
  }, [resources, searchQuery, activeQuickFilters, activeFilters, startWeek, startYear]);

  // Navigation
  const navigateWeeks = useCallback((delta: number) => {
    setStartWeek(prev => {
      let newWeek = prev + delta;
      if (newWeek < 1) {
        setStartYear(y => y - 1);
        newWeek = 52 + newWeek;
      } else if (newWeek > 52) {
        setStartYear(y => y + 1);
        newWeek = newWeek - 52;
      }
      return newWeek;
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setStartWeek(currentWeek);
    setStartYear(currentYear);
  }, [currentWeek, currentYear]);

  const toggleAdminMode = useCallback(() => {
    setAdminMode(prev => !prev);
  }, []);

  // Grid changes
  const handleGridChange = useCallback((resourceId: string, projectId: string, value: number) => {
    const key = `${resourceId}_${projectId}`;
    setGridChanges(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetGridChanges = useCallback(() => {
    setGridChanges({});
  }, []);

  const saveGridChanges = useCallback(() => {
    const changeCount = Object.keys(gridChanges).length;
    if (changeCount === 0) return 0;

    setResources(prev => prev.map(r => {
      const updatedAllocations = [...r.allocations];
      
      Object.entries(gridChanges).forEach(([key, value]) => {
        const [resourceId, projectId] = key.split('_');
        if (resourceId !== r.id) return;
        
        const existingIndex = updatedAllocations.findIndex(
          a => a.projectId === projectId && a.weekNumber === startWeek && a.year === startYear
        );
        
        if (value === 0) {
          if (existingIndex >= 0) {
            updatedAllocations.splice(existingIndex, 1);
          }
        } else if (existingIndex >= 0) {
          updatedAllocations[existingIndex] = { ...updatedAllocations[existingIndex], percentage: value };
        } else {
          updatedAllocations.push({
            id: `a${Date.now()}_${Math.random()}`,
            resourceId: r.id,
            projectId,
            weekNumber: startWeek,
            year: startYear,
            percentage: value,
            type: 'HARD',
            createdAt: new Date().toISOString()
          });
        }
      });
      
      return { ...r, allocations: updatedAllocations };
    }));
    
    setGridChanges({});
    return changeCount;
  }, [gridChanges, startWeek, startYear]);

  // Add resource
  const addResource = useCallback((data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'allocations'>) => {
    const newResource: Resource = {
      ...data,
      id: `r${Date.now()}`,
      allocations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setResources(prev => [newResource, ...prev]);
  }, []);

  // Add allocation
  const addAllocation = useCallback((allocation: Omit<Allocation, 'id' | 'createdAt'>) => {
    setResources(prev => prev.map(r => {
      if (r.id !== allocation.resourceId) return r;
      
      const newAllocation: Allocation = {
        ...allocation,
        id: `a${Date.now()}_${Math.random()}`,
        createdAt: new Date().toISOString()
      };
      
      return { ...r, allocations: [...r.allocations, newAllocation] };
    }));
  }, []);

  // Copy week allocations
  const copyWeekAllocations = useCallback((options: CopyWeekOptions) => {
    let toWeek = startWeek + 1;
    let toYear = startYear;
    if (toWeek > 52) {
      toWeek = 1;
      toYear++;
    }

    let count = 0;
    
    setResources(prev => prev.map(r => {
      if (options.mode === 'selected' && options.selectedResources && !options.selectedResources.includes(r.id)) {
        return r;
      }
      
      const weekAllocations = r.allocations.filter(
        a => a.weekNumber === startWeek && a.year === startYear
      );
      
      const toCopy = options.mode === 'hard' 
        ? weekAllocations.filter(a => a.type === 'HARD')
        : weekAllocations;
      
      const newAllocations = toCopy.map(a => ({
        ...a,
        id: `a${Date.now()}_${Math.random()}`,
        weekNumber: toWeek,
        year: toYear,
        notes: (a.notes || '') + ' (Copied)',
        createdAt: new Date().toISOString()
      }));
      
      count += newAllocations.length;
      
      return { ...r, allocations: [...r.allocations, ...newAllocations] };
    }));
    
    return count;
  }, [startWeek, startYear]);

  // Filters
  const toggleQuickFilter = useCallback((filter: CapacityQuickFilter) => {
    setActiveQuickFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setActiveQuickFilters([]);
    setSearchQuery('');
  }, []);

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  return {
    // Data
    resources: filteredResources,
    allResources: resources,
    projects,
    vacancies,
    stats,
    openVacancies,
    capacityPreview,
    
    // Week navigation
    currentWeek,
    currentYear,
    startWeek,
    startYear,
    navigateWeeks,
    goToCurrentWeek,
    
    // Admin mode
    adminMode,
    toggleAdminMode,
    
    // Grid
    gridChanges,
    handleGridChange,
    resetGridChanges,
    saveGridChanges,
    
    // Resources & Allocations
    addResource,
    addAllocation,
    copyWeekAllocations,
    
    // Filters
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    activeQuickFilters,
    toggleQuickFilter,
    clearAllFilters,
    
    // Utils
    getProject
  };
}
