/**
 * UI Store for Test Management
 * Zustand store for UI state (panels, modals, filters, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Panel/Drawer state
interface PanelState {
  isOpen: boolean;
  activeTab?: string;
  data?: Record<string, unknown>;
}

// Filter state
interface FilterState {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  folder?: string | null;
  search?: string;
  dateRange?: { from?: string; to?: string };
}

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Case Detail Panel
  casePanel: PanelState & { caseId?: string };
  openCasePanel: (caseId: string, tab?: string) => void;
  closeCasePanel: () => void;
  setCasePanelTab: (tab: string) => void;

  // Cycle Detail Panel
  cyclePanel: PanelState & { cycleId?: string };
  openCyclePanel: (cycleId: string, tab?: string) => void;
  closeCyclePanel: () => void;
  setCyclePanelTab: (tab: string) => void;

  // Execution Modal
  executionModal: PanelState & { scopeId?: string; runId?: string };
  openExecutionModal: (scopeId: string, runId?: string) => void;
  closeExecutionModal: () => void;

  // Create Modals
  createCaseModal: PanelState & { folderId?: string; templateId?: string };
  openCreateCaseModal: (folderId?: string, templateId?: string) => void;
  closeCreateCaseModal: () => void;

  createCycleModal: PanelState;
  openCreateCycleModal: () => void;
  closeCreateCycleModal: () => void;

  // Filters
  caseFilters: FilterState;
  setCaseFilters: (filters: Partial<FilterState>) => void;
  clearCaseFilters: () => void;

  cycleFilters: FilterState;
  setCycleFilters: (filters: Partial<FilterState>) => void;
  clearCycleFilters: () => void;

  // View preferences
  caseViewMode: 'list' | 'grid';
  setCaseViewMode: (mode: 'list' | 'grid') => void;

  cycleViewMode: 'list' | 'board';
  setCycleViewMode: (mode: 'list' | 'board') => void;

  // Bulk selection
  selectedCaseIds: string[];
  setSelectedCaseIds: (ids: string[]) => void;
  toggleCaseSelection: (id: string) => void;
  clearCaseSelection: () => void;

  selectedScopeIds: string[];
  setSelectedScopeIds: (ids: string[]) => void;
  toggleScopeSelection: (id: string) => void;
  clearScopeSelection: () => void;

  // Active project context
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

const defaultPanelState: PanelState = { isOpen: false };
const defaultFilterState: FilterState = {};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Case Panel
      casePanel: defaultPanelState,
      openCasePanel: (caseId, tab = 'details') =>
        set({ casePanel: { isOpen: true, caseId, activeTab: tab } }),
      closeCasePanel: () => set({ casePanel: defaultPanelState }),
      setCasePanelTab: (tab) =>
        set((state) => ({ casePanel: { ...state.casePanel, activeTab: tab } })),

      // Cycle Panel
      cyclePanel: defaultPanelState,
      openCyclePanel: (cycleId, tab = 'overview') =>
        set({ cyclePanel: { isOpen: true, cycleId, activeTab: tab } }),
      closeCyclePanel: () => set({ cyclePanel: defaultPanelState }),
      setCyclePanelTab: (tab) =>
        set((state) => ({ cyclePanel: { ...state.cyclePanel, activeTab: tab } })),

      // Execution Modal
      executionModal: defaultPanelState,
      openExecutionModal: (scopeId, runId) =>
        set({ executionModal: { isOpen: true, scopeId, runId } }),
      closeExecutionModal: () => set({ executionModal: defaultPanelState }),

      // Create Case Modal
      createCaseModal: defaultPanelState,
      openCreateCaseModal: (folderId, templateId) =>
        set({ createCaseModal: { isOpen: true, folderId, templateId } }),
      closeCreateCaseModal: () => set({ createCaseModal: defaultPanelState }),

      // Create Cycle Modal
      createCycleModal: defaultPanelState,
      openCreateCycleModal: () => set({ createCycleModal: { isOpen: true } }),
      closeCreateCycleModal: () => set({ createCycleModal: defaultPanelState }),

      // Case Filters
      caseFilters: defaultFilterState,
      setCaseFilters: (filters) =>
        set((state) => ({ caseFilters: { ...state.caseFilters, ...filters } })),
      clearCaseFilters: () => set({ caseFilters: defaultFilterState }),

      // Cycle Filters
      cycleFilters: defaultFilterState,
      setCycleFilters: (filters) =>
        set((state) => ({ cycleFilters: { ...state.cycleFilters, ...filters } })),
      clearCycleFilters: () => set({ cycleFilters: defaultFilterState }),

      // View modes
      caseViewMode: 'list',
      setCaseViewMode: (mode) => set({ caseViewMode: mode }),

      cycleViewMode: 'list',
      setCycleViewMode: (mode) => set({ cycleViewMode: mode }),

      // Bulk selection - Cases
      selectedCaseIds: [],
      setSelectedCaseIds: (ids) => set({ selectedCaseIds: ids }),
      toggleCaseSelection: (id) =>
        set((state) => ({
          selectedCaseIds: state.selectedCaseIds.includes(id)
            ? state.selectedCaseIds.filter((i) => i !== id)
            : [...state.selectedCaseIds, id],
        })),
      clearCaseSelection: () => set({ selectedCaseIds: [] }),

      // Bulk selection - Scope
      selectedScopeIds: [],
      setSelectedScopeIds: (ids) => set({ selectedScopeIds: ids }),
      toggleScopeSelection: (id) =>
        set((state) => ({
          selectedScopeIds: state.selectedScopeIds.includes(id)
            ? state.selectedScopeIds.filter((i) => i !== id)
            : [...state.selectedScopeIds, id],
        })),
      clearScopeSelection: () => set({ selectedScopeIds: [] }),

      // Active project
      activeProjectId: null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    {
      name: 'tm-ui-storage',
      partialize: (state) => ({
        // Only persist preferences, not transient panel state
        sidebarCollapsed: state.sidebarCollapsed,
        caseViewMode: state.caseViewMode,
        cycleViewMode: state.cycleViewMode,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);

// Selectors
export const selectCasePanel = (state: UIState) => state.casePanel;
export const selectCyclePanel = (state: UIState) => state.cyclePanel;
export const selectExecutionModal = (state: UIState) => state.executionModal;
export const selectCaseFilters = (state: UIState) => state.caseFilters;
export const selectCycleFilters = (state: UIState) => state.cycleFilters;
export const selectSelectedCaseIds = (state: UIState) => state.selectedCaseIds;
export const selectActiveProjectId = (state: UIState) => state.activeProjectId;
