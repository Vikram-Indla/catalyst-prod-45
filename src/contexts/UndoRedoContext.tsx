/**
 * Prompt 9: Undo/Redo Context
 * Safety net for drag operations, bulk changes, and deletions
 */

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

export interface UndoAction {
  id: string;
  type: string;
  timestamp: Date;
  description: string;
  data: any;
}

interface UndoRedoState {
  past: UndoAction[];
  future: UndoAction[];
  maxHistory: number;
}

type UndoRedoDispatch =
  | { type: 'ADD_ACTION'; action: UndoAction }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' };

const initialState: UndoRedoState = { past: [], future: [], maxHistory: 50 };

function undoRedoReducer(state: UndoRedoState, action: UndoRedoDispatch): UndoRedoState {
  switch (action.type) {
    case 'ADD_ACTION':
      return {
        ...state,
        past: [...state.past.slice(-state.maxHistory + 1), action.action],
        future: [], // Clear future on new action
      };
    case 'UNDO':
      if (state.past.length === 0) return state;
      const previousAction = state.past[state.past.length - 1];
      return {
        ...state,
        past: state.past.slice(0, -1),
        future: [previousAction, ...state.future],
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      const nextAction = state.future[0];
      return {
        ...state,
        past: [...state.past, nextAction],
        future: state.future.slice(1),
      };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

interface UndoRedoContextValue {
  canUndo: boolean;
  canRedo: boolean;
  past: UndoAction[];
  future: UndoAction[];
  addAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  undo: () => UndoAction | undefined;
  redo: () => UndoAction | undefined;
  clear: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextValue | null>(null);

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(undoRedoReducer, initialState);

  const addAction = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>) => {
    const fullAction: UndoAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_ACTION', action: fullAction });
  }, []);

  const undo = useCallback(() => {
    if (state.past.length === 0) return undefined;
    const action = state.past[state.past.length - 1];
    dispatch({ type: 'UNDO' });
    return action;
  }, [state.past]);

  const redo = useCallback(() => {
    if (state.future.length === 0) return undefined;
    const action = state.future[0];
    dispatch({ type: 'REDO' });
    return action;
  }, [state.future]);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const value: UndoRedoContextValue = {
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    past: state.past,
    future: state.future,
    addAction,
    undo,
    redo,
    clear,
  };

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedo() {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within UndoRedoProvider');
  }
  return context;
}
