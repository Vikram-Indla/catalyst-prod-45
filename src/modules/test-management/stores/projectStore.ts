/**
 * Project Store for Test Management
 * Zustand store for project selection state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TMProject {
  id: string;
  name: string;
  key: string;
  description?: string;
  isActive?: boolean;
}

interface ProjectState {
  // Projects list (will be fetched from API)
  projects: TMProject[];
  setProjects: (projects: TMProject[]) => void;
  
  // Currently selected project
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  
  // Helper to get current project
  getSelectedProject: () => TMProject | null;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Projects
      projects: [],
      setProjects: (projects) => set({ projects }),
      
      // Selected project
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      
      // Get current project helper
      getSelectedProject: () => {
        const { projects, selectedProjectId } = get();
        return projects.find(p => p.id === selectedProjectId) || null;
      },
      
      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'tm-project-storage',
      partialize: (state) => ({
        selectedProjectId: state.selectedProjectId,
      }),
    }
  )
);

// Selectors
export const selectProjects = (state: ProjectState) => state.projects;
export const selectSelectedProjectId = (state: ProjectState) => state.selectedProjectId;
export const selectProjectsLoading = (state: ProjectState) => state.isLoading;
