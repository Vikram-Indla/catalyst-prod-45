import { create } from 'zustand';

interface AddPeopleModalState {
  isOpen: boolean;
  projectId: string | null;
  projectName: string;
  open: (payload: { projectId: string; projectName: string }) => void;
  close: () => void;
}

/**
 * Tiny store for the Add People modal. Lives outside BacklogPage so
 * toggling open/close does NOT re-render the 5K-line backlog tree.
 * The trigger button only calls `open(...)`; the modal subscribes
 * independently and mounts at the page root.
 */
export const useAddPeopleModalStore = create<AddPeopleModalState>((set) => ({
  isOpen: false,
  projectId: null,
  projectName: '',
  open: ({ projectId, projectName }) =>
    set({ isOpen: true, projectId, projectName }),
  close: () => set({ isOpen: false }),
}));
