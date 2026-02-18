// =====================================================
// TIMELINE STATE — Zustand Store
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Granularity, Density, GroupByOption, FilterChip } from '@/types/producthub/initiative';

interface TimelineStateStore {
  granularity: Granularity;
  density: Density;
  groupBy: GroupByOption;
  activeFilter: FilterChip;
  searchTerm: string;
  selectedInitiativeId: string | null;
  isDetailOpen: boolean;
  collapsedGroups: Set<string>;

  setGranularity: (g: Granularity) => void;
  setDensity: (d: Density) => void;
  cycleDensity: () => void;
  setGroupBy: (g: GroupByOption) => void;
  setFilter: (f: FilterChip) => void;
  setSearch: (s: string) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  toggleGroup: (groupKey: string) => void;
}

export const useTimelineState = create<TimelineStateStore>()(
  persist(
    (set, get) => ({
      granularity: 'month',
      density: 'standard',
      groupBy: 'none',
      activeFilter: 'all',
      searchTerm: '',
      selectedInitiativeId: null,
      isDetailOpen: false,
      collapsedGroups: new Set<string>(),

      setGranularity: (granularity) => set({ granularity }),
      setDensity: (density) => set({ density }),
      cycleDensity: () => {
        const order: Density[] = ['compact', 'standard', 'comfortable'];
        const idx = order.indexOf(get().density);
        set({ density: order[(idx + 1) % order.length] });
      },
      setGroupBy: (groupBy) => set({ groupBy, collapsedGroups: new Set() }),
      setFilter: (activeFilter) => set({ activeFilter }),
      setSearch: (searchTerm) => set({ searchTerm }),
      openDetail: (id) => set({ selectedInitiativeId: id, isDetailOpen: true }),
      closeDetail: () => set({ selectedInitiativeId: null, isDetailOpen: false }),
      toggleGroup: (groupKey) => {
        const groups = new Set(get().collapsedGroups);
        if (groups.has(groupKey)) groups.delete(groupKey);
        else groups.add(groupKey);
        set({ collapsedGroups: groups });
      },
    }),
    {
      name: 'catalyst-timeline-state',
      partialize: (state) => ({
        granularity: state.granularity,
        density: state.density,
      }),
    }
  )
);
