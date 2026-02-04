// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: T10LandingPageV3
// Purpose: Complete landing page with Tabs (This Week / Completed / Archived)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { T10HeaderV3 } from './T10HeaderV3';
import { T10SearchBarV3 } from './T10SearchBarV3';
import { T10FilterBarV3 } from './T10FilterBarV3';
import { T10TabsV3, type T10TabId } from './T10TabsV3';
import { T10ListCardV3 } from './T10ListCardV3';
import { T10CompletedCardV3 } from './T10CompletedCardV3';
import { T10ArchivedCardV3 } from './T10ArchivedCardV3';
import { T10CompletedDetailModal } from './T10CompletedDetailModal';
import { T10NewListModal } from './T10NewListModal';
import { T10RenameModal } from '../modals/T10RenameModal';
import { T10DeleteModal } from '../modals/T10DeleteModal';
import { T10EmptyState } from './T10EmptyState';
import { 
  useT10ListCards, 
  useT10CompletedWeeksView,
  useT10RestoreList,
} from '../../hooks/useTask10ListCards';
import { 
  useRenameT10List, 
  useDeleteT10List,
  useT10CreateWeek,
  getCurrentWeekRange 
} from '../../hooks';
import { useToast } from '@/hooks/use-toast';
import type { T10ListCardView, T10CompletedWeekView } from '../../types/listCards';
import type { T10DateRangePreset, T10ListStatus } from '../../types';
import '../../styles/task10-v2.css';

// Adapter type for delete modal
interface SelectedListForModal {
  id: string;
  name: string;
}

