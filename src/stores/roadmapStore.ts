import { create } from 'zustand';
import { addDays, format } from 'date-fns';

export interface PendingChange {
  id: string;
  itemId: string;
  itemTitle: string;
  changeType: 'start_date' | 'due_date' | 'both';
  originalStart: Date;
  originalEnd: Date;
  newStart: Date;
  newEnd: Date;
  timestamp: Date;
}

export interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'resize-left' | 'resize-right' | null;
  itemId: string | null;
  originalStart: Date | null;
  originalEnd: Date | null;
  currentStart: Date | null;
  currentEnd: Date | null;
  startX: number;
}

interface HistoryState {
  past: PendingChange[][];
  present: PendingChange[];
  future: PendingChange[][];
}

interface RoadmapStore {
  // PI Selection
  selectedPIs: string[];
  setSelectedPIs: (pis: string[]) => void;
  togglePI: (piId: string) => void;
  clearSelectedPIs: () => void;
  
  // Pending Changes
  pendingChanges: PendingChange[];
  addPendingChange: (change: Omit<PendingChange, 'id' | 'timestamp'>) => void;
  clearPendingChanges: () => void;
  removePendingChange: (id: string) => void;
  
  // Drag State
  dragState: DragState;
  setDragState: (state: Partial<DragState>) => void;
  resetDragState: () => void;
  
  // History (Undo/Redo)
  history: HistoryState;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Sync Modal
  isSyncModalOpen: boolean;
  openSyncModal: () => void;
  closeSyncModal: () => void;
  
  // Apply changes to items
  applyPendingChanges: () => void;
}

const initialDragState: DragState = {
  isDragging: false,
  dragType: null,
  itemId: null,
  originalStart: null,
  originalEnd: null,
  currentStart: null,
  currentEnd: null,
  startX: 0,
};

export const useRoadmapStore = create<RoadmapStore>((set, get) => ({
  // PI Selection
  selectedPIs: [],
  setSelectedPIs: (pis) => set({ selectedPIs: pis }),
  togglePI: (piId) => set((state) => ({
    selectedPIs: state.selectedPIs.includes(piId)
      ? state.selectedPIs.filter(id => id !== piId)
      : [...state.selectedPIs, piId]
  })),
  clearSelectedPIs: () => set({ selectedPIs: [] }),
  
  // Pending Changes
  pendingChanges: [],
  addPendingChange: (change) => {
    const newChange: PendingChange = {
      ...change,
      id: `change-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    
    set((state) => {
      const newPending = [...state.pendingChanges, newChange];
      return {
        pendingChanges: newPending,
        history: {
          past: [...state.history.past, state.history.present],
          present: newPending,
          future: [],
        },
      };
    });
  },
  clearPendingChanges: () => set({ pendingChanges: [] }),
  removePendingChange: (id) => set((state) => ({
    pendingChanges: state.pendingChanges.filter(c => c.id !== id)
  })),
  
  // Drag State
  dragState: initialDragState,
  setDragState: (partialState) => set((state) => ({
    dragState: { ...state.dragState, ...partialState }
  })),
  resetDragState: () => set({ dragState: initialDragState }),
  
  // History
  history: {
    past: [],
    present: [],
    future: [],
  },
  
  undo: () => {
    const { history } = get();
    if (history.past.length === 0) return;
    
    const newPast = history.past.slice(0, -1);
    const previousState = history.past[history.past.length - 1];
    
    set({
      pendingChanges: previousState,
      history: {
        past: newPast,
        present: previousState,
        future: [history.present, ...history.future],
      },
    });
  },
  
  redo: () => {
    const { history } = get();
    if (history.future.length === 0) return;
    
    const nextState = history.future[0];
    const newFuture = history.future.slice(1);
    
    set({
      pendingChanges: nextState,
      history: {
        past: [...history.past, history.present],
        present: nextState,
        future: newFuture,
      },
    });
  },
  
  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
  
  // Sync Modal
  isSyncModalOpen: false,
  openSyncModal: () => set({ isSyncModalOpen: true }),
  closeSyncModal: () => set({ isSyncModalOpen: false }),
  
  // Apply changes
  applyPendingChanges: () => {
    // This would typically make an API call to sync changes
    console.log('Applying pending changes:', get().pendingChanges);
    set({ pendingChanges: [], isSyncModalOpen: false });
  },
}));
