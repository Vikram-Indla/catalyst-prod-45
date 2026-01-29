// ============================================================
// WORKSTREAMS V10 - Main Page Component
// Ring-fenced CSS design system with archive filter
// ============================================================

import '@/styles/workstreams.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, ChevronDown, List, LayoutGrid, ChevronsUpDown, Pencil, Check, X, Archive, ArchiveRestore, Trash2, FolderKanban } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlannerWorkstreams, Workstream, useArchiveWorkstream, useDeleteWorkstream, useArchivedWorkstreamsCount, useUpdateWorkstream, useAddWorkstreamMember } from '../../hooks/usePlannerWorkstreams';
import { InlineLeadSelect } from './InlineLeadSelect';
import { WorkstreamDrawer } from './WorkstreamDrawer';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';
import { WorkstreamQuickEditDialog } from './WorkstreamQuickEditDialog';
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

  return (
    <div className="ws-page min-h-screen">
      {/* Dashboard-style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {showArchived ? 'Archived Workstreams' : 'Workstreams'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* New Workstream Button */}
          {!showArchived && (
            <button 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">New Workstream</span>
              <span className="sm:hidden">New</span>
            </button>
          )}

          {/* Archive Toggle */}
          <button
            onClick={toggleArchiveView}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showArchived
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4" />
                <span className="hidden sm:inline">View Active</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Archived</span>
                <span className="text-xs">({archivedCount})</span>
              </>
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

        {/* Summary Bar - only show for active view */}
        {!showArchived && (
          <div className="ws-summary-bar">
            <div 
              className={`ws-summary-card ${!healthFilter ? 'active' : ''}`}
              onClick={() => setHealthFilter(null)}
            >
              <div className="ws-summary-value">{summary.total}</div>
              <div className="ws-summary-label">Workstreams</div>
            </div>
            <div className="ws-summary-card">
              <div className="ws-summary-value">{summary.tasks}</div>
              <div className="ws-summary-label">Tasks</div>
            </div>
            <div 
              className={`ws-summary-card healthy ${healthFilter === 'healthy' ? 'active' : ''}`}
              onClick={() => setHealthFilter(healthFilter === 'healthy' ? null : 'healthy')}
            >
              <div className="ws-summary-value">
                {summary.healthy}<span className="ws-summary-icon">✓</span>
              </div>
              <div className="ws-summary-label">On Track</div>
            </div>
            <div 
              className={`ws-summary-card at-risk ${healthFilter === 'at-risk' ? 'active' : ''}`}
              onClick={() => setHealthFilter(healthFilter === 'at-risk' ? null : 'at-risk')}
            >
              <div className="ws-summary-value">
                {summary.atRisk}<span className="ws-summary-icon">⚠</span>
              </div>
              <div className="ws-summary-label">At Risk</div>
            </div>
            <div 
              className={`ws-summary-card critical ${healthFilter === 'critical' ? 'active' : ''}`}
              onClick={() => setHealthFilter(healthFilter === 'critical' ? null : 'critical')}
            >
              <div className="ws-summary-value">
                {summary.critical}<span className="ws-summary-icon">●</span>
              </div>
              <div className="ws-summary-label">Critical</div>
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
              {showArchived ? <Archive className="w-8 h-8" /> : <LayoutGrid className="w-8 h-8" strokeWidth={2} />}
            </div>
            <div className="ws-empty-state-title">
              {showArchived ? 'No archived workstreams' : 'No workstreams found'}
            </div>
            <div className="ws-empty-state-text">
              {showArchived 
                ? 'Archived workstreams will appear here'
                : search || healthFilter || leadFilter 
                  ? 'Try adjusting your filters' 
                  : 'Create your first workstream to get started'}
            </div>
            {!search && !healthFilter && !leadFilter && !showArchived && (
              <button className="ws-btn ws-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4" strokeWidth={2} />
                New Workstream
              </button>
            )}
          </div>
        )}

        {/* List View */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'list' && (
          <div className="ws-list-container">
            {/* Header */}
            <div className="ws-list-header">
              <div className="ws-list-header-cell">
                <div className="ws-row-checkbox" />
              </div>
              <div className="ws-list-header-cell">
                Name
                <ChevronsUpDown className="w-3 h-3" strokeWidth={2} />
              </div>
              <div className="ws-list-header-cell">Lead</div>
              <div className="ws-list-header-cell">Health</div>
              <div className="ws-list-header-cell">Tasks</div>
              <div className="ws-list-header-cell">Overdue</div>
              <div className="ws-list-header-cell">
                <span className="ws-sr-only">Actions</span>
              </div>
            </div>

            {/* Rows */}
            {filteredWorkstreams.map((ws, index) => (
              <div 
                key={ws.id}
                className={`ws-list-row ${ws.health === 'locked' ? 'locked' : ''} ${selectedIds.has(ws.id) ? 'selected' : ''} ${focusedIndex === index ? 'focused' : ''}`}
                onClick={(e) => {
                  // Prevent drawer opening if clicking on action buttons
                  if ((e.target as HTMLElement).closest('.ws-row-actions')) return;
                  openDrawer(ws);
                }}
              >
                {/* Checkbox */}
                <div 
                  className={`ws-row-checkbox ${selectedIds.has(ws.id) ? 'checked' : ''}`}
                  onClick={(e) => toggleSelection(ws.id, e)}
                >
                  {selectedIds.has(ws.id) && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>

                {/* Name - color pill and name on same line */}
                <div className="ws-row-name">
                  <div 
                    className="ws-color-dot" 
                    style={{ background: ws.color }} 
                  />
                  <span className="ws-row-title">{ws.name}</span>
                  <span className="ws-row-subtitle">{ws.code}</span>
                </div>

                {/* Lead - Inline editable when unassigned */}
                <div className="ws-row-lead" onClick={(e) => e.stopPropagation()}>
                  <InlineLeadSelect
                    workstreamId={ws.id}
                    workstreamColor={ws.color}
                    currentLead={ws.lead}
                    onAssignLead={(userId) => {
                      // Add member as lead (also updates planner_workstreams.lead_id via hook)
                      addMember.mutate({
                        workstreamId: ws.id,
                        userId,
                        role: 'lead',
                      });
                    }}
                  />
                </div>

                {/* Health */}
                <div className="ws-row-health">
                  <span className={`ws-health-badge ${ws.health}`}>
                    {ws.health === 'healthy' && '✓ On Track'}
                    {ws.health === 'at-risk' && '△ At Risk'}
                    {ws.health === 'critical' && '● Critical'}
                    {ws.health === 'locked' && '🔒 Locked'}
                    <span className="ws-health-arrow">→</span>
                  </span>
                </div>

                {/* Tasks */}
                <div className="ws-row-stat">{ws.taskCount || 0}</div>

                {/* Overdue */}
                <div className={`ws-row-stat ${(ws.overdueCount || 0) > 0 ? 'danger' : ''}`}>
                  {ws.overdueCount || 0}
                </div>

                {/* Actions */}
                <div
                  className="ws-row-actions"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button 
                    className="ws-action-btn"
                    onClick={(e) => handleQuickArchive(ws, e)}
                    title={ws.is_archived ? 'Unarchive' : 'Archive'}
                  >
                    {ws.is_archived ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>
                  <button 
                    className="ws-action-btn"
                    onClick={(e) => handleQuickEdit(ws, e)}
                    title="Rename / change prefix"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    className="ws-action-btn danger"
                    onClick={(e) => handleRequestDelete(ws, e)}
                    disabled={(ws.taskCount || 0) > 0}
                    title={
                      (ws.taskCount || 0) > 0
                        ? 'Cannot delete: tasks are linked'
                        : 'Delete permanently'
                    }
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid View - GOD-TIER Design */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'grid' && (
          <div className="ws-grid-container">
            {filteredWorkstreams.map((ws) => {
              const progressPercent = ws.progress || 0;
              const doneCount = ws.taskCount ? Math.round((progressPercent / 100) * ws.taskCount) : 0;
              
              return (
                <div 
                  key={ws.id}
                  className={`ws-card-v2 ${ws.health === 'locked' ? 'locked' : ''}`}
                  onClick={() => openDrawer(ws)}
                >
                  {/* Health Bar - Full width top bar */}
                  <div 
                    className={`ws-card-health-bar ${ws.health}`}
                    style={{ 
                      background: ws.health === 'critical' ? 'var(--ws-danger)' : 
                                  ws.health === 'at-risk' ? 'var(--ws-warning)' : 
                                  ws.health === 'healthy' ? 'var(--ws-success)' : 'var(--ws-slate-300)'
                    }}
                  />
                  
                  {/* Card Content */}
                  <div className="ws-card-content">
                    {/* Header: Icon + Name + Badge */}
                    <div className="ws-card-header-v2">
                      <div className="ws-card-title-section">
                        <div 
                          className="ws-card-icon"
                          style={{ background: ws.color }}
                        >
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ws-card-title-info">
                          <div className="ws-card-name">{ws.name}</div>
                          <div className="ws-card-code-v2">{ws.code}</div>
                        </div>
                      </div>
                      <div className={`ws-card-health-badge ${ws.health}`}>
                        <span className="ws-health-dot" />
                        {ws.health === 'healthy' && 'On Track'}
                        {ws.health === 'at-risk' && 'At Risk'}
                        {ws.health === 'critical' && 'Critical'}
                        {ws.health === 'locked' && 'Locked'}
                      </div>
                    </div>
                    
                    {/* Lead Section */}
                    <div className="ws-card-lead-section">
                      {ws.lead ? (
                        <>
                          <div 
                            className="ws-card-lead-avatar"
                            style={{ background: ws.color }}
                          >
                            {ws.lead.initials}
                          </div>
                          <div className="ws-card-lead-info">
                            <div className="ws-card-lead-label">Lead</div>
                            <div className="ws-card-lead-name">{ws.lead.name}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ws-card-lead-avatar unassigned">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div className="ws-card-lead-info">
                            <div className="ws-card-lead-label">Lead</div>
                            <div className="ws-card-lead-name unassigned">Unassigned</div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Stats Grid - 3 columns */}
                    <div className="ws-card-stats-grid">
                      <div className="ws-card-stat-box">
                        <div className="ws-card-stat-value">{ws.taskCount || 0}</div>
                        <div className="ws-card-stat-label">Tasks</div>
                      </div>
                      <div className="ws-card-stat-box">
                        <div className={`ws-card-stat-value ${(ws.overdueCount || 0) > 0 ? 'danger' : ''}`}>
                          {ws.overdueCount || 0}
                        </div>
                        <div className="ws-card-stat-label">Overdue</div>
                      </div>
                      <div className="ws-card-stat-box">
                        <div className="ws-card-stat-value">{doneCount}</div>
                        <div className="ws-card-stat-label">Done</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar with Percentage */}
                    <div className="ws-card-progress-section">
                      <div className="ws-card-progress-bar">
                        <div 
                          className="ws-card-progress-fill"
                          style={{ 
                            width: `${progressPercent}%`,
                            background: ws.health === 'critical' ? 'var(--ws-danger)' : 
                                        ws.health === 'at-risk' ? 'var(--ws-warning)' : ws.color
                          }}
                        />
                      </div>
                      <div className="ws-card-progress-text">{progressPercent}%</div>
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
