import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T10Header } from '../components/landing/T10Header';
import { T10SearchBar } from '../components/landing/T10SearchBar';
import { T10ListCard } from '../components/landing/T10ListCard';
import { T10CreateModal } from '../components/modals/T10CreateModal';
import { T10RenameModal } from '../components/modals/T10RenameModal';
import { T10DeleteModal } from '../components/modals/T10DeleteModal';
import type { T10List, T10Week } from '../types';
import '../styles/task10.css';

const mockLists: T10List[] = [
  { id: '1', key: 'T10-001', name: 'Weekly Team Priorities', status: 'active', created_by: 'user-1', created_by_name: 'Vikram I.', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: '2', key: 'T10-002', name: 'Personal Development', status: 'inactive', created_by: 'user-1', created_by_name: 'Vikram I.', created_at: '2026-01-20T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
];

const mockWeekHistory: T10Week[] = [
  { id: 'w1', list_id: '1', week_start_date: '2026-01-26T00:00:00Z', is_checked_out: true, checked_out_by_name: 'Ibrahim A.', checked_out_at: 'Jan 31, 2026 · 10:45 AM', closed_count: 8, carried_count: 2 },
  { id: 'w2', list_id: '1', week_start_date: '2026-01-19T00:00:00Z', is_checked_out: true, checked_out_by_name: 'Vikram I.', checked_out_at: 'Jan 25, 2026 · 3:20 PM', closed_count: 7, carried_count: 3 },
  { id: 'w3', list_id: '1', week_start_date: '2026-01-12T00:00:00Z', is_checked_out: true, checked_out_by_name: 'Vikram I.', checked_out_at: 'Jan 18, 2026 · 5:00 PM', closed_count: 9, carried_count: 1 },
  { id: 'w4', list_id: '1', week_start_date: '2026-01-05T00:00:00Z', is_checked_out: true, checked_out_by_name: 'Vikram I.', checked_out_at: 'Jan 11, 2026 · 4:30 PM', closed_count: 10, carried_count: 0 },
];

export function T10LandingPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<T10List | null>(null);

  return (
    <div className="t10-module">
      <T10Header onCreateList={() => setCreateModalOpen(true)} userInitials="VI" />
      <div className="t10-container">
        <T10SearchBar onSearch={() => {}} onFilterChange={() => {}} />
        <div className="t10-section-label">Your Lists</div>
        <div className="t10-list-cards">
          {mockLists.map((list) => (
            <T10ListCard
              key={list.id}
              list={list}
              currentWeek={list.status === 'active' ? { id: 'cw', list_id: list.id, week_start_date: '2026-02-02T00:00:00Z', is_checked_out: false } : undefined}
              completedCount={3}
              totalCount={8}
              slotsAvailable={2}
              weekHistory={list.id === '1' ? mockWeekHistory : []}
              onClick={() => navigate(`/taskhub/task10/list/${list.id}`)}
              onRename={() => { setSelectedList(list); setRenameModalOpen(true); }}
              onDelete={() => { setSelectedList(list); setDeleteModalOpen(true); }}
            />
          ))}
        </div>
      </div>
      <T10CreateModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreate={(name) => { console.log('Create:', name); setCreateModalOpen(false); }} />
      {selectedList && (
        <>
          <T10RenameModal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} currentName={selectedList.name} onRename={(name) => { console.log('Rename:', name); setRenameModalOpen(false); }} />
          <T10DeleteModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} listName={selectedList.name} onDelete={() => { console.log('Delete'); setDeleteModalOpen(false); }} />
        </>
      )}
    </div>
  );
}
