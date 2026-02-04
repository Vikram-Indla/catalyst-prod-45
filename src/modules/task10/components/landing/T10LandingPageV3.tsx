// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: T10LandingPageV3
// Purpose: Complete landing page rebuild with new tab system and filter bar
// Matches reference screenshot design
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { T10HeaderV3 } from './T10HeaderV3';
import { T10SearchBarV3 } from './T10SearchBarV3';
import { T10FilterBarV3 } from './T10FilterBarV3';
import { T10ListCardV3 } from './T10ListCardV3';
import { T10NewListModal } from './T10NewListModal';
import { T10RenameModal } from '../modals/T10RenameModal';
import { T10DeleteModal } from '../modals/T10DeleteModal';
import { T10EmptyState } from './T10EmptyState';
import { 
  useT10Lists, 
  useRenameT10List, 
  useDeleteT10List,
  useT10CreateWeek,
  getCurrentWeekRange 
} from '../../hooks';
import { useToast } from '@/hooks/use-toast';
import type { T10ListSummary } from '../../types';
import '../../styles/task10-v2.css';

export function T10LandingPageV3() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedList, setSelectedList] = useState<T10ListSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { data: lists, isLoading } = useT10Lists();
  const renameList = useRenameT10List();
  const deleteList = useDeleteT10List();
  const createWeek = useT10CreateWeek();

  // Filter lists based on search and filters
  const filteredLists = useMemo(() => {
    if (!lists) return [];

    let filtered = lists;

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        l => l.name.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(l => l.status === selectedStatus);
    }

    return filtered;
  }, [lists, searchQuery, selectedStatus]);

  // Global "C" shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'c' && 
        !e.metaKey && 
        !e.ctrlKey && 
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setShowNewModal(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleListCreated = (listId: string) => {
    navigate(`/taskhub/task10/list/${listId}`);
  };

  const handleRename = (list: T10ListSummary) => {
    setSelectedList(list);
    setShowRenameModal(true);
  };

  const handleDelete = (list: T10ListSummary) => {
    setSelectedList(list);
    setShowDeleteModal(true);
  };

  const handleRenameSubmit = async (name: string) => {
    if (!selectedList) return;
    try {
      await renameList.mutateAsync({ listId: selectedList.id, name });
      toast({ title: 'List renamed', description: `Renamed to "${name}".` });
      setShowRenameModal(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to rename list.', variant: 'destructive' });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedList) return;
    try {
      await deleteList.mutateAsync(selectedList.id);
      toast({ title: 'List deleted', description: `"${selectedList.name}" has been deleted.` });
      setShowDeleteModal(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete list.', variant: 'destructive' });
    }
  };

  const handleStartWeek = async (listId: string) => {
    const range = getCurrentWeekRange();
    try {
      const newWeek = await createWeek.mutateAsync({
        list_id: listId,
        week_start: range.start,
        week_end: range.end,
        is_current: true,
      });
      navigate(`/taskhub/task10/list/${listId}/week/${newWeek.id}`);
      toast({ title: 'Week started', description: 'New week has been created.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to start week.', variant: 'destructive' });
    }
  };

  const handleListClick = (list: T10ListSummary) => {
    if (list.current_week_id) {
      navigate(`/taskhub/task10/list/${list.id}/week/${list.current_week_id}`);
    } else {
      navigate(`/taskhub/task10/list/${list.id}`);
    }
  };

  const hasFiltersApplied = selectedLabels.length > 0 || selectedAssignees.length > 0 || selectedDateRange || selectedStatus;

  return (
    <div className="t10-module-v2">
      <div className="t10-landing-v3">
        {/* Header */}
        <T10HeaderV3 onNewList={() => setShowNewModal(true)} />

        {/* Search */}
        <T10SearchBarV3 
          value={searchQuery}
          onChange={setSearchQuery} 
        />

        {/* Filter Bar */}
        <T10FilterBarV3
          selectedLabels={selectedLabels}
          onLabelsChange={setSelectedLabels}
          selectedAssignees={selectedAssignees}
          onAssigneesChange={setSelectedAssignees}
          selectedDateRange={selectedDateRange}
          onDateRangeChange={setSelectedDateRange}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* List Content */}
        <div className="t10-lists-section">
          {/* Section Header */}
          <div className="t10-lists-header">
            <span className="t10-lists-label">YOUR LISTS</span>
            <span className="t10-lists-count">{filteredLists.length} lists</span>
          </div>

          {/* Lists */}
          {isLoading ? (
            <div className="t10-cards-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="t10-card-skeleton">
                  <div className="t10-skeleton" style={{ height: '20px', width: '80px', marginBottom: '8px' }} />
                  <div className="t10-skeleton" style={{ height: '24px', width: '200px', marginBottom: '16px' }} />
                  <div className="t10-skeleton" style={{ height: '60px', width: '100%' }} />
                </div>
              ))}
            </div>
          ) : filteredLists.length === 0 ? (
            <T10EmptyState 
              onCreateList={() => setShowNewModal(true)}
            />
          ) : (
            <div className="t10-cards-list">
              {filteredLists.map(list => (
                <T10ListCardV3
                  key={list.id}
                  list={list}
                  onCardClick={() => handleListClick(list)}
                  onStartWeek={() => handleStartWeek(list.id)}
                  onRename={() => handleRename(list)}
                  onDelete={() => handleDelete(list)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <T10NewListModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleListCreated}
      />
      
      {selectedList && (
        <>
          <T10RenameModal
            isOpen={showRenameModal}
            onClose={() => setShowRenameModal(false)}
            currentName={selectedList.name}
            onRename={handleRenameSubmit}
          />
          <T10DeleteModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            listName={selectedList.name}
            onDelete={handleDeleteSubmit}
          />
        </>
      )}
    </div>
  );
}

export default T10LandingPageV3;
