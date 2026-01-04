/**
 * Zustand Store for Catalyst V5 Capacity Heatmap
 * Centralized state management for all heatmap interactions
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  ViewMode, 
  ZoomLevel, 
  GhostAllocation, 
  UndoAction, 
  SelectedCell,
  HoveredCell,
  HeatmapFilters 
} from '@/types/capacity-heatmap';

interface HeatmapStore {
  // View state
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  patternMode: boolean;
  
  // Selection state
  selectedCells: SelectedCell[];
  hoveredCell: HoveredCell | null;
  
  // Group state
  expandedGroups: Set<string>;
  
  // Time-lapse state
  isTimeLapsePlaying: boolean;
  timeLapseMonth: number;
  timeLapseSpeed: number;
  
  // Scenario state
  scenarioMode: boolean;
  ghostAllocations: GhostAllocation[];
  
  // Undo/Redo state
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  
  // Search/Filter state
  searchQuery: string;
  filters: HeatmapFilters;
  
  // Panel state
  detailPanelOpen: boolean;
  detailPanelResourceId: string | null;
  detailPanelMonth: Date | null;
  keyboardShortcutsOpen: boolean;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  togglePatternMode: () => void;
  
  selectCell: (resourceId: string, month: Date, multiSelect?: boolean) => void;
  clearSelection: () => void;
  setHoveredCell: (cell: HoveredCell | null) => void;
  
  toggleGroupExpanded: (groupId: string) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  
  startTimeLapse: () => void;
  stopTimeLapse: () => void;
  setTimeLapseMonth: (month: number) => void;
  setTimeLapseSpeed: (speed: number) => void;
  
  toggleScenarioMode: () => void;
  addGhostAllocation: (ghost: GhostAllocation) => void;
  removeGhostAllocation: (id: string) => void;
  clearGhostAllocations: () => void;
  
  pushUndo: (action: UndoAction) => void;
  undo: () => UndoAction | undefined;
  redo: () => UndoAction | undefined;
  
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<HeatmapFilters>) => void;
  resetFilters: () => void;
  
  openDetailPanel: (resourceId: string, month: Date) => void;
  closeDetailPanel: () => void;
  toggleKeyboardShortcuts: () => void;
}

const defaultFilters: HeatmapFilters = {
  departments: [],
  utilizationRange: [0, 200],
  showOnlyConflicts: false,
};

export const useHeatmapStore = create<HeatmapStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        viewMode: 'standard',
        zoomLevel: 'department',
        patternMode: false,
        selectedCells: [],
        hoveredCell: null,
        expandedGroups: new Set<string>(),
        isTimeLapsePlaying: false,
        timeLapseMonth: 0,
        timeLapseSpeed: 1000,
        scenarioMode: false,
        ghostAllocations: [],
        undoStack: [],
        redoStack: [],
        searchQuery: '',
        filters: defaultFilters,
        detailPanelOpen: false,
        detailPanelResourceId: null,
        detailPanelMonth: null,
        keyboardShortcutsOpen: false,
        
        // View actions
        setViewMode: (mode) => set({ viewMode: mode }),
        setZoomLevel: (level) => set({ zoomLevel: level }),
        togglePatternMode: () => set((s) => ({ patternMode: !s.patternMode })),
        
        // Selection actions
        selectCell: (resourceId, month, multiSelect = false) => set((state) => {
          if (multiSelect) {
            const exists = state.selectedCells.some(
              c => c.resourceId === resourceId && c.month.getTime() === month.getTime()
            );
            if (exists) {
              return {
                selectedCells: state.selectedCells.filter(
                  c => !(c.resourceId === resourceId && c.month.getTime() === month.getTime())
                )
              };
            }
            return { selectedCells: [...state.selectedCells, { resourceId, month }] };
          }
          return { selectedCells: [{ resourceId, month }] };
        }),
        
        clearSelection: () => set({ selectedCells: [] }),
        setHoveredCell: (cell) => set({ hoveredCell: cell }),
        
        // Group actions
        toggleGroupExpanded: (groupId) => set((state) => {
          const newExpanded = new Set(state.expandedGroups);
          if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
          } else {
            newExpanded.add(groupId);
          }
          return { expandedGroups: newExpanded };
        }),
        
        expandAllGroups: () => set({ expandedGroups: new Set() }),
        collapseAllGroups: () => set({ expandedGroups: new Set(['__all_collapsed__']) }),
        
        // Time-lapse actions
        startTimeLapse: () => set({ isTimeLapsePlaying: true }),
        stopTimeLapse: () => set({ isTimeLapsePlaying: false }),
        setTimeLapseMonth: (month) => set({ timeLapseMonth: month }),
        setTimeLapseSpeed: (speed) => set({ timeLapseSpeed: speed }),
        
        // Scenario actions
        toggleScenarioMode: () => set((s) => ({ 
          scenarioMode: !s.scenarioMode,
          ghostAllocations: !s.scenarioMode ? [] : s.ghostAllocations 
        })),
        addGhostAllocation: (ghost) => set((s) => ({ 
          ghostAllocations: [...s.ghostAllocations, ghost] 
        })),
        removeGhostAllocation: (id) => set((s) => ({ 
          ghostAllocations: s.ghostAllocations.filter(g => g.id !== id) 
        })),
        clearGhostAllocations: () => set({ ghostAllocations: [] }),
        
        // Undo/Redo actions
        pushUndo: (action) => set((s) => ({ 
          undoStack: [...s.undoStack.slice(-49), action],
          redoStack: []
        })),
        undo: () => {
          const state = get();
          if (state.undoStack.length === 0) return undefined;
          const action = state.undoStack[state.undoStack.length - 1];
          set({
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, action]
          });
          return action;
        },
        redo: () => {
          const state = get();
          if (state.redoStack.length === 0) return undefined;
          const action = state.redoStack[state.redoStack.length - 1];
          set({
            redoStack: state.redoStack.slice(0, -1),
            undoStack: [...state.undoStack, action]
          });
          return action;
        },
        
        // Filter actions
        setSearchQuery: (query) => set({ searchQuery: query }),
        setFilters: (filters) => set((s) => ({ 
          filters: { ...s.filters, ...filters } 
        })),
        resetFilters: () => set({ 
          filters: defaultFilters,
          searchQuery: ''
        }),
        
        // Panel actions
        openDetailPanel: (resourceId, month) => set({
          detailPanelOpen: true,
          detailPanelResourceId: resourceId,
          detailPanelMonth: month,
        }),
        closeDetailPanel: () => set({
          detailPanelOpen: false,
          detailPanelResourceId: null,
          detailPanelMonth: null,
        }),
        toggleKeyboardShortcuts: () => set((s) => ({ 
          keyboardShortcutsOpen: !s.keyboardShortcutsOpen 
        })),
      }),
      { 
        name: 'catalyst-heatmap-storage',
        partialize: (state) => ({
          viewMode: state.viewMode,
          zoomLevel: state.zoomLevel,
          patternMode: state.patternMode,
          filters: state.filters,
        }),
      }
    )
  )
);
