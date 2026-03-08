import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BoardStoreState {
  // Swimlane collapse state
  collapsedSwimlanes: Record<string, boolean>;
  toggleSwimlane: (id: string) => void;
  expandAll: () => void;
  collapseAll: (ids: string[]) => void;

  // Card selection
  selectedCardIds: string[];
  toggleCardSelection: (id: string) => void;
  selectCard: (id: string) => void;
  deselectCard: (id: string) => void;
  clearSelection: () => void;

  // Drag state
  draggingCardId: string | null;
  setDraggingCardId: (id: string | null) => void;

  // Quick filter
  activeQuickFilter: string;
  setActiveQuickFilter: (f: string) => void;
}

export const useBoardStore = create<BoardStoreState>()(
  persist(
    (set) => ({
      // Swimlanes
      collapsedSwimlanes: {},
      toggleSwimlane: (id) =>
        set((s) => ({
          collapsedSwimlanes: {
            ...s.collapsedSwimlanes,
            [id]: !s.collapsedSwimlanes[id],
          },
        })),
      expandAll: () => set({ collapsedSwimlanes: {} }),
      collapseAll: (ids) =>
        set({
          collapsedSwimlanes: Object.fromEntries(ids.map((id) => [id, true])),
        }),

      // Card selection
      selectedCardIds: [],
      toggleCardSelection: (id) =>
        set((s) => ({
          selectedCardIds: s.selectedCardIds.includes(id)
            ? s.selectedCardIds.filter((c) => c !== id)
            : [...s.selectedCardIds, id],
        })),
      selectCard: (id) =>
        set((s) => ({
          selectedCardIds: s.selectedCardIds.includes(id)
            ? s.selectedCardIds
            : [...s.selectedCardIds, id],
        })),
      deselectCard: (id) =>
        set((s) => ({
          selectedCardIds: s.selectedCardIds.filter((c) => c !== id),
        })),
      clearSelection: () => set({ selectedCardIds: [] }),

      // Drag
      draggingCardId: null,
      setDraggingCardId: (id) => set({ draggingCardId: id }),

      // Quick filter
      activeQuickFilter: 'all',
      setActiveQuickFilter: (f) => set({ activeQuickFilter: f }),
    }),
    {
      name: 'catalyst-board-store',
      partialize: (s) => ({
        collapsedSwimlanes: s.collapsedSwimlanes,
        activeQuickFilter: s.activeQuickFilter,
      }),
    }
  )
);
