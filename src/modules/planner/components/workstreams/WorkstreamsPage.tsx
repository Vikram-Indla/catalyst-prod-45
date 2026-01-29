// ============================================================
// WORKSTREAMS V10 - Main Page Component
// Enterprise Clean design with SVG icons per spec
// ============================================================

import '@/styles/workstreams.css';
import '@/styles/workstreams-enterprise-clean.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronDown, List, LayoutGrid, Check, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlannerWorkstreams, Workstream, useArchiveWorkstream, useDeleteWorkstream, useArchivedWorkstreamsCount, useUpdateWorkstream, useAddWorkstreamMember } from '../../hooks/usePlannerWorkstreams';
import { InlineLeadSelect } from './InlineLeadSelect';
import { WorkstreamDrawer } from './WorkstreamDrawer';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';
import { WorkstreamQuickEditDialog } from './WorkstreamQuickEditDialog';
import { ArchivedWorkstreamsView } from './ArchivedWorkstreamsView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// =====================================================
// SVG ICON COMPONENTS — Enterprise Style (1.5px stroke)
// =====================================================

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ArchiveBoxIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="5" rx="1" />
    <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
    <path d="M10 13h4" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const RestoreIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const WORKSTREAM_COLORS = [
  '#06b6d4', '#8b5cf6', '#6366f1', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
  '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#0d9488'
];

