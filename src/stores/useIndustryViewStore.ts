/**
 * Shared state store for Industry Backlog views (List & Kanban)
 * Ensures both views share the same search, filters, and scoring filter state
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
  
  // Avatar/Assignee filter
  selectedAssignees: string[];
  setSelectedAssignees: (assignees: string[]) => void;
  toggleAssignee: (assigneeId: string) => void;
  clearAssignees: () => void;
  
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
  
  // Avatar/Assignee filter
  selectedAssignees: [],
  setSelectedAssignees: (assignees) => set({ selectedAssignees: assignees }),
  toggleAssignee: (assigneeId) => set((state) => ({
    selectedAssignees: state.selectedAssignees.includes(assigneeId)
      ? state.selectedAssignees.filter(id => id !== assigneeId)
      : [...state.selectedAssignees, assigneeId]
  })),
  clearAssignees: () => set({ selectedAssignees: [] }),
  
  // Clear all
  clearAllFilters: () => set({
    searchQuery: '',
    scoringFilter: 'all',
    selectedAssignees: [],
  }),
}));
