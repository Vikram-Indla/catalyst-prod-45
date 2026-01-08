/**
 * Capacity View State Store
 * Single source of truth for capacity planner view state
 * Used for both normal rendering and presentation mode
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types matching CapacityPlannerPage
export type PrimaryView = 'resources' | 'projects' | 'contracts';
export type ResourceViewMode = 'cards' | 'table' | 'timeline' | 'heatmap';
export type ProjectViewMode = 'cards' | 'timeline';
export type PeriodType = 'weekly' | 'monthly' | 'quarterly';
export type GroupByType = 'none' | 'assignment' | 'department';
export type ActiveFilterType = 'all' | 'available' | 'atCapacity' | 'over';
export type DepartmentFilterType = 'all' | 'delivery' | 'product' | 'support';

export interface CapacityViewState {
  // Route context
  route: string;
  
  // Active tab / primary view
  primaryView: PrimaryView;
  resourceView: ResourceViewMode;
  projectView: ProjectViewMode;
  
  // Filters
  filters: {
    departmentFilter: DepartmentFilterType;
    activeFilter: ActiveFilterType;
    searchQuery: string;
    groupBy: GroupByType;
  };
  
  // Timeline state
  timeline: {
    period: PeriodType;
    year: number;
    scrollLeft: number;
    focusedMonth: number | null;
  };
  
  // UI state
  ui: {
    expandedRows: string[];
    selectedResourceId: string | null;
    isCollapsed: boolean;
    compactMode: boolean;
  };
  
  // Presentation mode
  presentationMode: boolean;
}

interface CapacityViewActions {
  // View actions
  setPrimaryView: (view: PrimaryView) => void;
  setResourceView: (view: ResourceViewMode) => void;
  setProjectView: (view: ProjectViewMode) => void;
  
  // Filter actions
  setDepartmentFilter: (filter: DepartmentFilterType) => void;
  setActiveFilter: (filter: ActiveFilterType) => void;
  setSearchQuery: (query: string) => void;
  setGroupBy: (groupBy: GroupByType) => void;
  
  // Timeline actions
  setPeriod: (period: PeriodType) => void;
  setYear: (year: number) => void;
  setScrollLeft: (scrollLeft: number) => void;
  setFocusedMonth: (month: number | null) => void;
  
  // UI actions
  setExpandedRows: (rows: string[]) => void;
  toggleExpandedRow: (rowId: string) => void;
  setSelectedResourceId: (id: string | null) => void;
  setIsCollapsed: (collapsed: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  
  // Presentation mode
  setPresentationMode: (mode: boolean) => void;
  enterPresentationMode: () => void;
  exitPresentationMode: () => void;
  
  // State serialization
  getSerializedState: () => string;
  restoreFromSerializedState: (serialized: string) => boolean;
  getStateSnapshot: () => CapacityViewState;
  
  // Reset
  reset: () => void;
}

const defaultState: CapacityViewState = {
  route: '/enterprise/capacity',
  primaryView: 'resources',
  resourceView: 'table',
  projectView: 'cards',
  filters: {
    departmentFilter: 'all',
    activeFilter: 'all',
    searchQuery: '',
    groupBy: 'none',
  },
  timeline: {
    period: 'monthly',
    year: new Date().getFullYear(),
    scrollLeft: 0,
    focusedMonth: null,
  },
  ui: {
    expandedRows: [],
    selectedResourceId: null,
    isCollapsed: false,
    compactMode: false,
  },
  presentationMode: false,
};

export const useCapacityViewStore = create<CapacityViewState & CapacityViewActions>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // View actions
      setPrimaryView: (view) => set({ primaryView: view }),
      setResourceView: (view) => set({ resourceView: view }),
      setProjectView: (view) => set({ projectView: view }),

      // Filter actions
      setDepartmentFilter: (filter) => set((state) => ({
        filters: { ...state.filters, departmentFilter: filter }
      })),
      setActiveFilter: (filter) => set((state) => ({
        filters: { ...state.filters, activeFilter: filter }
      })),
      setSearchQuery: (query) => set((state) => ({
        filters: { ...state.filters, searchQuery: query }
      })),
      setGroupBy: (groupBy) => set((state) => ({
        filters: { ...state.filters, groupBy: groupBy }
      })),

      // Timeline actions
      setPeriod: (period) => set((state) => ({
        timeline: { ...state.timeline, period }
      })),
      setYear: (year) => set((state) => ({
        timeline: { ...state.timeline, year }
      })),
      setScrollLeft: (scrollLeft) => set((state) => ({
        timeline: { ...state.timeline, scrollLeft }
      })),
      setFocusedMonth: (month) => set((state) => ({
        timeline: { ...state.timeline, focusedMonth: month }
      })),

      // UI actions
      setExpandedRows: (rows) => set((state) => ({
        ui: { ...state.ui, expandedRows: rows }
      })),
      toggleExpandedRow: (rowId) => set((state) => {
        const current = state.ui.expandedRows;
        const isExpanded = current.includes(rowId);
        return {
          ui: {
            ...state.ui,
            expandedRows: isExpanded
              ? current.filter((id) => id !== rowId)
              : [...current, rowId]
          }
        };
      }),
      setSelectedResourceId: (id) => set((state) => ({
        ui: { ...state.ui, selectedResourceId: id }
      })),
      setIsCollapsed: (collapsed) => set((state) => ({
        ui: { ...state.ui, isCollapsed: collapsed }
      })),
      setCompactMode: (compact) => set((state) => ({
        ui: { ...state.ui, compactMode: compact }
      })),

      // Presentation mode
      setPresentationMode: (mode) => set({ presentationMode: mode }),
      enterPresentationMode: () => set({ presentationMode: true }),
      exitPresentationMode: () => set({ presentationMode: false }),

      // State serialization for URL/sessionStorage
      getSerializedState: () => {
        const state = get();
        const snapshot: CapacityViewState = {
          route: state.route,
          primaryView: state.primaryView,
          resourceView: state.resourceView,
          projectView: state.projectView,
          filters: { ...state.filters },
          timeline: { ...state.timeline },
          ui: { ...state.ui },
          presentationMode: true, // Always true when serializing for presentation
        };
        return btoa(encodeURIComponent(JSON.stringify(snapshot)));
      },

      restoreFromSerializedState: (serialized) => {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(serialized))) as CapacityViewState;
          
          // Validate required fields
          if (!decoded.primaryView || !decoded.filters) {
            console.warn('Invalid serialized state: missing required fields');
            return false;
          }
          
          set({
            route: decoded.route || defaultState.route,
            primaryView: decoded.primaryView,
            resourceView: decoded.resourceView || defaultState.resourceView,
            projectView: decoded.projectView || defaultState.projectView,
            filters: {
              ...defaultState.filters,
              ...decoded.filters,
            },
            timeline: {
              ...defaultState.timeline,
              ...decoded.timeline,
            },
            ui: {
              ...defaultState.ui,
              ...decoded.ui,
            },
            presentationMode: decoded.presentationMode,
          });
          
          return true;
        } catch (e) {
          console.error('Failed to restore serialized state:', e);
          return false;
        }
      },

      getStateSnapshot: () => {
        const state = get();
        return {
          route: state.route,
          primaryView: state.primaryView,
          resourceView: state.resourceView,
          projectView: state.projectView,
          filters: { ...state.filters },
          timeline: { ...state.timeline },
          ui: { ...state.ui },
          presentationMode: state.presentationMode,
        };
      },

      // Reset to defaults
      reset: () => set(defaultState),
    }),
    {
      name: 'capacity-view-state',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        primaryView: state.primaryView,
        resourceView: state.resourceView,
        projectView: state.projectView,
        filters: state.filters,
        timeline: state.timeline,
        ui: state.ui,
      }),
    }
  )
);

// Helper hook for presentation URL state
export function usePresentationState() {
  const store = useCapacityViewStore();
  
  const generatePresentUrl = (): string => {
    const serialized = store.getSerializedState();
    return `/enterprise/capacity?mode=present&state=${serialized}`;
  };
  
  const parseUrlState = (searchParams: URLSearchParams): boolean => {
    const mode = searchParams.get('mode');
    const state = searchParams.get('state');
    
    if (mode === 'present' && state) {
      return store.restoreFromSerializedState(state);
    }
    return false;
  };
  
  return {
    generatePresentUrl,
    parseUrlState,
    isPresentationMode: store.presentationMode,
  };
}
