// ============================================================
// WORKSTREAMS V10 - Main Page Component
// Ring-fenced CSS design system with archive filter
// ============================================================

import '@/styles/workstreams.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, ChevronDown, List, LayoutGrid, ChevronsUpDown, Pencil, Check, X, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlannerWorkstreams, Workstream, useArchiveWorkstream, useDeleteWorkstream } from '../../hooks/usePlannerWorkstreams';
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
  const archiveWorkstream = useArchiveWorkstream();
  const deleteWorkstream = useDeleteWorkstream();

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
      archived: workstreams.filter(ws => ws.is_archived).length,
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
      {/* Calendar-style Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {showArchived ? 'Archived Workstreams' : 'Workstreams'}
          </h2>
          {!showArchived && (
            <button 
              className="ws-btn ws-btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              New Workstream
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Archive Toggle */}
          <button
            onClick={toggleArchiveView}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showArchived
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4" />
                View Active
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Archived ({summary.archived})
              </>
            )}
          </button>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-surface-0 p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'list'
                  ? "bg-surface-2 text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'grid'
                  ? "bg-surface-2 text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
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
                onClick={() => openDrawer(ws)}
              >
                {/* Checkbox */}
                <div 
                  className={`ws-row-checkbox ${selectedIds.has(ws.id) ? 'checked' : ''}`}
                  onClick={(e) => toggleSelection(ws.id, e)}
                >
                  {selectedIds.has(ws.id) && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>

                {/* Name */}
                <div className="ws-row-name">
                  <div 
                    className="ws-color-dot" 
                    style={{ background: ws.color }} 
                  />
                  <div>
                    <div className="ws-row-title">{ws.name}</div>
                    <div className="ws-row-subtitle">{ws.code}</div>
                  </div>
                </div>

                {/* Lead */}
                <div className="ws-row-lead">
                  {ws.lead ? (
                    <>
                      <div 
                        className="ws-avatar ws-avatar-sm" 
                        style={{ background: ws.color }}
                      >
                        {ws.lead.initials}
                      </div>
                      <span>{ws.lead.name}</span>
                    </>
                  ) : (
                    <span className="ws-row-unassigned">Unassigned</span>
                  )}
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

        {/* Grid View */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'grid' && (
          <div className="ws-grid-container">
            {filteredWorkstreams.map((ws) => (
              <div 
                key={ws.id}
                className={`ws-grid-card ${ws.health === 'locked' ? 'locked' : ''}`}
                onClick={() => openDrawer(ws)}
              >
                <div className="ws-grid-card-header">
                  <div className="ws-color-dot" style={{ background: ws.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="ws-grid-card-title">{ws.name}</div>
                    <div className="ws-grid-card-code">{ws.code}</div>
                  </div>
                  <span className={`ws-health-badge ${ws.health} compact`}>
                    {ws.health === 'healthy' && '✓'}
                    {ws.health === 'at-risk' && '△'}
                    {ws.health === 'critical' && '●'}
                  </span>
                </div>

                <div className="ws-grid-card-lead">
                  {ws.lead ? (
                    <>
                      <div 
                        className="ws-avatar ws-avatar-sm" 
                        style={{ background: ws.color }}
                      >
                        {ws.lead.initials}
                      </div>
                      <span>{ws.lead.name}</span>
                    </>
                  ) : (
                    <span className="ws-row-unassigned">Unassigned</span>
                  )}
                </div>

                <div className="ws-grid-card-stats">
                  <div className="ws-grid-stat">
                    <span className="ws-grid-stat-value">{ws.taskCount || 0}</span>
                    <span className="ws-grid-stat-label">Tasks</span>
                  </div>
                  <div className="ws-grid-stat">
                    <span className={`ws-grid-stat-value ${(ws.overdueCount || 0) > 0 ? 'danger' : ''}`}>
                      {ws.overdueCount || 0}
                    </span>
                    <span className="ws-grid-stat-label">Overdue</span>
                  </div>
                  <div className="ws-grid-stat">
                    <span className="ws-grid-stat-value">{ws.progress || 0}%</span>
                    <span className="ws-grid-stat-label">Complete</span>
                  </div>
                </div>

                <div className="ws-progress-bar">
                  <div 
                    className="ws-progress-fill" 
                    style={{ 
                      width: `${ws.progress || 0}%`,
                      background: ws.health === 'critical' ? 'var(--ws-danger)' : 
                                  ws.health === 'at-risk' ? 'var(--ws-warning)' : 'var(--ws-success)'
                    }} 
                  />
                </div>
              </div>
            ))}
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
