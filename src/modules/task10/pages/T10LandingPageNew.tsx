// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: T10LandingPageNew
// Purpose: Linear-inspired minimal landing page
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { T10HeaderNew } from '../components/landing/T10HeaderNew';
import { T10SearchBarNew } from '../components/landing/T10SearchBarNew';
import { T10Tabs, T10TabValue } from '../components/landing/T10Tabs';
import { T10ListsContainerNew } from '../components/landing/T10ListsContainerNew';
import { T10KeyboardShortcuts } from '../components/landing/T10KeyboardShortcuts';
import { T10NewListModal } from '../components/landing/T10NewListModal';
import { T10RenameModal } from '../components/modals/T10RenameModal';
import { T10DeleteModal } from '../components/modals/T10DeleteModal';
import { useT10Lists, useRenameT10List, useDeleteT10List } from '../hooks';
import { useToast } from '@/hooks/use-toast';
import type { T10ListSummary } from '../types';
import '../styles/task10-v2.css';

export function T10LandingPageNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedList, setSelectedList] = useState<T10ListSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<T10TabValue>('all');

  const { data: lists, isLoading } = useT10Lists();
  const renameList = useRenameT10List();
  const deleteList = useDeleteT10List();

  // Filter lists based on tab and search
  const filteredLists = useMemo(() => {
    if (!lists) return [];

    let filtered = lists;

    // Filter by tab
    switch (activeTab) {
      case 'active':
        filtered = filtered.filter(l => l.status === 'active');
        break;
      case 'completed':
        filtered = filtered.filter(l => 
          l.completed_count === l.total_count && l.total_count > 0
        );
        break;
      case 'archived':
        filtered = filtered.filter(l => l.status === 'inactive');
        break;
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        l => l.name.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [lists, activeTab, searchQuery]);

  // Calculate counts
  const counts = useMemo(() => ({
    active: lists?.filter(l => l.status === 'active').length || 0,
    completed: lists?.filter(l => 
      l.completed_count === l.total_count && l.total_count > 0
    ).length || 0,
  }), [lists]);

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

  return (
    <div className="t10-module-v2">
      <div className="t10-landing-v2">
        {/* Header */}
        <T10HeaderNew onNewList={() => setShowNewModal(true)} />

        {/* Search */}
        <T10SearchBarNew onSearch={setSearchQuery} />

        {/* Tabs */}
        <T10Tabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
        />

        {/* Content */}
        <T10ListsContainerNew
          lists={filteredLists}
          isLoading={isLoading}
          onRename={handleRename}
          onDelete={handleDelete}
          onCreateList={() => setShowNewModal(true)}
        />

        {/* Keyboard Shortcuts */}
        <T10KeyboardShortcuts />
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

export default T10LandingPageNew;
