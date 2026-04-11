/**
 * In-Jira Context
 * Provides shared state for the In-Jira module
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Issue, CreateIssueData } from '../types';

interface InJiraContextState {
  // Issue drawer state
  selectedIssue: Issue | null;
  isDrawerOpen: boolean;
  openIssueDrawer: (issue: Issue) => void;
  closeIssueDrawer: () => void;
  
  // Create modal state
  isCreateModalOpen: boolean;
  createModalDefaults: Partial<CreateIssueData> | null;
  openCreateModal: (defaults?: Partial<CreateIssueData>) => void;
  closeCreateModal: () => void;
  
  // Search and filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Active quick filters
  activeFilters: string[];
  toggleFilter: (filterId: string) => void;
  clearFilters: () => void;
}

const InJiraContext = createContext<InJiraContextState | undefined>(undefined);

interface InJiraProviderProps {
  children: ReactNode;
}

export function InJiraProvider({ children }: InJiraProviderProps) {
  // Issue drawer state
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDefaults, setCreateModalDefaults] = useState<Partial<CreateIssueData> | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const openIssueDrawer = useCallback((issue: Issue) => {
    setSelectedIssue(issue);
    setIsDrawerOpen(true);
  }, []);

  const closeIssueDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing issue to allow animation
    setTimeout(() => setSelectedIssue(null), 300);
  }, []);

  const openCreateModal = useCallback((defaults?: Partial<CreateIssueData>) => {
    setCreateModalDefaults(defaults || null);
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateModalDefaults(null);
  }, []);

  const toggleFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  const value = useMemo(() => ({
    selectedIssue,
    isDrawerOpen,
    openIssueDrawer,
    closeIssueDrawer,
    isCreateModalOpen,
    createModalDefaults,
    openCreateModal,
    closeCreateModal,
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    clearFilters,
  }), [selectedIssue, isDrawerOpen, openIssueDrawer, closeIssueDrawer, isCreateModalOpen, createModalDefaults, openCreateModal, closeCreateModal, searchQuery, activeFilters, toggleFilter, clearFilters]);

  return (
    <InJiraContext.Provider value={value}>
      {children}
    </InJiraContext.Provider>
  );
}

export function useInJira() {
  const context = useContext(InJiraContext);
  if (!context) {
    throw new Error('useInJira must be used within an InJiraProvider');
  }
  return context;
}
