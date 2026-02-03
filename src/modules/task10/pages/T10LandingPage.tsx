// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10LandingPage
// Purpose: Main landing page container for Task¹⁰ module
// Updated per Prompt 5: Uses T10ListsContainer with database-wired components
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { T10Header } from '../components/landing/T10Header';
import { T10SearchBar } from '../components/landing/T10SearchBar';
import { T10FilterBar } from '../components/landing/T10FilterBar';
import { T10ListsContainer } from '../components/landing/T10ListsContainer';
import { T10CreateModal } from '../components/modals/T10CreateModal';
import { T10RenameModal } from '../components/modals/T10RenameModal';
import { T10DeleteModal } from '../components/modals/T10DeleteModal';
import { 
  useT10Lists, 
  useCreateT10List, 
  useRenameT10List, 
  useDeleteT10List, 
  useT10Filters 
} from '../hooks';
import type { T10List } from '../types';
import { useToast } from '@/hooks/use-toast';
import '../styles/task10.css';

export function T10LandingPage() {
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<T10List | null>(null);

  // Filter state management hook
  const {
    filters,
    setSearch,
    setLabels,
    setAssignees,
    setDateRange,
    setStatus,
    resetFilters,
    hasActiveFilters,
  } = useT10Filters();

  // Database hooks
  const { data: lists, isLoading } = useT10Lists(filters);
  const createList = useCreateT10List();
  const renameList = useRenameT10List();
  const deleteList = useDeleteT10List();

  // Filter lists by search (additional client-side filter)
  const filteredLists = (lists || []).filter(list => {
    const matchesSearch = !filters.search || list.name.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  const handleCreate = async (name: string) => {
    try {
      await createList.mutateAsync({ name });
      toast({ title: "List created", description: `"${name}" has been created.` });
      setCreateModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create list. Please log in.", variant: "destructive" });
    }
  };

  const handleRename = async (name: string) => {
    if (!selectedList) return;
    try {
      await renameList.mutateAsync({ listId: selectedList.id, name });
      toast({ title: "List renamed", description: `Renamed to "${name}".` });
      setRenameModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to rename list.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedList) return;
    try {
      await deleteList.mutateAsync(selectedList.id);
      toast({ title: "List deleted", description: `"${selectedList.name}" has been deleted.` });
      setDeleteModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete list.", variant: "destructive" });
    }
  };

  const handleRenameClick = (list: T10List) => {
    setSelectedList(list);
    setRenameModalOpen(true);
  };

  const handleDeleteClick = (list: T10List) => {
    setSelectedList(list);
    setDeleteModalOpen(true);
  };

  return (
    <div className="t10-module">
      <T10Header onCreateList={() => setCreateModalOpen(true)} userInitials="VI" />
      <div className="t10-container">
        <T10SearchBar onSearch={setSearch} />
        
        {/* Filter Bar */}
        <T10FilterBar
          filters={filters}
          onLabelChange={setLabels}
          onAssigneeChange={setAssignees}
          onDateRangeChange={setDateRange}
          onStatusChange={setStatus}
          onClearAll={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
        
        {/* Lists Container with week history (CRITICAL) */}
        <T10ListsContainer
          lists={filteredLists}
          isLoading={isLoading}
          onRename={handleRenameClick}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Modals */}
      <T10CreateModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onCreate={handleCreate} 
      />
      {selectedList && (
        <>
          <T10RenameModal 
            isOpen={renameModalOpen} 
            onClose={() => setRenameModalOpen(false)} 
            currentName={selectedList.name} 
            onRename={handleRename} 
          />
          <T10DeleteModal 
            isOpen={deleteModalOpen} 
            onClose={() => setDeleteModalOpen(false)} 
            listName={selectedList.name} 
            onDelete={handleDelete} 
          />
        </>
      )}
    </div>
  );
}

export default T10LandingPage;
