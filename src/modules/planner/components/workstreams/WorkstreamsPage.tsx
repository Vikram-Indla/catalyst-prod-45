// ============================================================
// WORKSTREAMS V10 - Main Page Component
// Ring-fenced CSS design system
// ============================================================

import '@/styles/workstreams.css';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ChevronDown, List, LayoutGrid, ChevronsUpDown, Pencil, Check, X, MoreVertical, AlertTriangle, Calendar, Columns3 } from 'lucide-react';
import { usePlannerWorkstreams, Workstream } from '../../hooks/usePlannerWorkstreams';
import { WorkstreamDrawer } from './WorkstreamDrawer';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';

const WORKSTREAM_COLORS = [
  '#06b6d4', '#8b5cf6', '#6366f1', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
  '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#0d9488'
];

export function WorkstreamsPage() {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeWorkstream, setActiveWorkstream] = useState<Workstream | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [healthFilter, setHealthFilter] = useState<string | null>(null);

  const { data: workstreams = [], isLoading } = usePlannerWorkstreams();

  // Filter workstreams
  const filteredWorkstreams = workstreams.filter(ws => {
    if (search && !ws.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (healthFilter && ws.health !== healthFilter) return false;
    return true;
  });

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

  return (
    <div className="ws-page min-h-screen">
      <main className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--ws-primary-light)', color: 'var(--ws-primary)' }}
            >
              <LayoutGrid className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--ws-text-primary)' }}>
                Workstreams
              </h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-secondary)' }}>
                Organize work into focused tracks with dedicated teams
              </p>
            </div>
          </div>
          <button className="ws-btn ws-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Workstream
          </button>
        </header>

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
            <button className="ws-btn ws-btn-secondary">
              Health <ChevronDown className="w-4 h-4" strokeWidth={2} />
            </button>
            <button className="ws-btn ws-btn-secondary">
              Lead <ChevronDown className="w-4 h-4" strokeWidth={2} />
            </button>
            <button className="ws-btn ws-btn-ghost">My Workstreams</button>
          </div>
          <div className="ws-toolbar-right">
            <div className="ws-view-toggle">
              <button 
                className={`ws-view-toggle-btn ${view === 'list' ? 'active' : ''}`}
                onClick={() => setView('list')}
              >
                <List className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
              <button 
                className={`ws-view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
                onClick={() => setView('grid')}
              >
                <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
            </div>
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
              {search ? 'Try adjusting your search' : 'Create your first workstream to get started'}
            </div>
            {!search && (
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

        {/* Grid View */}
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
                </div>
                <div className="ws-card-footer">
                  <button className="ws-btn ws-btn-secondary ws-btn-sm">
                    <LayoutGrid className="w-4 h-4" strokeWidth={2} />
                    Tasks
                  </button>
                  <button className="ws-btn ws-btn-secondary ws-btn-sm">
                    <Columns3 className="w-4 h-4" strokeWidth={2} />
                    Board
                  </button>
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
        onClose={() => {
          setIsDrawerOpen(false);
          setActiveWorkstream(null);
        }}
      />

      {/* Create Modal */}
      <CreateWorkstreamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
