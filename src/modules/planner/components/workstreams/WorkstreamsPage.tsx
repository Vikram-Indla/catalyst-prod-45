// ============================================================
// WORKSTREAMS V10 - Main Page Component
// Ring-fenced CSS design system
// FIXES: #3/#4 Filters, #7 Card click, #9-12 Navigation
// ============================================================

import '@/styles/workstreams.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, ChevronDown, List, LayoutGrid, ChevronsUpDown, Pencil, Check, X, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlannerWorkstreams, Workstream } from '../../hooks/usePlannerWorkstreams';
import { WorkstreamDrawer } from './WorkstreamDrawer';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const WORKSTREAM_COLORS = [
  '#06b6d4', '#8b5cf6', '#6366f1', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
  '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#0d9488'
];

export function WorkstreamsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeWorkstream, setActiveWorkstream] = useState<Workstream | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // BUG #3 & #4 FIX: Add filter state
  const [healthFilter, setHealthFilter] = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState<string | null>(null);

  const { data: workstreams = [], isLoading } = usePlannerWorkstreams();

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

  // BUG #3 & #4 FIX: Filter workstreams
  const filteredWorkstreams = useMemo(() => {
    return workstreams.filter(ws => {
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
  }, [workstreams, search, healthFilter, leadFilter]);

  // Compute summary stats
  const summary = {
    total: workstreams.length,
    tasks: workstreams.reduce((sum, ws) => sum + (ws.taskCount || 0), 0),
    healthy: workstreams.filter(ws => ws.health === 'healthy').length,
    atRisk: workstreams.filter(ws => ws.health === 'at-risk').length,
    critical: workstreams.filter(ws => ws.health === 'critical').length,
  };

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

  // BUG #7 FIX: Card click opens drawer
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

  // BUG #9-11 FIX: Navigation handlers
  const navigateToTasks = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/planner/task-list?workstream=${ws.slug || ws.id}`);
  }, [navigate]);

  const navigateToBoard = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/planner/boards?workstream=${ws.slug || ws.id}`);
  }, [navigate]);

  const navigateToCalendar = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/planner/calendar?workstream=${ws.slug || ws.id}`);
  }, [navigate]);

  return (
    <div className="ws-page min-h-screen">
      {/* Calendar-style Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Workstreams
          </h2>
          <button 
            className="ws-btn ws-btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Workstream
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle - matching calendar style */}
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

        {/* Summary Bar */}
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
            
            {/* BUG #3 FIX: Health Filter Dropdown */}
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

            {/* BUG #4 FIX: Lead Filter Dropdown */}
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
            <div className="ws-empty-state-title">No workstreams found</div>
            <div className="ws-empty-state-text">
              {search || healthFilter || leadFilter 
                ? 'Try adjusting your filters' 
                : 'Create your first workstream to get started'}
            </div>
            {!search && !healthFilter && !leadFilter && (
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
                  style={{ opacity: ws.health === 'locked' ? 0.5 : 1 }}
                >
                  {selectedIds.has(ws.id) && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>

                {/* Name */}
                <div className="ws-name-cell">
                  <div className="ws-color-dot" style={{ background: ws.color }} />
                  <div className="ws-info">
                    <div className="ws-title">{ws.name}</div>
                    <div className="ws-code">{ws.code}</div>
                  </div>
                </div>

                {/* Lead */}
                <div className="ws-lead-cell">
                  {ws.lead ? (
                    <>
                      <div className="ws-avatar" style={{ background: ws.color }}>
                        {ws.lead.initials}
                      </div>
                      <span className="ws-lead-name">{ws.lead.name}</span>
                    </>
                  ) : (
                    <span className="ws-lead-empty">Unassigned</span>
                  )}
                </div>

                {/* Health with Trend */}
                <div>
                  <span className={`ws-health-badge ${ws.health}`}>
                    {ws.health === 'healthy' && '✓ On Track'}
                    {ws.health === 'at-risk' && '⚠ At Risk'}
                    {ws.health === 'critical' && '● Critical'}
                    {ws.health === 'locked' && '🔒 Locked'}
                    {ws.health !== 'locked' && (
                      <span className={`ws-trend-indicator ws-trend-${ws.trend}`}>
                        {ws.trend === 'up' && '↑'}
                        {ws.trend === 'down' && '↓'}
                        {ws.trend === 'stable' && '→'}
                      </span>
                    )}
                  </span>
                </div>

                {/* Tasks */}
                <div className="ws-stat-cell" style={{ opacity: ws.health === 'locked' ? 0.5 : 1 }}>
                  {ws.taskCount || 0}
                </div>

                {/* Overdue */}
                <div 
                  className={`ws-stat-cell ${(ws.overdueCount || 0) > 0 ? 'overdue' : ''}`}
                  style={{ opacity: ws.health === 'locked' ? 0.5 : 1 }}
                >
                  {ws.overdueCount || 0}
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  {ws.health === 'locked' ? (
                    <button className="ws-btn ws-btn-ghost ws-btn-sm">Request</button>
                  ) : (
                    <button 
                      className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer(ws);
                      }}
                    >
                      <Pencil className="w-[14px] h-[14px]" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid View - BUG #7 FIX: Cards are clickable */}
        {!isLoading && filteredWorkstreams.length > 0 && view === 'grid' && (
          <div className="ws-grid-container">
            {filteredWorkstreams.map((ws) => (
              <div 
                key={ws.id}
                className={`ws-grid-card ${ws.health === 'locked' ? 'locked' : ''}`}
                onClick={() => openDrawer(ws)}
              >
                <div className="ws-card-header">
                  <div>
                    <div className="ws-card-title-row">
                      <div className="ws-color-dot" style={{ background: ws.color }} />
                      <span className="ws-card-title">{ws.name}</span>
                    </div>
                    <div className="ws-card-code">{ws.code}</div>
                  </div>
                  <span className={`ws-health-badge ${ws.health}`}>
                    {ws.health === 'healthy' && '✓'}
                    {ws.health === 'at-risk' && '⚠'}
                    {ws.health === 'critical' && '●'}
                    {ws.health === 'locked' && '🔒'}
                  </span>
                </div>
                <div className="ws-card-body">
                  <div className="ws-card-stats">
                    <div className="ws-card-stat">
                      <div className="ws-card-stat-value">{ws.taskCount || 0}</div>
                      <div className="ws-card-stat-label">Tasks</div>
                    </div>
                    <div className="ws-card-stat">
                      <div className={`ws-card-stat-value ${(ws.overdueCount || 0) > 0 ? 'danger' : ''}`}>
                        {ws.overdueCount || 0}
                      </div>
                      <div className="ws-card-stat-label">Overdue</div>
                    </div>
                    <div className="ws-card-stat">
                      <div className="ws-card-stat-value">{ws.memberCount || 0}</div>
                      <div className="ws-card-stat-label">Members</div>
                    </div>
                  </div>

                  {/* Lead */}
                  <div className="ws-lead-cell">
                    {ws.lead ? (
                      <>
                        <div className="ws-avatar ws-avatar-sm" style={{ background: ws.color }}>
                          {ws.lead.initials}
                        </div>
                        <span className="ws-lead-name">{ws.lead.name}</span>
                      </>
                    ) : (
                      <span className="ws-lead-empty">No lead assigned</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="ws-progress-bar">
                      <div 
                        className="ws-progress-fill" 
                        style={{ 
                          width: `${ws.progress || 0}%`, 
                          background: ws.health === 'critical' ? 'var(--ws-danger)' :
                                     ws.health === 'at-risk' ? 'var(--ws-warning)' : 'var(--ws-primary)'
                        }} 
                      />
                    </div>
                    <div 
                      className="text-right mt-1"
                      style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}
                    >
                      {ws.progress || 0}% complete
                    </div>
                  </div>
                </div>
                
                {/* BUG #9-11 FIX: Card footer with navigation */}
                <div className="ws-card-footer">
                  <button 
                    className="ws-btn ws-btn-secondary ws-btn-sm"
                    onClick={(e) => navigateToTasks(ws, e)}
                  >
                    Tasks
                  </button>
                  <button 
                    className="ws-btn ws-btn-secondary ws-btn-sm"
                    onClick={(e) => navigateToBoard(ws, e)}
                  >
                    Board
                  </button>
                  <button 
                    className="ws-btn ws-btn-secondary ws-btn-sm"
                    onClick={(e) => navigateToCalendar(ws, e)}
                  >
                    Calendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Drawer - BUG #5 FIX: proper height */}
      <WorkstreamDrawer 
        workstream={activeWorkstream}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Create Modal */}
      <CreateWorkstreamModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
