import { create } from 'zustand';

export interface PendingDetailItem {
  id: string;
  projectId?: string;
  projectKey?: string;
  /** Work item type hint — allows CatalystDetailRouter to skip a DB lookup */
  itemType?: string;
}

interface GlobalSearchStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Item pending to be opened in CatalystDetailRouter */
  pendingItem: PendingDetailItem | null;
  openDetail: (item: PendingDetailItem) => void;
  clearDetail: () => void;
}

export const useGlobalSearchStore = create<GlobalSearchStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  pendingItem: null,
  openDetail: (item) => set({ pendingItem: item, isOpen: false }),
  clearDetail: () => set({ pendingItem: null }),
}));