export function T10LandingPageV3() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // UI State
  const [activeTab, setActiveTab] = useState<T10TabId>('this-week');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedList, setSelectedList] = useState<SelectedListForModal | null>(null);
  const [selectedCompletedWeek, setSelectedCompletedWeek] = useState<T10CompletedWeekView | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state - properly typed
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<T10DateRangePreset | null>(null);
  const [selectedDateStart, setSelectedDateStart] = useState<string | null>(null);
  const [selectedDateEnd, setSelectedDateEnd] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<T10ListStatus | 'all'>('all');

  // Data hooks based on active tab
  const { data: activeLists = [], isLoading: listsLoading } = useT10ListCards('active');
  const { data: archivedLists = [], isLoading: archivedLoading } = useT10ListCards('archived');
  const { data: completedWeeks = [], isLoading: completedLoading } = useT10CompletedWeeksView();
  
  // Mutations
  const renameList = useRenameT10List();
  const deleteList = useDeleteT10List();
  const createWeek = useT10CreateWeek();
  const restoreList = useT10RestoreList();

  // Filter active lists based on search and filters
  const filteredActiveLists = useMemo(() => {
    let filtered = activeLists;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        l => l.name.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q)
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter(l => l.status === selectedStatus);
    }

    return filtered;
  }, [activeLists, searchQuery, selectedStatus]);

  // Filter archived lists
  const filteredArchivedLists = useMemo(() => {
    if (!searchQuery) return archivedLists;
    const q = searchQuery.toLowerCase();
    return archivedLists.filter(
      l => l.name.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q)
    );
  }, [archivedLists, searchQuery]);

  // Filter completed weeks
  const filteredCompletedWeeks = useMemo(() => {
    if (!searchQuery) return completedWeeks;
    const q = searchQuery.toLowerCase();
    return completedWeeks.filter(
      w => w.list_name.toLowerCase().includes(q) || w.list_key?.toLowerCase().includes(q)
    );
  }, [completedWeeks, searchQuery]);

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

  const handleRename = (list: T10ListCardView) => {
    setSelectedList({ id: list.id, name: list.name });
    setShowRenameModal(true);
  };

  const handleDelete = (list: T10ListCardView) => {
    setSelectedList({ id: list.id, name: list.name });
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

  const handleRestore = async (list: T10ListCardView) => {
    try {
      await restoreList.mutateAsync(list.id);
      toast({ title: 'List restored', description: `"${list.name}" has been restored.` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to restore list.', variant: 'destructive' });
    }
  };

  const handleStartWeek = async (listId: string) => {
    const range = getCurrentWeekRange();
    console.log('[T10] Starting week for list:', listId, 'range:', range);
    try {
      const newWeek = await createWeek.mutateAsync({
        list_id: listId,
        week_start: range.start,
        week_end: range.end,
        is_current: true,
      });
      console.log('[T10] Week created, navigating to:', `/taskhub/task10/list/${listId}/week/${newWeek.id}`);
      toast({ title: 'Week started', description: 'New week has been created.' });
      // Navigate after toast to ensure UI feedback
      navigate(`/taskhub/task10/list/${listId}/week/${newWeek.id}`);
    } catch (error) {
      console.error('[T10] Failed to start week:', error);
      toast({ title: 'Error', description: 'Failed to start week.', variant: 'destructive' });
    }
  };

  const handleListClick = (list: T10ListCardView) => {
    if (list.current_week_id) {
      navigate(`/taskhub/task10/list/${list.id}/week/${list.current_week_id}`);
    } else {
      navigate(`/taskhub/task10/list/${list.id}`);
    }
  };

  // Get counts for tabs and header
  const completedCount = completedWeeks.length;
  const archivedCount = archivedLists.length;
  const listCount = activeLists.length;
  const activeWeekCount = activeLists.filter(l => l.current_week_id).length;

  // Loading state based on active tab
  const isLoading = 
    activeTab === 'this-week' ? listsLoading :
    activeTab === 'completed' ? completedLoading :
    archivedLoading;

  // Handle showing archived tab
  const handleShowArchived = () => {
    setActiveTab('archived');
  };

  return (
    <div className="t10-module-v2 t10-detail-page">
      <div className="t10-landing-v3">
        {/* Header */}
        <T10HeaderV3 
          onNewList={() => setShowNewModal(true)}
          listCount={listCount}
          activeWeekCount={activeWeekCount}
          onShowArchived={handleShowArchived}
        />

        {/* Search */}
        <T10SearchBarV3 
          value={searchQuery}
          onChange={setSearchQuery} 
        />

        {/* Filter Bar - only show on This Week tab */}
        {activeTab === 'this-week' && (
          <T10FilterBarV3
            selectedLabels={selectedLabels}
            onLabelsChange={setSelectedLabels}
            selectedAssignees={selectedAssignees}
            onAssigneesChange={setSelectedAssignees}
            selectedDateRange={selectedDateRange}
            selectedDateStart={selectedDateStart}
            selectedDateEnd={selectedDateEnd}
            onDateRangeChange={(preset, start, end) => {
              setSelectedDateRange(preset);
              setSelectedDateStart(start || null);
              setSelectedDateEnd(end || null);
            }}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
        )}

        {/* Tabs */}
        <T10TabsV3
          activeTab={activeTab}
          onTabChange={setActiveTab}
          completedCount={completedCount}
          archivedCount={archivedCount}
        />

        {/* Tab Content */}
        <div className="t10-lists-section">
          {/* THIS WEEK TAB */}
          {activeTab === 'this-week' && (
            <>
              <div className="t10-lists-header">
                <span className="t10-lists-label">YOUR LISTS</span>
                <span className="t10-lists-count">{filteredActiveLists.length} lists</span>
              </div>

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
              ) : filteredActiveLists.length === 0 ? (
                <T10EmptyState 
                  onCreateList={() => setShowNewModal(true)}
                />
              ) : (
                <div className="t10-cards-list">
                  {filteredActiveLists.map(list => (
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
            </>
          )}

          {/* COMPLETED TAB */}
          {activeTab === 'completed' && (
            <>
              <div className="t10-lists-header">
                <span className="t10-lists-label">COMPLETED WEEKS</span>
                <span className="t10-lists-count">{filteredCompletedWeeks.length} weeks</span>
              </div>

              {completedLoading ? (
                <div className="t10-cards-list">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="t10-card-skeleton">
                      <div className="t10-skeleton" style={{ height: '60px', width: '100%' }} />
                    </div>
                  ))}
                </div>
              ) : filteredCompletedWeeks.length === 0 ? (
                <div className="t10-empty-tab">
                  <p className="t10-empty-tab__text">No completed weeks yet</p>
                  <p className="t10-empty-tab__hint">Complete a week by checking out all items</p>
                </div>
              ) : (
                <div className="t10-cards-list">
                  {filteredCompletedWeeks.map(week => (
                    <T10CompletedCardV3
                      key={week.week_id}
                      week={week}
                      onClick={() => setSelectedCompletedWeek(week)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ARCHIVED TAB */}
          {activeTab === 'archived' && (
            <>
              <div className="t10-lists-header">
                <span className="t10-lists-label">ARCHIVED LISTS</span>
                <span className="t10-lists-count">{filteredArchivedLists.length} lists</span>
              </div>

              {archivedLoading ? (
                <div className="t10-cards-list">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="t10-card-skeleton">
                      <div className="t10-skeleton" style={{ height: '60px', width: '100%' }} />
                    </div>
                  ))}
                </div>
              ) : filteredArchivedLists.length === 0 ? (
                <div className="t10-empty-tab">
                  <p className="t10-empty-tab__text">No archived lists</p>
                  <p className="t10-empty-tab__hint">Archived lists will appear here</p>
                </div>
              ) : (
                <div className="t10-cards-list">
                  {filteredArchivedLists.map(list => (
                    <T10ArchivedCardV3
                      key={list.id}
                      list={list}
                      onRestore={() => handleRestore(list)}
                      onDelete={() => handleDelete(list)}
                    />
                  ))}
                </div>
              )}
            </>
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

      {/* Completed Week Detail Modal */}
      {selectedCompletedWeek && (
        <T10CompletedDetailModal
          week={selectedCompletedWeek}
          onClose={() => setSelectedCompletedWeek(null)}
        />
      )}
    </div>
  );
}

export default T10LandingPageV3;
