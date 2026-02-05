// ═══════════════════════════════════════════════════════════════════════════════
// TASK10 LANDING PAGE — OPTION 1: CLEAN CARDS WITH DEPTH
// Uses Tailwind classes directly for styling
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  MoreVertical,
  ChevronDown,
  RotateCcw,
  Trash2,
  X,
  Calendar,
  Pencil,
  Archive
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { T10NewListModal } from './T10NewListModal';
import { T10RenameModal } from '../modals/T10RenameModal';
import { T10DeleteModal } from '../modals/T10DeleteModal';
import { T10ArchiveModal } from '../modals/T10ArchiveModal';
import { 
  useT10ListCards, 
  useT10CompletedWeeksView,
  useT10ArchiveList,
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
import { useT10Filters, getDateRangeFromPreset } from '../../hooks/useT10Filters';
import {
  T10LabelFilter,
  T10AssigneeFilter,
  T10DateRangeFilter,
  T10StatusFilter,
} from '../filters';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileMenuDrawer } from '@/components/layout/MobileMenuDrawer';

// ═══════════════════════════════════════════════════════════════════════════════
// LIST CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function ListCard({ 
  list, 
  onClick,
  onStartWeek,
  onMore
}: { 
  list: T10ListCardView; 
  onClick: () => void;
  onStartWeek: () => void;
  onMore: (e: React.MouseEvent) => void;
}) {
  const formatWeekRange = (weekStart: string | null, weekEnd: string | null) => {
    if (!weekStart || !weekEnd) return 'Current Week';
    try {
      const start = parseISO(weekStart);
      const end = parseISO(weekEnd);
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    } catch {
      return 'Current Week';
    }
  };

  const getProgressPercent = () => {
    if (list.total_count === 0) return 0;
    return Math.round((list.completed_count / list.total_count) * 100);
  };

  const getSlotsAvailable = () => {
    return list.slots_available;
  };

  const hasActiveWeek = !!list.current_week_id;

  return (
    <div
      onClick={onClick}
      className="flex items-center p-5 bg-white border border-slate-200 rounded-[14px] cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
    >
      {/* LEFT SIDE */}
      <div className="flex-1 min-w-0">
        {/* Header: Key + Title */}
        <div className="flex items-center gap-3.5 mb-2.5">
          <span className="px-3 py-1.5 font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-md tracking-wide flex-shrink-0">
            {list.key || 'T10'}
          </span>
          <span className="text-[17px] font-semibold text-slate-900 tracking-tight truncate">
            {list.name}
          </span>
        </div>

        {/* Meta: Week + Created */}
        <div className="flex items-center gap-5 text-[13px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {hasActiveWeek ? (
              <>
                Week of{' '}
                <strong className="text-slate-900 font-semibold">
                  {formatWeekRange(list.week_start, list.week_end)}
                </strong>
              </>
            ) : (
              <span className="text-slate-400">No active week</span>
            )}
          </span>
          <span className="text-slate-400">
            Created {format(parseISO(list.created_at), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6 ml-6 flex-shrink-0">
        {/* Progress or Start Week */}
        {hasActiveWeek ? (
          <div className="text-right">
            {/* Progress Bar */}
            {list.total_count === 0 ? (
              <div className="w-[140px] h-1.5 rounded-full mb-2" style={{ background: '#e2e8f0' }} />
            ) : (
              <div className="w-[140px] h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: '#e2e8f0' }}>
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercent()}%` }}
                />
              </div>
            )}
            {/* Progress Text */}
            <div className="text-[13px] font-medium text-slate-500">
              {list.total_count === 0 ? (
                <span className="text-slate-400">No items yet</span>
              ) : (
                <>
                  <strong className="text-blue-600 font-bold">
                    {list.completed_count}
                  </strong>
                  {' '}of {list.total_count} completed
                </>
              )}
              {getSlotsAvailable() > 0 && (
                <span className="text-emerald-600 font-semibold">
                  {' '}· {getSlotsAvailable()} slots
                </span>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartWeek();
            }}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Start Week
          </button>
        )}

        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md ${
            list.status === 'active'
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-slate-500 bg-slate-100'
          }`}
        >
          <span className="w-1.5 h-1.5 bg-current rounded-full" />
          {list.status === 'active' ? 'Active' : 'Archived'}
        </div>

        {/* More Button */}
        <button
          onClick={onMore}
          className="w-9 h-9 flex items-center justify-center text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETED WEEK CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function CompletedWeekCard({ week }: { week: T10CompletedWeekView }) {
  const formatWeekRange = () => {
    try {
      const start = parseISO(week.week_start);
      const end = parseISO(week.week_end);
      return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
    } catch {
      return 'Week';
    }
  };

  const getCompletionRate = () => {
    return week.completion_rate;
  };

  const rate = getCompletionRate();

  return (
    <div className="flex items-center p-5 bg-white border border-slate-200 rounded-[14px] cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      {/* Check icon */}
      <div className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-500 rounded-full mr-4 flex-shrink-0">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="px-2 py-1 font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded">
            {week.list_key || 'T10'}
          </span>
          <span className="text-[15px] font-semibold text-slate-900 truncate">
            {week.list_name}
          </span>
        </div>
        <p className="text-[13px] text-slate-500">
          {formatWeekRange()} · Checked out {format(parseISO(week.checkout_at || week.week_end), 'MMM d, h:mm a')}
        </p>
      </div>

      {/* Stats */}
      <div className="text-right mr-4">
        <p className={`text-lg font-bold ${rate === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
          {rate}%
        </p>
        <p className="text-xs text-slate-500">
          {week.completed_count}/{week.total_count} done
        </p>
      </div>

      {/* Rating badge */}
      <div className={`px-3 py-1.5 text-xs font-bold rounded-md ${
        rate === 100 ? 'text-emerald-600 bg-emerald-50' :
        rate >= 70 ? 'text-blue-600 bg-blue-50' :
        'text-amber-600 bg-amber-50'
      }`}>
        {rate === 100 ? 'Perfect' : rate >= 70 ? 'Good' : 'Partial'}
      </div>

      <ChevronDown size={18} className="ml-4 text-slate-400 -rotate-90" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVED LIST CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function ArchivedListCard({ 
  list, 
  onRestore, 
  onDelete 
}: { 
  list: T10ListCardView; 
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center p-5 bg-white border border-slate-200 rounded-[14px]">
      {/* Archive icon */}
      <div className="w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500 rounded-full mr-4 flex-shrink-0">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="px-2 py-1 font-mono text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded">
            {list.key || 'T10'}
          </span>
          <span className="text-[15px] font-semibold text-slate-700 truncate">
            {list.name}
          </span>
        </div>
        <p className="text-[13px] text-slate-400">
          Archived {format(parseISO(list.created_at), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Actions */}
      <button
        onClick={onRestore}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
      >
        <RotateCcw size={16} />
        Restore
      </button>
      <button
        onClick={onDelete}
        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function T10LandingPageV3() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'this-week' | 'completed' | 'archived'>('this-week');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedList, setSelectedList] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState<{ id: string; name: string; rect: DOMRect } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter state
  const {
    filters,
    setLabels,
    setAssignees,
    setDateRange,
    setStatus,
    hasActiveFilters,
    resetFilters,
  } = useT10Filters();

  // Data hooks
  const { data: activeLists = [], isLoading: listsLoading } = useT10ListCards('active');
  const { data: archivedLists = [], isLoading: archivedLoading } = useT10ListCards('archived');
  const { data: completedWeeks = [], isLoading: completedLoading } = useT10CompletedWeeksView();
  
  // Mutations
  const renameList = useRenameT10List();
  const deleteList = useDeleteT10List();
  const createWeek = useT10CreateWeek();
  const archiveList = useT10ArchiveList();
  const restoreList = useT10RestoreList();

  // Filter lists based on search
  const filteredActiveLists = useMemo(() => {
    if (!searchQuery) return activeLists;
    const q = searchQuery.toLowerCase();
    return activeLists.filter(
      l => l.name.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q)
    );
  }, [activeLists, searchQuery]);

  const filteredArchivedLists = useMemo(() => {
    if (!searchQuery) return archivedLists;
    const q = searchQuery.toLowerCase();
    return archivedLists.filter(
      l => l.name.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q)
    );
  }, [archivedLists, searchQuery]);

  const filteredCompletedWeeks = useMemo(() => {
    if (!searchQuery) return completedWeeks;
    const q = searchQuery.toLowerCase();
    return completedWeeks.filter(
      w => w.list_name.toLowerCase().includes(q) || w.list_key?.toLowerCase().includes(q)
    );
  }, [completedWeeks, searchQuery]);

  // "C" shortcut to create new list
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

  const handleStartWeek = async (listId: string) => {
    const range = getCurrentWeekRange();
    try {
      const newWeek = await createWeek.mutateAsync({
        list_id: listId,
        week_start: range.start,
        week_end: range.end,
        is_current: true,
      });
      toast({ title: 'Week started', description: 'New week has been created.' });
      navigate(`/taskhub/task10/list/${listId}/week/${newWeek.id}`);
    } catch (error) {
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

  const handleRestore = async (list: T10ListCardView) => {
    try {
      await restoreList.mutateAsync(list.id);
      toast({ title: 'List restored', description: `"${list.name}" has been restored.` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to restore list.', variant: 'destructive' });
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

  const handleArchiveSubmit = async () => {
    if (!selectedList) return;
    try {
      await archiveList.mutateAsync(selectedList.id);
      toast({ title: 'List archived', description: `"${selectedList.name}" has been archived.` });
      setShowArchiveModal(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to archive list.', variant: 'destructive' });
    }
  };

  // Counts
  const completedCount = completedWeeks.length;
  const archivedCount = archivedLists.length;

  const isLoading = 
    activeTab === 'this-week' ? listsLoading :
    activeTab === 'completed' ? completedLoading :
    archivedLoading;

  return (
    <div className="min-h-screen" style={{ background: '#fafafa' }}>
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 text-white text-lg font-extrabold rounded-[14px] shadow-lg shadow-blue-600/30">
            10
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              Priorities
            </span>
            <span className="text-xs font-medium text-slate-500">
              Priority Management
            </span>
          </div>
        </div>

        {/* New List Button */}
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-br from-blue-600 to-blue-700 rounded-[10px] shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/40 transition-all"
        >
          <Plus size={18} strokeWidth={2.5} />
          New List
        </button>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <main 
        className="mx-auto bg-white"
        style={{ 
          maxWidth: '1100px',
          minHeight: 'calc(100vh - 64px)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -2px 20px rgba(0,0,0,0.04)',
          padding: '32px 40px',
        }}
      >
        {/* SEARCH */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-white border border-slate-200 rounded-xl mb-5 focus-within:border-blue-500 focus-within:ring-[3px] focus-within:ring-blue-500/10 transition-all">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search lists, task number, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 !bg-transparent !border-0 !p-0 !outline-none !shadow-none !ring-0 focus:!outline-none focus:!shadow-none focus:!ring-0"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              backgroundColor: 'transparent',
              // Some resets/autofill styles use inset box-shadow to paint a background.
              // This forces it to stay transparent.
              WebkitBoxShadow: '0 0 0 1000px transparent inset',
            }}
          />
        </div>

        {/* FILTERS */}
        <div className="flex gap-2.5 mb-6 flex-wrap items-center">
          <T10LabelFilter
            selected={filters.labels}
            onChange={setLabels}
          />
          <T10AssigneeFilter
            selected={filters.assignees}
            onChange={setAssignees}
          />
          <T10DateRangeFilter
            value={filters.dateRange}
            onChange={setDateRange}
          />
          <T10StatusFilter
            value={filters.status}
            onChange={setStatus}
          />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={14} />
              Clear all
            </button>
          )}
        </div>

        {/* TABS */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6 border border-slate-200">
          <button
            onClick={() => setActiveTab('this-week')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'this-week'
                ? 'text-slate-900 bg-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'completed'
                ? 'text-slate-900 bg-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Completed
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                activeTab === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {completedCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'archived'
                ? 'text-slate-900 bg-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Archived
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                activeTab === 'archived'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {archivedCount}
            </span>
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'this-week' && (
          <>
            {/* SECTION HEADER */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Your Lists
              </span>
              <span className="text-[13px] text-slate-400">
                {filteredActiveLists.length} lists
              </span>
            </div>

            {/* LIST GRID */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[88px] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 rounded-[14px] animate-pulse"
                  />
                ))}
              </div>
            ) : filteredActiveLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-[14px]">
                <p className="text-[15px] text-slate-500 mb-4">No lists yet</p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Create your first list
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredActiveLists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onClick={() => handleListClick(list)}
                    onStartWeek={() => handleStartWeek(list.id)}
                    onMore={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setMenuOpen({ id: list.id, name: list.name, rect });
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Completed Weeks
              </span>
              <span className="text-[13px] text-slate-400">
                {filteredCompletedWeeks.length} weeks
              </span>
            </div>

            {completedLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[88px] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 rounded-[14px] animate-pulse" />
                ))}
              </div>
            ) : filteredCompletedWeeks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-[14px]">
                <p className="text-[15px] text-slate-500 mb-2">No completed weeks yet</p>
                <p className="text-[13px] text-slate-400">Complete a week by checking out all items</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredCompletedWeeks.map((week) => (
                  <CompletedWeekCard key={week.week_id} week={week} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'archived' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Archived Lists
              </span>
              <span className="text-[13px] text-slate-400">
                {filteredArchivedLists.length} lists
              </span>
            </div>

            {archivedLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[88px] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 rounded-[14px] animate-pulse" />
                ))}
              </div>
            ) : filteredArchivedLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-[14px]">
                <p className="text-[15px] text-slate-500 mb-2">No archived lists</p>
                <p className="text-[13px] text-slate-400">Archived lists will appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredArchivedLists.map((list) => (
                  <ArchivedListCard
                    key={list.id}
                    list={list}
                    onRestore={() => handleRestore(list)}
                    onDelete={() => {
                      setSelectedList({ id: list.id, name: list.name });
                      setShowDeleteModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

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
            onRename={async (newName) => {
              try {
                await renameList.mutateAsync({ listId: selectedList.id, name: newName });
                toast({ title: 'List renamed', description: `List renamed to "${newName}".` });
              } catch (err) {
                toast({ title: 'Error', description: 'Failed to rename list.', variant: 'destructive' });
              }
            }}
          />
          <T10DeleteModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            listName={selectedList.name}
            onDelete={handleDeleteSubmit}
          />
          <T10ArchiveModal
            isOpen={showArchiveModal}
            onClose={() => setShowArchiveModal(false)}
            listName={selectedList.name}
            onArchive={handleArchiveSubmit}
          />
        </>
      )}

      {/* Kebab Dropdown Menu */}
      {menuOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[99998]"
            onClick={() => setMenuOpen(null)}
          />
          {/* Dropdown */}
          <div
            className="fixed z-[99999] w-44 bg-white border border-slate-200 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: menuOpen.rect.bottom + 4,
              left: menuOpen.rect.right - 176,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedList({ id: menuOpen.id, name: menuOpen.name });
                setShowRenameModal(true);
                setMenuOpen(null);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Pencil size={15} className="text-slate-400" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedList({ id: menuOpen.id, name: menuOpen.name });
                setShowArchiveModal(true);
                setMenuOpen(null);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Archive size={15} className="text-slate-400" />
              Archive
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onClick={() => {
                setSelectedList({ id: menuOpen.id, name: menuOpen.name });
                setShowDeleteModal(true);
                setMenuOpen(null);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        menuOpen={mobileMenuOpen}
      />

      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer 
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}

export default T10LandingPageV3;
