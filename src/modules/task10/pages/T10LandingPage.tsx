import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T10Header } from '../components/landing/T10Header';
import { T10SearchBar } from '../components/landing/T10SearchBar';
import { T10FilterBar } from '../components/landing/T10FilterBar';
import { T10ListCard } from '../components/landing/T10ListCard';
import { T10CreateModal } from '../components/modals/T10CreateModal';
import { T10RenameModal } from '../components/modals/T10RenameModal';
import { T10DeleteModal } from '../components/modals/T10DeleteModal';
import { useT10Lists, useCreateT10List, useRenameT10List, useDeleteT10List, useT10Filters } from '../hooks';
import type { T10List, T10Week } from '../types';
import { useToast } from '@/hooks/use-toast';
import '../styles/task10.css';

// Fallback mock data for when database is empty or user not authenticated
const mockLists: T10List[] = [
  { id: '1', key: 'T10-001', name: 'Weekly Team Priorities', status: 'active', created_by: 'user-1', created_by_name: 'Vikram I.', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: '2', key: 'T10-002', name: 'Personal Development', status: 'inactive', created_by: 'user-1', created_by_name: 'Vikram I.', created_at: '2026-01-20T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
];

const mockWeekHistory: T10Week[] = [
  { id: 'w1', list_id: '1', week_start: '2026-01-26', week_end: '2026-02-01', status: 'completed', is_current: false, completed_count: 8, total_count: 10, created_at: '2026-01-26T00:00:00Z', updated_at: '2026-01-31T10:45:00Z' },
  { id: 'w2', list_id: '1', week_start: '2026-01-19', week_end: '2026-01-25', status: 'completed', is_current: false, completed_count: 7, total_count: 10, created_at: '2026-01-19T00:00:00Z', updated_at: '2026-01-25T15:20:00Z' },
  { id: 'w3', list_id: '1', week_start: '2026-01-12', week_end: '2026-01-18', status: 'completed', is_current: false, completed_count: 9, total_count: 10, created_at: '2026-01-12T00:00:00Z', updated_at: '2026-01-18T17:00:00Z' },
  { id: 'w4', list_id: '1', week_start: '2026-01-05', week_end: '2026-01-11', status: 'completed', is_current: false, completed_count: 10, total_count: 10, created_at: '2026-01-05T00:00:00Z', updated_at: '2026-01-11T16:30:00Z' },
];

export function T10LandingPage() {
  const navigate = useNavigate();
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
  const { data: dbLists, isLoading } = useT10Lists(filters);
  const createList = useCreateT10List();
  const renameList = useRenameT10List();
  const deleteList = useDeleteT10List();

  // Use database lists if available, otherwise fallback to mock
  const lists = dbLists && dbLists.length > 0 ? dbLists : mockLists;

  // Filter lists by search (additional client-side filter since search is local)
  const filteredLists = lists.filter(list => {
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
        
        <div className="t10-section-label">Your Lists</div>
        {isLoading ? (
          <div className="t10-loading">Loading lists...</div>
        ) : (
          <div className="t10-list-cards">
            {filteredLists.map((list) => (
              <T10ListCard
                key={list.id}
                list={list}
                currentWeek={list.status === 'active' ? { id: 'cw', list_id: list.id, week_start: '2026-02-02', week_end: '2026-02-08', status: 'active' as const, is_current: true, completed_count: 3, total_count: 8, created_at: '2026-02-02T00:00:00Z', updated_at: '2026-02-02T00:00:00Z' } : undefined}
                completedCount={3}
                totalCount={8}
                slotsAvailable={2}
                weekHistory={list.id === '1' ? mockWeekHistory : []}
                onClick={() => navigate(`/taskhub/task10/list/${list.id}`)}
                onRename={() => { setSelectedList(list); setRenameModalOpen(true); }}
                onDelete={() => { setSelectedList(list); setDeleteModalOpen(true); }}
              />
            ))}
            {filteredLists.length === 0 && (
              <div className="t10-empty-state">
                <p>No lists found. Create your first Task¹⁰ list to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
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
