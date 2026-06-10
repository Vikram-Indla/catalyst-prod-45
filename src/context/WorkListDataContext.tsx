/**
 * WorkListDataContext — Data context for work list (F1.23)
 *
 * Provides work items, loading states, and create mutation to descendants.
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkItems } from '@/hooks/useWorkItems';
import { useCreateWorkItem, type CreateWorkItemInput } from '@/hooks/useCreateWorkItem';
import type { WorkItem } from '@/hooks/useWorkItems';

interface WorkListDataContextType {
  items: WorkItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  create: (input: CreateWorkItemInput) => void;
  isCreating: boolean;
  createError: Error | null;
}

const WorkListDataContext = createContext<WorkListDataContextType | undefined>(undefined);

export interface WorkListDataProviderProps {
  children: ReactNode;
}

export function WorkListDataProvider({ children }: WorkListDataProviderProps) {
  const {
    items,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkItems({ enabled: true });

  const {
    mutate,
    isPending: isCreating,
    error: createError,
  } = useCreateWorkItem();

  const value: WorkListDataContextType = {
    items,
    isLoading,
    isError,
    error,
    refetch,
    create: mutate,
    isCreating,
    createError: createError as Error | null,
  };

  return (
    <WorkListDataContext.Provider value={value}>
      {children}
    </WorkListDataContext.Provider>
  );
}

export function useWorkListData(): WorkListDataContextType {
  const context = useContext(WorkListDataContext);
  if (!context) {
    throw new Error('useWorkListData must be used within WorkListDataProvider');
  }
  return context;
}
