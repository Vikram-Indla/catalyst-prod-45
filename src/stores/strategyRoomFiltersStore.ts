// Strategy Room Filters Store
// Manages filter state with URL/localStorage persistence

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HealthStatus = 'Green' | 'Amber' | 'Red';
export type ProgressState = 'Not Started' | 'In Progress' | 'Accepted';
export type AgeingFilter = 'All' | '7' | '14' | '30';

export interface StrategyRoomFilters {
  snapshotId: string;
  includeArchivedSnapshots: boolean;
  programIds: string[];
  quarterIds: string[];
  themeIds: string[];
  strategicTeamIds: string[];
  ownerIds: string[];
  health: HealthStatus[];
  progressStates: ProgressState[];
  ageing: AgeingFilter;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  misalignedOnly: boolean;
}

export const defaultFilters: Omit<StrategyRoomFilters, 'snapshotId'> = {
  includeArchivedSnapshots: false,
  programIds: [],
  quarterIds: [],
  themeIds: [],
  strategicTeamIds: [],
  ownerIds: [],
  health: [],
  progressStates: [],
  ageing: 'All',
  createdFrom: undefined,
  createdTo: undefined,
  updatedFrom: undefined,
  updatedTo: undefined,
  misalignedOnly: false,
};

interface StrategyRoomFiltersState {
  // Applied filters (used by widgets)
  appliedFilters: StrategyRoomFilters;
  // Draft filters (editable in drawer)
  draftFilters: StrategyRoomFilters;
  // Drawer state
  isDrawerOpen: boolean;
  // Actions
  setSnapshotId: (id: string) => void;
  updateDraftFilter: <K extends keyof StrategyRoomFilters>(key: K, value: StrategyRoomFilters[K]) => void;
  applyFilters: () => void;
  clearAllFilters: () => void;
  resetDraftToApplied: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  // Quick filter actions
  applyQuickFilter: (type: 'myPrograms' | 'currentQuarter' | 'showArchived' | 'misalignedOnly' | 'needsAttention' | 'resetToActive', payload?: string[]) => void;
  // Count active filters (excluding snapshotId)
  getActiveFilterCount: () => number;
  // Check if draft has changes
  isDirty: () => boolean;
}

// Helper to count active filters
const countActiveFilters = (filters: StrategyRoomFilters): number => {
  let count = 0;
  if (filters.includeArchivedSnapshots) count++;
  if (filters.programIds.length > 0) count++;
  if (filters.quarterIds.length > 0) count++;
  if (filters.themeIds.length > 0) count++;
  if (filters.strategicTeamIds.length > 0) count++;
  if (filters.ownerIds.length > 0) count++;
  if (filters.health.length > 0) count++;
  if (filters.progressStates.length > 0) count++;
  if (filters.ageing !== 'All') count++;
  if (filters.createdFrom || filters.createdTo) count++;
  if (filters.updatedFrom || filters.updatedTo) count++;
  if (filters.misalignedOnly) count++;
  return count;
};

// Check if two filter objects are equal (excluding snapshotId)
const areFiltersEqual = (a: StrategyRoomFilters, b: StrategyRoomFilters): boolean => {
  return (
    a.includeArchivedSnapshots === b.includeArchivedSnapshots &&
    JSON.stringify(a.programIds) === JSON.stringify(b.programIds) &&
    JSON.stringify(a.quarterIds) === JSON.stringify(b.quarterIds) &&
    JSON.stringify(a.themeIds) === JSON.stringify(b.themeIds) &&
    JSON.stringify(a.strategicTeamIds) === JSON.stringify(b.strategicTeamIds) &&
    JSON.stringify(a.ownerIds) === JSON.stringify(b.ownerIds) &&
    JSON.stringify(a.health) === JSON.stringify(b.health) &&
    JSON.stringify(a.progressStates) === JSON.stringify(b.progressStates) &&
    a.ageing === b.ageing &&
    a.createdFrom === b.createdFrom &&
    a.createdTo === b.createdTo &&
    a.updatedFrom === b.updatedFrom &&
    a.updatedTo === b.updatedTo &&
    a.misalignedOnly === b.misalignedOnly
  );
};

const initialFilters: StrategyRoomFilters = {
  snapshotId: '',
  ...defaultFilters,
};

export const useStrategyRoomFiltersStore = create<StrategyRoomFiltersState>()(
  persist(
    (set, get) => ({
      appliedFilters: initialFilters,
      draftFilters: initialFilters,
      isDrawerOpen: false,

      setSnapshotId: (id: string) => {
        const { appliedFilters } = get();
        // When snapshot changes, reset all filters except includeArchivedSnapshots
        const newFilters: StrategyRoomFilters = {
          ...defaultFilters,
          snapshotId: id,
          includeArchivedSnapshots: appliedFilters.includeArchivedSnapshots,
        };
        set({
          appliedFilters: newFilters,
          draftFilters: newFilters,
        });
      },

      updateDraftFilter: (key, value) => {
        set((state) => ({
          draftFilters: {
            ...state.draftFilters,
            [key]: value,
          },
        }));
      },

      applyFilters: () => {
        const { draftFilters } = get();
        set({
          appliedFilters: { ...draftFilters },
          isDrawerOpen: false,
        });
      },

      clearAllFilters: () => {
        const { appliedFilters } = get();
        const clearedFilters: StrategyRoomFilters = {
          ...defaultFilters,
          snapshotId: appliedFilters.snapshotId,
        };
        set({
          draftFilters: clearedFilters,
          appliedFilters: clearedFilters,
        });
      },

      resetDraftToApplied: () => {
        set((state) => ({
          draftFilters: { ...state.appliedFilters },
        }));
      },

      openDrawer: () => {
        set((state) => ({
          isDrawerOpen: true,
          draftFilters: { ...state.appliedFilters },
        }));
      },

      closeDrawer: () => {
        set((state) => ({
          isDrawerOpen: false,
          draftFilters: { ...state.appliedFilters },
        }));
      },

      applyQuickFilter: (type, payload) => {
        const { appliedFilters, draftFilters } = get();
        let newDraft = { ...draftFilters };

        switch (type) {
          case 'myPrograms':
            newDraft.programIds = payload || [];
            break;
          case 'currentQuarter':
            newDraft.quarterIds = payload || [];
            break;
          case 'showArchived':
            newDraft.includeArchivedSnapshots = !newDraft.includeArchivedSnapshots;
            break;
          case 'misalignedOnly':
            newDraft.misalignedOnly = !newDraft.misalignedOnly;
            break;
          case 'needsAttention':
            if (newDraft.health.includes('Red') && newDraft.health.includes('Amber')) {
              newDraft.health = [];
            } else {
              newDraft.health = ['Red', 'Amber'];
            }
            break;
          case 'resetToActive':
            newDraft = {
              ...defaultFilters,
              snapshotId: appliedFilters.snapshotId,
            };
            break;
        }

        set({
          draftFilters: newDraft,
          appliedFilters: newDraft,
        });
      },

      getActiveFilterCount: () => {
        return countActiveFilters(get().appliedFilters);
      },

      isDirty: () => {
        const { appliedFilters, draftFilters } = get();
        return !areFiltersEqual(appliedFilters, draftFilters);
      },
    }),
    {
      name: 'strategy-room-filters',
      partialize: (state) => ({
        appliedFilters: state.appliedFilters,
      }),
    }
  )
);
