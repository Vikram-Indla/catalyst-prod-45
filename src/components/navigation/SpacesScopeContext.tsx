/**
 * Spaces Scope Context
 * Manages current scope state (Enterprise, Program, Project) with persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ScopeLevel = 'enterprise' | 'program' | 'project';

export interface ScopeEntity {
  id: string;
  name: string;
  key?: string;
}

interface SpacesScopeState {
  currentScope: ScopeLevel;
  enterprise: ScopeEntity | null;
  program: ScopeEntity | null;
  project: ScopeEntity | null;
}

interface SpacesScopeContextValue extends SpacesScopeState {
  setScope: (scope: ScopeLevel) => void;
  setEnterprise: (entity: ScopeEntity | null) => void;
  setProgram: (entity: ScopeEntity | null) => void;
  setProject: (entity: ScopeEntity | null) => void;
  clearScope: () => void;
  getScopeLabel: () => string;
  getScopeColor: () => string;
}

const STORAGE_KEY = 'catalyst-spaces-scope';

const defaultState: SpacesScopeState = {
  currentScope: 'enterprise',
  enterprise: { id: 'default', name: 'Ministry of Industry' },
  program: null,
  project: null,
};

const SpacesScopeContext = createContext<SpacesScopeContextValue | null>(null);

export function SpacesScopeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpacesScopeState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse spaces scope from localStorage:', e);
    }
    return defaultState;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setScope = (scope: ScopeLevel) => {
    setState(prev => ({ ...prev, currentScope: scope }));
  };

  const setEnterprise = (entity: ScopeEntity | null) => {
    setState(prev => ({ ...prev, enterprise: entity }));
  };

  const setProgram = (entity: ScopeEntity | null) => {
    setState(prev => ({ ...prev, program: entity, currentScope: entity ? 'program' : prev.currentScope }));
  };

  const setProject = (entity: ScopeEntity | null) => {
    setState(prev => ({ ...prev, project: entity, currentScope: entity ? 'project' : prev.currentScope }));
  };

  const clearScope = () => {
    setState(prev => {
      if (prev.currentScope === 'project') {
        return { ...prev, project: null, currentScope: 'program' };
      }
      if (prev.currentScope === 'program') {
        return { ...prev, program: null, currentScope: 'enterprise' };
      }
      return prev;
    });
  };

  const getScopeLabel = (): string => {
    switch (state.currentScope) {
      case 'project':
        return state.project?.name || 'Project';
      case 'program':
        return state.program?.name || 'Program';
      case 'enterprise':
        return state.enterprise?.name || 'Enterprise';
      default:
        return 'Unknown';
    }
  };

  const getScopeColor = (): string => {
    switch (state.currentScope) {
      case 'enterprise':
        return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-700';
      case 'program':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      case 'project':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <SpacesScopeContext.Provider value={{
      ...state,
      setScope,
      setEnterprise,
      setProgram,
      setProject,
      clearScope,
      getScopeLabel,
      getScopeColor,
    }}>
      {children}
    </SpacesScopeContext.Provider>
  );
}

export function useSpacesScope() {
  const context = useContext(SpacesScopeContext);
  if (!context) {
    throw new Error('useSpacesScope must be used within a SpacesScopeProvider');
  }
  return context;
}
