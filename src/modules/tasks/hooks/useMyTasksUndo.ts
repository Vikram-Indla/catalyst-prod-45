// ============================================================
// MY TASKS UNDO STORE - Zustand-based undo stack
// Planner V9: Completion undo functionality
// ============================================================

import { create } from 'zustand';

export interface UndoAction {
  type: 'complete' | 'delete' | 'update';
  taskId: string;
  taskTitle: string;
  originalSection: 'overdue' | 'today' | 'this_week' | 'upcoming' | 'someday';
  previousData?: Record<string, unknown>;
  timestamp: number;
}

interface UndoStore {
  stack: UndoAction[];
  pushUndo: (action: UndoAction) => void;
  popUndo: () => UndoAction | undefined;
  peekUndo: () => UndoAction | undefined;
  clearExpired: () => void;
  clearAll: () => void;
}

const UNDO_EXPIRY_MS = 30000; // 30 seconds

export const useMyTasksUndo = create<UndoStore>((set, get) => ({
  stack: [],

  pushUndo: (action) => {
    set((state) => ({
      stack: [...state.stack.slice(-9), action], // Keep last 10
    }));
  },

  popUndo: () => {
    const { stack } = get();
    if (stack.length === 0) return undefined;

    const action = stack[stack.length - 1];
    set((state) => ({
      stack: state.stack.slice(0, -1),
    }));

    return action;
  },

  peekUndo: () => {
    const { stack } = get();
    return stack.length > 0 ? stack[stack.length - 1] : undefined;
  },

  clearExpired: () => {
    const now = Date.now();
    set((state) => ({
      stack: state.stack.filter(
        (action) => now - action.timestamp < UNDO_EXPIRY_MS
      ),
    }));
  },

  clearAll: () => {
    set({ stack: [] });
  },
}));
