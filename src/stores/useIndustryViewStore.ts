/**
 * Shared state store for Industry Backlog views (List & Kanban)
 * Ensures both views share the same search and scoring filter state
 */

import { create } from 'zustand';

export type ScoringFilter = 'all' | 'scored' | 'unscored';

interface IndustryViewState {
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Scoring filter
  scoringFilter: ScoringFilter;
  setScoringFilter: (filter: ScoringFilter) => void;
  
  // Clear all filters
  clearAllFilters: () => void;
}

export const useIndustryViewStore = create<IndustryViewState>((set) => ({
  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Scoring filter
  scoringFilter: 'all',
  setScoringFilter: (filter) => set({ scoringFilter: filter }),
  
  // Clear all
  clearAllFilters: () => set({
    searchQuery: '',
    scoringFilter: 'all',
  }),
}));
