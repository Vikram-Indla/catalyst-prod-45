// ════════════════════════════════════════════════════════════════════════════
// SPACE UI STATE STORE (ZUSTAND)
// ════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SpaceViewMode,
  SettingsTab,
  SpaceFilters,
  SpaceSort,
} from '@/types/spaces';

interface SpaceUIState {
  // View state
  viewMode: SpaceViewMode;
  setViewMode: (mode: SpaceViewMode) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Selected space
  selectedSpaceId: string | null;
  setSelectedSpaceId: (id: string | null) => void;

  // Settings tab
  activeSettingsTab: SettingsTab;
  setActiveSettingsTab: (tab: SettingsTab) => void;

  // Filters & Sort
  filters: SpaceFilters;
  setFilters: (filters: SpaceFilters) => void;
  updateFilter: <K extends keyof SpaceFilters>(key: K, value: SpaceFilters[K]) => void;
  clearFilters: () => void;

  sort: SpaceSort;
  setSort: (sort: SpaceSort) => void;

  // Modals
  isCreateModalOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;

  isDeleteModalOpen: boolean;
  deleteTargetId: string | null;
  openDeleteModal: (id: string) => void;
  closeDeleteModal: () => void;

  isArchiveModalOpen: boolean;
  archiveTargetId: string | null;
  openArchiveModal: (id: string) => void;
  closeArchiveModal: () => void;

  isAddMemberModalOpen: boolean;
  openAddMemberModal: () => void;
  closeAddMemberModal: () => void;

  isCreateComponentModalOpen: boolean;
  openCreateComponentModal: () => void;
  closeCreateComponentModal: () => void;

  isCreateVersionModalOpen: boolean;
  openCreateVersionModal: () => void;
  closeCreateVersionModal: () => void;

  // Edit modals
  editComponentId: string | null;
  openEditComponentModal: (id: string) => void;
  closeEditComponentModal: () => void;

  editVersionId: string | null;
  openEditVersionModal: (id: string) => void;
  closeEditVersionModal: () => void;

  editMemberId: string | null;
  openEditMemberModal: (id: string) => void;
  closeEditMemberModal: () => void;
}

const defaultFilters: SpaceFilters = {};
const defaultSort: SpaceSort = { field: 'name', direction: 'asc' };

export const useSpaceStore = create<SpaceUIState>()(
  persist(
    (set) => ({
      // View state
      viewMode: 'grid',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Selected space
      selectedSpaceId: null,
      setSelectedSpaceId: (id) => set({ selectedSpaceId: id }),

      // Settings tab
      activeSettingsTab: 'details',
      setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),

      // Filters
      filters: defaultFilters,
      setFilters: (filters) => set({ filters }),
      updateFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      clearFilters: () => set({ filters: defaultFilters }),

      // Sort
      sort: defaultSort,
      setSort: (sort) => set({ sort }),

      // Create Modal
      isCreateModalOpen: false,
      openCreateModal: () => set({ isCreateModalOpen: true }),
      closeCreateModal: () => set({ isCreateModalOpen: false }),

      // Delete Modal
      isDeleteModalOpen: false,
      deleteTargetId: null,
      openDeleteModal: (id) => set({ isDeleteModalOpen: true, deleteTargetId: id }),
      closeDeleteModal: () => set({ isDeleteModalOpen: false, deleteTargetId: null }),

      // Archive Modal
      isArchiveModalOpen: false,
      archiveTargetId: null,
      openArchiveModal: (id) => set({ isArchiveModalOpen: true, archiveTargetId: id }),
      closeArchiveModal: () => set({ isArchiveModalOpen: false, archiveTargetId: null }),

      // Add Member Modal
      isAddMemberModalOpen: false,
      openAddMemberModal: () => set({ isAddMemberModalOpen: true }),
      closeAddMemberModal: () => set({ isAddMemberModalOpen: false }),

      // Create Component Modal
      isCreateComponentModalOpen: false,
      openCreateComponentModal: () => set({ isCreateComponentModalOpen: true }),
      closeCreateComponentModal: () => set({ isCreateComponentModalOpen: false }),

      // Create Version Modal
      isCreateVersionModalOpen: false,
      openCreateVersionModal: () => set({ isCreateVersionModalOpen: true }),
      closeCreateVersionModal: () => set({ isCreateVersionModalOpen: false }),

      // Edit Component Modal
      editComponentId: null,
      openEditComponentModal: (id) => set({ editComponentId: id }),
      closeEditComponentModal: () => set({ editComponentId: null }),

      // Edit Version Modal
      editVersionId: null,
      openEditVersionModal: (id) => set({ editVersionId: id }),
      closeEditVersionModal: () => set({ editVersionId: null }),

      // Edit Member Modal
      editMemberId: null,
      openEditMemberModal: (id) => set({ editMemberId: id }),
      closeEditMemberModal: () => set({ editMemberId: null }),
    }),
    {
      name: 'catalyst-space-ui',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sidebarCollapsed: state.sidebarCollapsed,
        sort: state.sort,
      }),
    }
  )
);
