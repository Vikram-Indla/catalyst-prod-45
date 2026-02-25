/**
 * Product Roadmap Page — Initiative Timeline (Gantt)
 * Spec-compliant: KPI strip, toolbar, filters, type tabs, legend, split-panel Gantt
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RoadmapListPanel } from '@/modules/product-roadmap/components/RoadmapListPanel';
import { RoadmapTimelinePanel } from '@/modules/product-roadmap/components/RoadmapTimelinePanel';
import { RoadmapLoadingSkeleton } from '@/modules/product-roadmap/components/RoadmapLoadingSkeleton';
import { RoadmapEmptyState } from '@/modules/product-roadmap/components/RoadmapEmptyState';
import { RoadmapFilterDialog } from '@/modules/product-roadmap/components/RoadmapFilterDialog';
import { RoadmapExportDialog } from '@/modules/product-roadmap/components/RoadmapExportDialog';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { RoadmapDetailPanel } from '@/modules/product-roadmap/components/RoadmapDetailPanel';
import { useRoadmapDemands, useReorderDemands, useUpdateDemandDates } from '@/modules/product-roadmap/hooks/useRoadmapDemands';
import { useRoadmapFilters } from '@/modules/product-roadmap/hooks/useRoadmapFilters';
import { useRoadmapDragDrop } from '@/modules/product-roadmap/hooks/useRoadmapDragDrop';
import { useRoadmapKeyboard } from '@/modules/product-roadmap/hooks/useRoadmapKeyboard';
import { groupDemands } from '@/modules/product-roadmap/utils/grouping';
import type { TimelineConfig, GroupingField, TimelineZoom, RoadmapGroup } from '@/modules/product-roadmap/types/roadmap';
import { DEFAULT_TIMELINE_CONFIG } from '@/modules/product-roadmap/types/roadmap';
import { addMonths, subMonths } from 'date-fns';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import {
  Maximize2, Minimize2, Download, Search, Calendar,
  ChevronDown, Plus, ZoomIn, ZoomOut, Star,
  LayoutList, Columns3, GanttChart, LayoutGrid,
} from 'lucide-react';

// ── Initiative Type Colors ──
const TYPE_COLORS = {
  project: '#2563EB',
  enhancement: '#0D9488',
  improvement: '#D97706',
};

type TypeFilter = 'all' | 'project' | 'enhancement' | 'improvement';
type QuickFilter = 'all' | 'my' | 'quarter' | 'high' | 'unscored' | 'overdue' | 'starred';

export const RoadmapPage: React.FC = () => {
  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { sidebarExpanded, setSidebarExpanded } = useCatalystContext();
  const [prevSidebarState, setPrevSidebarState] = useState(true);

  // Filters
  const { filters, setFilters, activeFilterCount } = useRoadmapFilters();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchValue, setSearchValue] = useState('');

  // Grouping
  const [grouping, setGrouping] = useState<GroupingField>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Timeline
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>(DEFAULT_TIMELINE_CONFIG);

  // Selection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Drawers
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // View mode (for view switcher)
  const [viewMode, setViewMode] = useState<'timeline'>('timeline');

  // Data
  const { data: allItems = [], isLoading, error } = useRoadmapDemands(filters);
  const reorderMutation = useReorderDemands();
  const updateDatesMutation = useUpdateDemandDates();

  // Apply type filter + search
  const items = useMemo(() => {
    let filtered = allItems;
    if (typeFilter !== 'all') {
      filtered = filtered.filter((i: any) => i.initiative_type_key === typeFilter);
    }
    if (searchValue.trim()) {
      const s = searchValue.toLowerCase();
      filtered = filtered.filter((i: any) =>
        i.title?.toLowerCase().includes(s) || i.request_key?.toLowerCase().includes(s)
      );
    }
    return filtered;
  }, [allItems, typeFilter, searchValue]);

  // KPI calculations
  const kpis = useMemo(() => {
    const all = allItems as any[];
    const activeCount = all.filter(i => i.process_step === 'in_progress').length;
    const validationCount = all.filter(i => i.process_step === 'under_review').length;
    const projectCount = all.filter(i => i.initiative_type_key === 'project').length;
    const enhancementCount = all.filter(i => i.initiative_type_key === 'enhancement').length;
    const improvementCount = all.filter(i => i.initiative_type_key === 'improvement').length;
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return {
      onRoadmap: all.length,
      totalInitiatives: all.length,
      activeCount,
      validationCount,
      currentQuarter: `Q${q} ${now.getFullYear()}`,
      projectCount,
      enhancementCount,
      improvementCount,
    };
  }, [allItems]);

  // Grouped items
  const groups = useMemo<RoadmapGroup[] | undefined>(() => {
    if (!grouping) return undefined;
    return groupDemands(items, grouping).map(g => ({
      ...g,
      isExpanded: expandedGroups.has(g.key) || expandedGroups.size === 0,
    }));
  }, [items, grouping, expandedGroups]);

  // Handlers
  const handleReorder = useCallback((updates: { id: string; rank: number }[]) => {
    reorderMutation.mutate(updates);
  }, [reorderMutation]);

  const handleDateChange = useCallback((id: string, start: string | null, end: string | null) => {
    updateDatesMutation.mutate({ id, start_date: start, end_date: end });
  }, [updateDatesMutation]);

  const { handleDragEnd } = useRoadmapDragDrop({ items, onReorder: handleReorder, onDateChange: handleDateChange });

  const handleOpenDrawer = useCallback((id: string) => {
    setSelectedItemId(id);
    setDrawerRequestId(id);
    setIsDrawerOpen(true);
  }, []);

  const handleItemClick = useCallback((id: string) => {
    setSelectedItemId(id);
    setIsDetailPanelOpen(true);
  }, []);

  const handleToggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const handleNavigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    setTimelineConfig(prev => {
      if (direction === 'today') {
        const today = new Date();
        return { ...prev, startDate: subMonths(today, 1), endDate: addMonths(today, 8) };
      }
      const delta = direction === 'next' ? 3 : -3;
      return { ...prev, startDate: addMonths(prev.startDate, delta), endDate: addMonths(prev.endDate, delta) };
    });
  }, []);

  const handleZoomChange = useCallback((zoom: TimelineZoom) => {
    setTimelineConfig(prev => ({ ...prev, zoom }));
  }, []);

  // Keyboard
  const { focusedIndex, setFocusedIndex } = useRoadmapKeyboard({
    items,
    onSelect: setSelectedItemId,
    onOpenDrawer: handleOpenDrawer,
    onEdit: handleOpenDrawer,
    onDelete: handleOpenDrawer,
    onMove: () => {},
    onCreateNew: () => setShowCreateDrawer(true),
    enabled: !isLoading && items.length > 0 && !isDrawerOpen,
  });

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      if (!prev) { setPrevSidebarState(sidebarExpanded); setSidebarExpanded(false); }
      else { setSidebarExpanded(prevSidebarState); }
      return !prev;
    });
  }, [sidebarExpanded, setSidebarExpanded, prevSidebarState]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsFullscreen(false); setSidebarExpanded(prevSidebarState); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, setSidebarExpanded, prevSidebarState]);

  if (isLoading) return <RoadmapLoadingSkeleton />;

  const zoomOptions: { value: TimelineZoom; label: string }[] = [
    { value: 'month', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
  ];

  const quickFilters: { key: QuickFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'All' },
    { key: 'my', label: 'My Items' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'high', label: 'High Priority' },
    { key: 'unscored', label: 'Unscored' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'starred', label: '★ Starred' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── 1. Page Header ── */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>Product Roadmap</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Initiative timeline & delivery planning</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExportDialogOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #E2E8F0', borderRadius: 6, color: '#475569' }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #E2E8F0', borderRadius: 6, color: '#475569' }}
            >
              <Maximize2 className="w-4 h-4" />
              Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen exit bar */}
      {isFullscreen && (
        <div className="flex items-center justify-between px-4 py-1.5" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Product Roadmap</span>
          <button onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md hover:bg-gray-100" style={{ border: '1px solid #E2E8F0', color: '#475569' }}>
            <Minimize2 className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      )}

      {/* ── 2. KPI Strip ── */}
      {!isFullscreen && (
        <div className="grid grid-cols-4 gap-3 px-6 py-3" style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          {/* On Roadmap */}
          <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>On Roadmap</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{kpis.onRoadmap}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>of {kpis.totalInitiatives} total initiatives</div>
          </div>
          {/* By Status */}
          <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>By Status</div>
            <div className="flex items-baseline gap-2" style={{ marginTop: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#16A34A' }}>{kpis.activeCount}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>Active</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8', marginLeft: 8 }}>{kpis.validationCount}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>Validation</span>
            </div>
          </div>
          {/* This Quarter */}
          <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>This Quarter</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{kpis.currentQuarter}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Active initiatives</div>
          </div>
          {/* By Type */}
          <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>By Type</div>
            <div className="flex items-baseline gap-2" style={{ marginTop: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2563EB' }}>{kpis.projectCount}</span>
              <span style={{ fontSize: 10, color: '#64748B' }}>Proj</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0D9488', marginLeft: 4 }}>{kpis.enhancementCount}</span>
              <span style={{ fontSize: 10, color: '#64748B' }}>Enh</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#D97706', marginLeft: 4 }}>{kpis.improvementCount}</span>
              <span style={{ fontSize: 10, color: '#64748B' }}>Imp</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Toolbar Row ── */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <div className="flex items-center gap-2">
          {/* Zoom pills */}
          <div className="inline-flex items-center" style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
            {(['month', 'quarter'] as TimelineZoom[]).map(z => (
              <button
                key={z}
                onClick={() => handleZoomChange(z)}
                className="h-8 px-3 text-xs font-medium transition-colors"
                style={{
                  background: timelineConfig.zoom === z ? '#2563EB' : '#FFFFFF',
                  color: timelineConfig.zoom === z ? '#FFFFFF' : '#475569',
                  borderRight: '1px solid #E2E8F0',
                }}
              >
                {z === 'month' ? 'Month' : 'Quarter'}
              </button>
            ))}
          </div>

          {/* Group dropdown */}
          <div className="relative">
            <select
              value={grouping || 'none'}
              onChange={e => setGrouping(e.target.value === 'none' ? null : e.target.value as GroupingField)}
              className="h-8 pl-3 pr-7 text-xs font-medium appearance-none cursor-pointer"
              style={{ border: '1px solid #E2E8F0', borderRadius: 6, color: '#475569', background: '#FFFFFF' }}
            >
              <option value="none">Group: None</option>
              <option value="status">Group: Status</option>
              <option value="priority">Group: Priority</option>
              <option value="assignee">Group: Owner</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#94A3B8' }} />
          </div>

          {/* Zoom +/- */}
          <button onClick={() => {}} className="h-8 w-8 inline-flex items-center justify-center" style={{ border: '1px solid #E2E8F0', borderRadius: 6 }}>
            <ZoomIn className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
          </button>
          <button onClick={() => {}} className="h-8 w-8 inline-flex items-center justify-center" style={{ border: '1px solid #E2E8F0', borderRadius: 6 }}>
            <ZoomOut className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
          </button>

          {/* Today */}
          <button onClick={() => handleNavigate('today')} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium" style={{ border: '1px solid #E2E8F0', borderRadius: 6, color: '#475569' }}>
            <Calendar className="w-3.5 h-3.5" /> Today
          </button>
        </div>

        {/* Right: View switcher */}
        <div className="flex items-center gap-1">
          {[
            { key: 'table', icon: LayoutList, label: 'Table' },
            { key: 'board', icon: Columns3, label: 'Board' },
            { key: 'timeline', icon: GanttChart, label: 'Timeline' },
            { key: 'cards', icon: LayoutGrid, label: 'Cards' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => {}}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-colors"
              style={{
                borderRadius: 6,
                background: v.key === 'timeline' ? '#EFF6FF' : 'transparent',
                color: v.key === 'timeline' ? '#2563EB' : '#64748B',
                border: v.key === 'timeline' ? '1px solid #BFDBFE' : '1px solid transparent',
              }}
            >
              <v.icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Search & Filter Row ── */}
      <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <div className="relative" style={{ width: 220 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search initiatives..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-xs"
            style={{ border: '1px solid #E2E8F0', borderRadius: 6, outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {quickFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setQuickFilter(f.key)}
              className="h-7 px-3 text-[11px] font-medium transition-colors"
              style={{
                borderRadius: 20,
                background: quickFilter === f.key ? '#EFF6FF' : '#F8FAFC',
                color: quickFilter === f.key ? '#2563EB' : '#64748B',
                border: quickFilter === f.key ? '1px solid #93C5FD' : '1px solid #E2E8F0',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. Type Tabs + Legend ── */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <div className="flex items-center gap-1">
          {([
            { key: 'all' as TypeFilter, label: 'All Types', dot: null },
            { key: 'project' as TypeFilter, label: 'Projects', dot: '#2563EB' },
            { key: 'enhancement' as TypeFilter, label: 'Enhancements', dot: '#0D9488' },
            { key: 'improvement' as TypeFilter, label: 'Improvements', dot: '#D97706' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-colors"
              style={{
                borderRadius: 6,
                background: typeFilter === t.key ? '#F8FAFC' : 'transparent',
                color: typeFilter === t.key ? '#0F172A' : '#64748B',
                borderBottom: typeFilter === t.key ? '2px solid #2563EB' : '2px solid transparent',
              }}
            >
              {t.dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.dot }} />}
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>Legend</span>
          {[
            { label: 'Project', color: '#2563EB' },
            { label: 'Enhancement', color: '#0D9488' },
            { label: 'Improvement', color: '#D97706' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div style={{ width: 20, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: '#64748B' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. Timeline Body ── */}
      <TooltipProvider>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-1 overflow-hidden" style={{ background: '#FFFFFF' }}>
            {items.length === 0 ? (
              <RoadmapEmptyState onCreateClick={() => setShowCreateDrawer(true)} />
            ) : (
              <>
                <RoadmapListPanel
                  items={items}
                  groups={groups}
                  focusedIndex={focusedIndex}
                  selectedItemId={selectedItemId}
                  onItemClick={handleItemClick}
                  onToggleGroup={handleToggleGroup}
                  listWidth={340}
                />
                <RoadmapTimelinePanel
                  items={items}
                  groups={groups}
                  config={timelineConfig}
                  selectedItemId={selectedItemId}
                  onItemClick={handleItemClick}
                  onDateChange={handleDateChange}
                />
              </>
            )}
          </div>
        </DragDropContext>
      </TooltipProvider>

      {/* Dialogs */}
      <RoadmapFilterDialog isOpen={isFilterDialogOpen} onClose={() => setIsFilterDialogOpen(false)} filters={filters} onApply={setFilters} />
      <RoadmapExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} items={items} timelineConfig={timelineConfig} />
      <BusinessRequestDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} requestId={drawerRequestId} onRequestChange={id => { setDrawerRequestId(id); setSelectedItemId(id); }} />
      <RoadmapDetailPanel item={items.find(i => i.id === selectedItemId) || null} isOpen={isDetailPanelOpen} onClose={() => setIsDetailPanelOpen(false)} />
      <CreateInitiativeDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />
    </div>
  );
};

export default RoadmapPage;
