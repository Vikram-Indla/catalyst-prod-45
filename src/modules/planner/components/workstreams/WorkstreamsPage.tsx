// ============================================================
// WORKSTREAMS V10 - Main Page Component
// Enterprise Clean design with SVG icons per spec
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  List,
  LayoutGrid,
  Check,
  X,
  Plus,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
} from 'lucide-react';
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

const iconProps = { className: 'w-4 h-4', strokeWidth: 1.5 } as const;

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
    <div className="min-h-screen bg-surface-1" data-component="workstreams">
      <header className="bg-surface-0 border-b border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Workstreams</h1>
            <p className="text-sm text-text-muted">
              {summary.total} workstream{summary.total !== 1 ? 's' : ''}
              {summary.atRisk + summary.critical > 0
                ? ` · ${summary.atRisk + summary.critical} need attention`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-brand-primary text-brand-primary-foreground text-sm font-medium hover:bg-brand-primary-hover transition-colors"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus {...iconProps} />
              <span className="hidden sm:inline">New Workstream</span>
              <span className="sm:hidden">New</span>
            </button>

            <button
              onClick={toggleArchiveView}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border-default bg-surface-0 text-text-secondary text-sm hover:bg-surface-2 transition-colors"
            >
              <Archive {...iconProps} />
              <span className="hidden sm:inline">Archived</span>
              {archivedCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-surface-2 text-text-muted">
                  {archivedCount}
                </span>
              )}
            </button>

            <div className="flex items-center rounded-lg border border-border-default bg-surface-2 p-0.5">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-surface-0 text-text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
                aria-pressed={view === 'list'}
              >
                <List {...iconProps} />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'grid'
                    ? 'bg-surface-0 text-text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid {...iconProps} />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-5 space-y-5 max-w-[1600px] mx-auto">
        {/* KPI Bar */}
        <section className="bg-surface-0 border border-border-subtle rounded-xl p-4">
          <div className="flex flex-wrap gap-3">
            <button
              className={`min-w-[120px] rounded-xl border px-5 py-4 text-left transition-colors ${
                !healthFilter
                  ? 'border-brand-primary bg-brand-primary-light'
                  : 'border-border-default bg-surface-0 hover:bg-surface-2'
              }`}
              onClick={() => setHealthFilter(null)}
            >
              <div className="text-kpi-sm font-bold text-text-primary leading-none">{summary.total}</div>
              <div className="mt-2 text-sm text-text-muted">Workstreams</div>
            </button>

            <div className="min-w-[120px] rounded-xl border border-border-default bg-surface-0 px-5 py-4">
              <div className="text-kpi-sm font-bold text-text-primary leading-none">{summary.tasks}</div>
              <div className="mt-2 text-sm text-text-muted">Tasks</div>
            </div>

            <button
              className={`min-w-[120px] rounded-xl border px-5 py-4 text-left transition-colors ${
                healthFilter === 'healthy'
                  ? 'border-brand-primary bg-brand-primary-light'
                  : 'border-border-default bg-surface-0 hover:bg-surface-2'
              }`}
              onClick={() => setHealthFilter(healthFilter === 'healthy' ? null : 'healthy')}
            >
              <div className="flex items-center gap-2 text-kpi-sm font-bold text-text-primary leading-none">
                {summary.healthy}
                <Check {...iconProps} className="w-5 h-5 text-success" />
              </div>
              <div className="mt-2 text-sm text-text-muted">On Track</div>
            </button>

            <button
              className={`min-w-[120px] rounded-xl border px-5 py-4 text-left transition-colors ${
                healthFilter === 'at-risk'
                  ? 'border-brand-primary bg-brand-primary-light'
                  : 'border-border-default bg-surface-0 hover:bg-surface-2'
              }`}
              onClick={() => setHealthFilter(healthFilter === 'at-risk' ? null : 'at-risk')}
            >
              <div className="flex items-center gap-2 text-kpi-sm font-bold text-text-primary leading-none">
                {summary.atRisk}
                <AlertTriangle {...iconProps} className="w-5 h-5 text-warning" />
              </div>
              <div className="mt-2 text-sm text-text-muted">At Risk</div>
            </button>

            <button
              className={`min-w-[120px] rounded-xl border px-5 py-4 text-left transition-colors ${
                healthFilter === 'critical'
                  ? 'border-brand-primary bg-brand-primary-light'
                  : 'border-border-default bg-surface-0 hover:bg-surface-2'
              }`}
              onClick={() => setHealthFilter(healthFilter === 'critical' ? null : 'critical')}
            >
              <div className="flex items-center gap-2 text-kpi-sm font-bold text-text-primary leading-none">
                {summary.critical}
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-danger" aria-hidden />
              </div>
              <div className="mt-2 text-sm text-text-muted">Critical</div>
            </button>
          </div>
        </section>

        {/* Toolbar */}
        <section className="bg-surface-0 border border-border-subtle rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.5} />
              <input
                type="search"
                placeholder="Search workstreams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-border-default bg-surface-0 pl-10 pr-14 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border-default bg-surface-2 px-2 py-0.5 text-2xs text-text-muted">
                ⌘K
              </kbd>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Health Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-border-default bg-surface-0 text-sm text-text-secondary hover:bg-surface-2 transition-colors">
                    {healthFilter ? (
                      <>
                        <span
                          className={
                            `w-2 h-2 rounded-full ` +
                            (healthFilter === 'healthy'
                              ? 'bg-success'
                              : healthFilter === 'at-risk'
                                ? 'bg-warning'
                                : 'bg-danger')
                          }
                        />
                        {healthFilter === 'healthy'
                          ? 'On Track'
                          : healthFilter === 'at-risk'
                            ? 'At Risk'
                            : 'Critical'}
                      </>
                    ) : (
                      'Health'
                    )}
                    <ChevronDown {...iconProps} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => setHealthFilter(null)}>
                    <span className="w-2 h-2 rounded-full bg-text-muted mr-2" />
                    All
                    {!healthFilter && <Check {...iconProps} className="ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setHealthFilter('healthy')}>
                    <span className="w-2 h-2 rounded-full bg-success mr-2" />
                    On Track
                    {healthFilter === 'healthy' && <Check {...iconProps} className="ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHealthFilter('at-risk')}>
                    <span className="w-2 h-2 rounded-full bg-warning mr-2" />
                    At Risk
                    {healthFilter === 'at-risk' && <Check {...iconProps} className="ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHealthFilter('critical')}>
                    <span className="w-2 h-2 rounded-full bg-danger mr-2" />
                    Critical
                    {healthFilter === 'critical' && <Check {...iconProps} className="ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Lead Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-border-default bg-surface-0 text-sm text-text-secondary hover:bg-surface-2 transition-colors">
                    {leadFilter ? (
                      leadFilter === 'unassigned'
                        ? 'Unassigned'
                        : uniqueLeads.find(l => l.id === leadFilter)?.name || 'Lead'
                    ) : (
                      'Lead'
                    )}
                    <ChevronDown {...iconProps} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => setLeadFilter(null)}>
                    All Leads
                    {!leadFilter && <Check {...iconProps} className="ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLeadFilter('unassigned')}>
                    Unassigned
                    {leadFilter === 'unassigned' && <Check {...iconProps} className="ml-auto" />}
                  </DropdownMenuItem>
                  {uniqueLeads.length > 0 && <DropdownMenuSeparator />}
                  {uniqueLeads.map(lead => (
                    <DropdownMenuItem key={lead.id} onClick={() => setLeadFilter(lead.id)}>
                      {lead.name}
                      {leadFilter === lead.id && <Check {...iconProps} className="ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {(healthFilter || leadFilter) && (
                <button
                  className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-border-default bg-surface-0 text-sm text-text-secondary hover:bg-surface-2 transition-colors"
                  onClick={() => {
                    setHealthFilter(null);
                    setLeadFilter(null);
                  }}
                >
                  <X {...iconProps} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-surface-0 border border-border-subtle rounded-xl p-6">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 rounded-lg bg-surface-2" />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredWorkstreams.length === 0 && (
          <div className="bg-surface-0 border border-border-subtle rounded-xl p-10 text-center">
            <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
            </div>
            <div className="text-sm font-medium text-text-primary">No workstreams found</div>
            <div className="mt-1 text-sm text-text-muted">
              {search || healthFilter || leadFilter
                ? 'Try adjusting your filters'
                : 'Create your first workstream to get started'}
            </div>
            {!search && !healthFilter && !leadFilter && (
              <button
                className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-primary text-brand-primary-foreground text-sm font-medium hover:bg-brand-primary-hover transition-colors"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus {...iconProps} />
                New Workstream
              </button>
            )}
          </div>
        )}

        {/* List View */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'list' && (
          <div className="bg-surface-0 border border-border-subtle rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="h-12 bg-surface-2 border-b border-border-default">
                  <th className="px-6 text-left text-xs font-medium text-text-muted" style={{ width: 260 }}>Name</th>
                  <th className="px-6 text-left text-xs font-medium text-text-muted" style={{ width: 220 }}>Lead</th>
                  <th className="px-6 text-left text-xs font-medium text-text-muted" style={{ width: 160 }}>Health</th>
                  <th className="px-6 text-left text-xs font-medium text-text-muted" style={{ width: 100 }}>Tasks</th>
                  <th className="px-6 text-left text-xs font-medium text-text-muted" style={{ width: 110 }}>Overdue</th>
                  <th className="px-6 text-right" style={{ width: 120 }}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkstreams.map((ws, index) => {
                  const healthLabel =
                    ws.health === 'healthy'
                      ? 'On Track'
                      : ws.health === 'at-risk'
                        ? 'At Risk'
                        : ws.health === 'critical'
                          ? 'Critical'
                          : 'Locked';
                  const healthClass =
                    ws.health === 'healthy'
                      ? 'text-success'
                      : ws.health === 'at-risk'
                        ? 'text-warning'
                        : ws.health === 'critical'
                          ? 'text-danger'
                          : 'text-text-muted';

                  return (
                    <tr
                      key={ws.id}
                      className={`group h-14 border-b border-border-subtle last:border-b-0 cursor-pointer transition-colors ${
                        selectedIds.has(ws.id) ? 'bg-brand-primary-light' : 'hover:bg-surface-2'
                      } ${focusedIndex === index ? 'ring-1 ring-focus-ring/30' : ''} ${ws.health === 'locked' ? 'opacity-70' : ''}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('[data-row-actions]')) return;
                        openDrawer(ws);
                      }}
                    >
                      <td className="px-6">
                        <span className="text-sm font-medium text-text-primary">{ws.name}</span>
                      </td>

                      <td className="px-6" onClick={(e) => e.stopPropagation()}>
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

                      <td className="px-6">
                        <span className={`inline-flex items-center gap-2 text-sm ${healthClass}`}>
                          <span className="w-2 h-2 rounded-full bg-current" aria-hidden />
                          <span className="text-sm text-text-secondary">{healthLabel}</span>
                        </span>
                      </td>

                      <td className="px-6">
                        <span className="text-sm font-medium text-text-primary">{ws.taskCount || 0}</span>
                      </td>

                      <td className="px-6">
                        <span
                          className={`text-sm font-medium ${(ws.overdueCount || 0) > 0 ? 'text-danger' : 'text-text-primary'}`}
                        >
                          {ws.overdueCount || 0}
                        </span>
                      </td>

                      <td className="px-6">
                        <div
                          data-row-actions
                          className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-warning hover:bg-warning-bg transition-colors"
                            onClick={(e) => handleQuickArchive(ws, e)}
                            title={ws.is_archived ? 'Restore' : 'Archive'}
                          >
                            {ws.is_archived ? <ArchiveRestore {...iconProps} /> : <Archive {...iconProps} />}
                          </button>
                          <button
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-brand-primary hover:bg-brand-primary-light transition-colors"
                            onClick={(e) => handleQuickEdit(ws, e)}
                            title="Edit"
                          >
                            <Pencil {...iconProps} />
                          </button>
                          <button
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={(e) => handleRequestDelete(ws, e)}
                            disabled={(ws.taskCount || 0) > 0}
                            title={(ws.taskCount || 0) > 0 ? 'Cannot delete: tasks are linked' : 'Delete permanently'}
                          >
                            <Trash2 {...iconProps} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View - Enterprise Clean */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'grid' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filteredWorkstreams.map((ws) => {
              return (
                <div 
                  key={ws.id}
                  className={`bg-surface-0 border border-border-subtle rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm hover:-translate-y-0.5 ${ws.health === 'locked' ? 'opacity-70' : ''}`}
                  onClick={() => openDrawer(ws)}
                >
                  {/* Card Header: Name + Health Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="font-semibold text-text-primary">{ws.name}</span>
                    <span
                      className={`inline-flex items-center gap-2 text-sm ${
                        ws.health === 'healthy'
                          ? 'text-success'
                          : ws.health === 'at-risk'
                            ? 'text-warning'
                            : ws.health === 'critical'
                              ? 'text-danger'
                              : 'text-text-muted'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current" aria-hidden />
                      <span className="text-sm text-text-secondary">
                        {ws.health === 'healthy' && 'On Track'}
                        {ws.health === 'at-risk' && 'At Risk'}
                        {ws.health === 'critical' && 'Critical'}
                        {ws.health === 'locked' && 'Locked'}
                      </span>
                    </span>
                  </div>
                  
                  {/* Lead Row */}
                  <div className="flex items-center gap-2 py-2.5 border-t border-b border-border-subtle mb-3">
                    <span className="text-xs text-text-muted">Lead</span>
                    {ws.lead ? (
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-surface-2 text-text-primary flex items-center justify-center text-2xs font-semibold">
                          {ws.lead.initials}
                        </span>
                        <span className="text-sm text-text-secondary">{ws.lead.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">Unassigned</span>
                    )}
                  </div>
                  
                  {/* Stats: Tasks + Overdue ONLY (Done and Progress hidden via CSS) */}
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-text-primary">{ws.taskCount || 0}</div>
                      <div className="text-xs text-text-muted mt-1">Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl font-bold ${(ws.overdueCount || 0) > 0 ? 'text-danger' : 'text-text-primary'}`}>
                        {ws.overdueCount || 0}
                      </div>
                      <div className="text-xs text-text-muted mt-1">Overdue</div>
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
