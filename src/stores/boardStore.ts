import { create } from 'zustand';

interface BoardStoreState {
  collapsedSwimlanes: Record<string, boolean>;
  selectedCardIds: string[];
  toggleSwimlane: (id: string) => void;
  selectCard: (id: string) => void;
  deselectCard: (id: string) => void;
  clearSelection: () => void;
  toggleCardSelection: (id: string) => void;
}

export const useBoardStore = create<BoardStoreState>((set) => ({
  collapsedSwimlanes: {},
  selectedCardIds: [],
  toggleSwimlane: (id) =>
    set((s) => ({
      collapsedSwimlanes: { ...s.collapsedSwimlanes, [id]: !s.collapsedSwimlanes[id] },
    })),
  selectCard: (id) =>
    set((s) => ({
      selectedCardIds: s.selectedCardIds.includes(id) ? s.selectedCardIds : [...s.selectedCardIds, id],
    })),
  deselectCard: (id) =>
    set((s) => ({
      selectedCardIds: s.selectedCardIds.filter((c) => c !== id),
    })),
  clearSelection: () => set({ selectedCardIds: [] }),
  toggleCardSelection: (id) =>
    set((s) => ({
      selectedCardIds: s.selectedCardIds.includes(id)
        ? s.selectedCardIds.filter((c) => c !== id)
        : [...s.selectedCardIds, id],
    })),
}));