export function WorkstreamsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeWorkstream, setActiveWorkstream] = useState<Workstream | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Filter state
  const [healthFilter, setHealthFilter] = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState<string | null>(null);
  
  // Archive filter - check URL param
  const showArchived = searchParams.get('archived') === 'true';
  const { data: workstreams = [], isLoading } = usePlannerWorkstreams(showArchived);
  const { data: archivedCount = 0 } = useArchivedWorkstreamsCount();
  const archiveWorkstream = useArchiveWorkstream();
  const deleteWorkstream = useDeleteWorkstream();
  const updateWorkstream = useUpdateWorkstream();
  const addMember = useAddWorkstreamMember();

  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditWorkstream, setQuickEditWorkstream] = useState<Workstream | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workstream | null>(null);

  // Toggle archive view
  const toggleArchiveView = () => {
    if (showArchived) {
      searchParams.delete('archived');
    } else {
      searchParams.set('archived', 'true');
    }
    setSearchParams(searchParams);
  };

  // Get unique leads for filter dropdown
  const uniqueLeads = useMemo(() => {
    const leads = new Map<string, { id: string; name: string }>();
    workstreams.forEach(ws => {
      if (ws.lead?.id && ws.lead?.name) {
        leads.set(ws.lead.id, { id: ws.lead.id, name: ws.lead.name });
      }
    });
    return Array.from(leads.values());
  }, [workstreams]);

  // Filter workstreams
  const filteredWorkstreams = useMemo(() => {
    return workstreams.filter(ws => {
      // Archive filter
      if (!showArchived && ws.is_archived) return false;
      if (showArchived && !ws.is_archived) return false;
      
      // Search filter
      if (search && !ws.name.toLowerCase().includes(search.toLowerCase())) return false;
      // Health filter
      if (healthFilter && ws.health !== healthFilter) return false;
      // Lead filter
      if (leadFilter) {
        if (leadFilter === 'unassigned' && ws.lead_id) return false;
        if (leadFilter !== 'unassigned' && ws.lead?.id !== leadFilter) return false;
      }
      return true;
    });
  }, [workstreams, search, healthFilter, leadFilter, showArchived]);

  // Compute summary stats (only for active workstreams)
  const summary = useMemo(() => {
    const activeWorkstreams = workstreams.filter(ws => !ws.is_archived);
    return {
      total: activeWorkstreams.length,
      tasks: activeWorkstreams.reduce((sum, ws) => sum + (ws.taskCount || 0), 0),
      healthy: activeWorkstreams.filter(ws => ws.health === 'healthy').length,
      atRisk: activeWorkstreams.filter(ws => ws.health === 'at-risk').length,
      critical: activeWorkstreams.filter(ws => ws.health === 'critical').length,
    };
  }, [workstreams]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (isDrawerOpen || isCreateModalOpen) return;

      switch (e.key) {
        case 'j':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, filteredWorkstreams.length - 1));
          break;
        case 'k':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (focusedIndex >= 0 && filteredWorkstreams[focusedIndex]?.health !== 'locked') {
            e.preventDefault();
            setActiveWorkstream(filteredWorkstreams[focusedIndex]);
            setIsDrawerOpen(true);
          }
          break;
        case 'x':
          if (focusedIndex >= 0 && filteredWorkstreams[focusedIndex]?.health !== 'locked') {
            e.preventDefault();
            const id = filteredWorkstreams[focusedIndex].id;
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }
          break;
        case 'Escape':
          setIsDrawerOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, filteredWorkstreams, isDrawerOpen, isCreateModalOpen]);

  // Card click opens drawer
  const openDrawer = useCallback((ws: Workstream) => {
    if (ws.health !== 'locked') {
      setActiveWorkstream(ws);
      setIsDrawerOpen(true);
    }
  }, []);

  const toggleSelection = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Navigation handlers with workstream filter
  const navigateToTasks = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/planner/task-list?workstream=${encodeURIComponent(ws.slug || ws.id)}`);
  }, [navigate]);

  const navigateToBoard = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/planner/boards?workstream=${encodeURIComponent(ws.slug || ws.id)}`);
  }, [navigate]);

  const navigateToCalendar = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/planner/calendar?workstream=${encodeURIComponent(ws.slug || ws.id)}`);
  }, [navigate]);

  // Quick archive/unarchive from list
  const handleQuickArchive = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    // Ensure row click does not leave/open the drawer when using row actions
    setIsDrawerOpen(false);
    archiveWorkstream.mutate({ id: ws.id, archive: !ws.is_archived });
  }, [archiveWorkstream]);

  const handleQuickEdit = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    // Prevent any accidental row-click drawer open and ensure dialog is visible
    setIsDrawerOpen(false);
    setQuickEditWorkstream(ws);
    setIsQuickEditOpen(true);
  }, []);

  const handleRequestDelete = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDrawerOpen(false);
    setDeleteTarget(ws);
  }, []);

  // Show dedicated Archived view when in archived mode
  if (showArchived) {
    return (
      <ArchivedWorkstreamsView
        workstreams={filteredWorkstreams}
        isLoading={isLoading}
        onBack={toggleArchiveView}
      />
    );
  }

  return (
    <div className="ws-page min-h-screen workstreams-enterprise-clean" data-component="workstreams">
      {/* Dashboard-style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="page-header-left">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Workstreams
          </h1>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400">
            {summary.total} workstream{summary.total !== 1 ? 's' : ''}{summary.atRisk + summary.critical > 0 ? ` · ${summary.atRisk + summary.critical} need attention` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* New Workstream Button */}
          <button 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">New Workstream</span>
            <span className="sm:hidden">New</span>
          </button>

          {/* Archived Button with count badge */}
          <button
            onClick={toggleArchiveView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Archived</span>
            {archivedCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                {archivedCount}
              </span>
            )}
          </button>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${
                view === 'list'
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${
                view === 'grid'
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      <main className="p-6 max-w-[1600px] mx-auto">

        {/* KPI Section - Sentence Case Labels */}
        {!showArchived && (
          <div className="kpi-section ws-summary-bar">
            <div className="kpi-row flex gap-3 flex-wrap">
              <button 
                className={`kpi-card ${!healthFilter ? 'selected' : ''}`}
                onClick={() => setHealthFilter(null)}
              >
                <div className="kpi-value">{summary.total}</div>
                <div className="kpi-label">Workstreams</div>
              </button>
              <div className="kpi-card">
                <div className="kpi-value">{summary.tasks}</div>
                <div className="kpi-label">Tasks</div>
              </div>
              <button 
                className={`kpi-card ${healthFilter === 'healthy' ? 'selected' : ''}`}
                onClick={() => setHealthFilter(healthFilter === 'healthy' ? null : 'healthy')}
              >
                <div className="kpi-value flex items-center gap-2">
                  {summary.healthy}
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="kpi-label">On Track</div>
              </button>
              <button 
                className={`kpi-card ${healthFilter === 'at-risk' ? 'selected' : ''}`}
                onClick={() => setHealthFilter(healthFilter === 'at-risk' ? null : 'at-risk')}
              >
                <div className="kpi-value flex items-center gap-2">
                  {summary.atRisk}
                  <span className="text-amber-600">⚠</span>
                </div>
                <div className="kpi-label">At Risk</div>
              </button>
              <button 
                className={`kpi-card ${healthFilter === 'critical' ? 'selected' : ''}`}
                onClick={() => setHealthFilter(healthFilter === 'critical' ? null : 'critical')}
              >
                <div className="kpi-value flex items-center gap-2">
                  {summary.critical}
                  <span className="text-red-600">●</span>
                </div>
                <div className="kpi-label">Critical</div>
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="ws-toolbar">
          <div className="ws-toolbar-left">
            <div className="ws-search-input">
              <Search className="ws-search-icon w-4 h-4" strokeWidth={2} />
              <input 
                type="search"
                placeholder="Search workstreams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="ws-search-shortcut">⌘K</span>
            </div>
            
            {/* Health Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ws-btn ws-btn-secondary">
                  {healthFilter ? (
                    <>
                      <span className={`w-2 h-2 rounded-full ${
                        healthFilter === 'healthy' ? 'bg-green-500' :
                        healthFilter === 'at-risk' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      {healthFilter === 'healthy' ? 'On Track' : 
                       healthFilter === 'at-risk' ? 'At Risk' : 'Critical'}
                    </>
                  ) : (
                    'Health'
                  )}
                  <ChevronDown className="w-4 h-4" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => setHealthFilter(null)}>
                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                  All
                  {!healthFilter && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setHealthFilter('healthy')}>
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  On Track
                  {healthFilter === 'healthy' && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHealthFilter('at-risk')}>
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                  At Risk
                  {healthFilter === 'at-risk' && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHealthFilter('critical')}>
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                  Critical
                  {healthFilter === 'critical' && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Lead Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ws-btn ws-btn-secondary">
                  {leadFilter ? (
                    leadFilter === 'unassigned' 
                      ? 'Unassigned' 
                      : uniqueLeads.find(l => l.id === leadFilter)?.name || 'Lead'
                  ) : (
                    'Lead'
                  )}
                  <ChevronDown className="w-4 h-4" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => setLeadFilter(null)}>
                  All Leads
                  {!leadFilter && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLeadFilter('unassigned')}>
                  Unassigned
                  {leadFilter === 'unassigned' && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                {uniqueLeads.length > 0 && <DropdownMenuSeparator />}
                {uniqueLeads.map(lead => (
                  <DropdownMenuItem key={lead.id} onClick={() => setLeadFilter(lead.id)}>
                    {lead.name}
                    {leadFilter === lead.id && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {(healthFilter || leadFilter) && (
              <button 
                className="ws-btn ws-btn-ghost"
                onClick={() => {
                  setHealthFilter(null);
                  setLeadFilter(null);
                }}
              >
                <X className="w-4 h-4" strokeWidth={2} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="ws-list-container">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="ws-skeleton-row">
                <div className="ws-skeleton ws-skeleton-checkbox" />
                <div>
                  <div className="ws-skeleton ws-skeleton-text" style={{ width: '120px' }} />
                  <div className="ws-skeleton ws-skeleton-text-sm" style={{ width: '60px' }} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="ws-skeleton ws-skeleton-avatar" />
                  <div className="ws-skeleton ws-skeleton-text" style={{ width: '100px' }} />
                </div>
                <div className="ws-skeleton ws-skeleton-badge" />
                <div className="ws-skeleton ws-skeleton-text" style={{ width: '30px' }} />
                <div className="ws-skeleton ws-skeleton-text" style={{ width: '30px' }} />
                <div />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredWorkstreams.length === 0 && (
          <div className="ws-empty-state">
            <div className="ws-empty-state-icon">
              <LayoutGrid className="w-8 h-8" strokeWidth={2} />
            </div>
            <div className="ws-empty-state-title">
              No workstreams found
            </div>
            <div className="ws-empty-state-text">
              {search || healthFilter || leadFilter 
                ? 'Try adjusting your filters' 
                : 'Create your first workstream to get started'}
            </div>
            {!search && !healthFilter && !leadFilter && (
              <button className="ws-btn ws-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Workstream
              </button>
            )}
          </div>
        )}

        {/* List View */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'list' && (
          <div className="table-container ws-list-container">
            <table className="w-full">
              {/* Table Header - Sentence Case */}
              <thead>
                <tr>
                  <th style={{ width: 200 }}>Name</th>
                  <th style={{ width: 180 }}>Lead</th>
                  <th style={{ width: 120 }}>Health</th>
                  <th style={{ width: 80 }}>Tasks</th>
                  <th style={{ width: 80 }}>Overdue</th>
                  <th style={{ width: 100 }}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>

            {/* Rows */}
            {filteredWorkstreams.map((ws, index) => (
              <tr 
                key={ws.id}
                className={`group cursor-pointer ${ws.health === 'locked' ? 'locked' : ''} ${selectedIds.has(ws.id) ? 'selected' : ''} ${focusedIndex === index ? 'focused' : ''}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.row-actions')) return;
                  openDrawer(ws);
                }}
              >
                {/* Name */}
                <td>
                  <span className="workstream-name font-medium text-slate-900 dark:text-slate-100">{ws.name}</span>
                </td>

                {/* Lead - Inline editable when unassigned */}
                <td onClick={(e) => e.stopPropagation()}>
                  <InlineLeadSelect
                    workstreamId={ws.id}
                    workstreamColor={ws.color}
                    currentLead={ws.lead}
                    onAssignLead={(userId) => {
                      addMember.mutate({
                        workstreamId: ws.id,
                        userId,
                        role: 'lead',
                      });
                    }}
                  />
                </td>

                {/* Health - DOT + TEXT ONLY */}
                <td>
                  <span className={`health-badge health-badge-${ws.health === 'healthy' ? 'success' : ws.health === 'at-risk' ? 'warning' : 'critical'}`}>
                    <span className="health-dot" />
                    {ws.health === 'healthy' && 'On Track'}
                    {ws.health === 'at-risk' && 'At Risk'}
                    {ws.health === 'critical' && 'Critical'}
                    {ws.health === 'locked' && 'Locked'}
                  </span>
                </td>

                {/* Tasks */}
                <td className="font-medium">{ws.taskCount || 0}</td>

                {/* Overdue */}
                <td className={`font-medium ${(ws.overdueCount || 0) > 0 ? 'text-red-600' : ''}`}>
                  {ws.overdueCount || 0}
                </td>

                {/* Actions - Hover reveal */}
                <td>
                  <div
                    className="row-actions flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      className="action-btn w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      onClick={(e) => handleQuickArchive(ws, e)}
                      title={ws.is_archived ? 'Unarchive' : 'Archive'}
                    >
                      {ws.is_archived ? (
                        <RestoreIcon className="w-4 h-4" />
                      ) : (
                        <ArchiveBoxIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button 
                      className="action-btn w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(e) => handleQuickEdit(ws, e)}
                      title="Rename / change prefix"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      className="action-btn w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={(e) => handleRequestDelete(ws, e)}
                      disabled={(ws.taskCount || 0) > 0}
                      title={
                        (ws.taskCount || 0) > 0
                          ? 'Cannot delete: tasks are linked'
                          : 'Delete permanently'
                      }
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View - Enterprise Clean */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'grid' && (
          <div className="grid-container grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filteredWorkstreams.map((ws) => {
              return (
                <div 
                  key={ws.id}
                  className={`workstream-card grid-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${ws.health === 'locked' ? 'locked' : ''}`}
                  onClick={() => openDrawer(ws)}
                >
                  {/* Card Header: Name + Health Badge */}
                  <div className="card-header flex items-start justify-between mb-3">
                    <span className="card-title font-semibold text-slate-900 dark:text-slate-100">{ws.name}</span>
                    <span className={`health-badge health-badge-${ws.health === 'healthy' ? 'success' : ws.health === 'at-risk' ? 'warning' : 'critical'}`}>
                      <span className="health-dot" />
                      {ws.health === 'healthy' && 'On Track'}
                      {ws.health === 'at-risk' && 'At Risk'}
                      {ws.health === 'critical' && 'Critical'}
                      {ws.health === 'locked' && 'Locked'}
                    </span>
                  </div>
                  
                  {/* Lead Row */}
                  <div className="card-lead flex items-center gap-2 py-2.5 border-t border-b border-slate-100 dark:border-slate-700 mb-3">
                    <span className="text-xs text-slate-400">Lead:</span>
                    {ws.lead ? (
                      <div className="lead-cell-assigned flex items-center gap-2">
                        <span 
                          className={`lead-avatar w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold text-white avatar-${['blue', 'purple', 'pink', 'orange', 'teal', 'indigo'][ws.lead.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6]}`}
                          style={{ background: ws.color }}
                        >
                          {ws.lead.initials}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-200">{ws.lead.name}</span>
                      </div>
                    ) : (
                      <button className="lead-cell-empty text-slate-400 hover:text-blue-600 text-sm">
                        — Click to assign
                      </button>
                    )}
                  </div>
                  
                  {/* Stats: Tasks + Overdue ONLY (Done and Progress hidden via CSS) */}
                  <div className="card-stats flex gap-5">
                    <div className="card-stat text-center">
                      <div className="card-stat-value text-xl font-bold text-slate-900 dark:text-slate-100">{ws.taskCount || 0}</div>
                      <div className="card-stat-label text-xs text-slate-500 mt-1">Tasks</div>
                    </div>
                    <div className="card-stat text-center">
                      <div className={`card-stat-value text-xl font-bold ${(ws.overdueCount || 0) > 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                        {ws.overdueCount || 0}
                      </div>
                      <div className="card-stat-label text-xs text-slate-500 mt-1">Overdue</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Drawer */}
      <WorkstreamDrawer
        workstream={activeWorkstream}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Quick Edit (pencil) */}
      <WorkstreamQuickEditDialog
        open={isQuickEditOpen}
        onOpenChange={setIsQuickEditOpen}
        workstream={quickEditWorkstream}
      />

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workstream?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the workstream. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteWorkstream.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
              disabled={deleteWorkstream.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Modal */}
      <CreateWorkstreamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
