/**
 * Main Product Roadmap Component
 * Integrates drag & drop, keyboard navigation, view modes, print, and high contrast
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { RoadmapToolbar, ViewMode } from './RoadmapToolbar';
import { RoadmapListPanel } from './RoadmapListPanel';
import { RoadmapTimelinePanel } from './RoadmapTimelinePanel';
import { RoadmapSwimlanePanel } from './RoadmapSwimlinePanel';
import { RoadmapLoadingSkeleton } from './RoadmapLoadingSkeleton';
import { RoadmapEmptyState } from './RoadmapEmptyState';
import { RoadmapFilterDialog } from './RoadmapFilterDialog';
import { RoadmapExportDialog } from './RoadmapExportDialog';
import { BusinessRequestDetailModal } from '@/components/business-requests/BusinessRequestDetailModal';
import { RoadmapDetailPanel } from './RoadmapDetailPanel';
import { useRoadmapDemands, useReorderDemands, useUpdateDemandDates } from '../hooks/useRoadmapDemands';
import { useRoadmapFilters } from '../hooks/useRoadmapFilters';
import { useRoadmapDragDrop } from '../hooks/useRoadmapDragDrop';
import { useRoadmapKeyboard } from '../hooks/useRoadmapKeyboard';
import { groupDemands } from '../utils/grouping';
import { doPrintExport } from '../utils/print-export';
import type { TimelineConfig, GroupingField, TimelineZoom, RoadmapGroup } from '../types/roadmap';
import { DEFAULT_TIMELINE_CONFIG } from '../types/roadmap';
import { addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';

interface ProductRoadmapProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function ProductRoadmap({ isFullscreen = false, onToggleFullscreen }: ProductRoadmapProps) {
  // Filter state
  const { filters, setFilters, activeFilterCount } = useRoadmapFilters();
  
  // Grouping state
  const [grouping, setGrouping] = useState<GroupingField>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Timeline config
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>(DEFAULT_TIMELINE_CONFIG);
  
  // Selection state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  
  // Dialog states
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // V9 state
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');
  const [highContrast, setHighContrast] = useState(false);

  // Data fetching
  const { data: items = [], isLoading, error } = useRoadmapDemands(filters);
  const reorderMutation = useReorderDemands();
  const updateDatesMutation = useUpdateDemandDates();

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

  // Drag and drop
  const { handleDragEnd } = useRoadmapDragDrop({
    items,
    onReorder: handleReorder,
    onDateChange: handleDateChange,
  });

  // Drawer handlers
  const handleOpenDrawer = useCallback((id: string) => {
    setSelectedItemId(id);
    setDrawerRequestId(id);
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleDrawerRequestChange = useCallback((newRequestId: string) => {
    setDrawerRequestId(newRequestId);
    setSelectedItemId(newRequestId);
  }, []);

  const handleEdit = useCallback((id: string) => {
    handleOpenDrawer(id);
  }, [handleOpenDrawer]);

  const handleDelete = useCallback((id: string) => {
    handleOpenDrawer(id);
  }, [handleOpenDrawer]);

  const handleMove = useCallback((id: string, direction: 'up' | 'down') => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const reordered = [...items];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];
    const updates = reordered.map((item, index) => ({ id: item.id, rank: index + 1 }));
    handleReorder(updates);
  }, [items, handleReorder]);

  const handleCreateNew = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  // Print handler
  const handlePrint = useCallback(() => {
    const success = doPrintExport(items);
    if (success) toast.success('Print dialog opened');
  }, [items]);

  // Keyboard: ⌘P for print
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrint]);

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex } = useRoadmapKeyboard({
    items,
    onSelect: setSelectedItemId,
    onOpenDrawer: handleOpenDrawer,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onMove: handleMove,
    onCreateNew: handleCreateNew,
    enabled: !isLoading && items.length > 0 && !isDrawerOpen,
  });

  const handleItemClick = useCallback((id: string) => {
    setSelectedItemId(id);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) setFocusedIndex(index);
    setIsDetailPanelOpen(true);
  }, [items, setFocusedIndex]);

  const handleToggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
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

  if (isLoading) return <RoadmapLoadingSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load roadmap</h3>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col h-full bg-background" data-roadmap-container>
          {/* Toolbar */}
          <RoadmapToolbar
            filters={filters}
            onFiltersChange={setFilters}
            grouping={grouping}
            onGroupingChange={setGrouping}
            zoom={timelineConfig.zoom}
            onZoomChange={handleZoomChange}
            onNavigate={handleNavigate}
            onOpenFilterDialog={() => setIsFilterDialogOpen(true)}
            onOpenCreateDialog={() => setIsCreateDialogOpen(true)}
            onOpenExportDialog={() => setIsExportDialogOpen(true)}
            itemCount={items.length}
            activeFilterCount={activeFilterCount}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onPrint={handlePrint}
            highContrast={highContrast}
            onToggleHighContrast={() => setHighContrast(p => !p)}
          />

          {/* Main content */}
          {items.length === 0 ? (
            <RoadmapEmptyState onCreateClick={() => setIsCreateDialogOpen(true)} />
          ) : viewMode === 'swimlane' ? (
            <div className="flex flex-1 overflow-hidden">
              <RoadmapSwimlanePanel
                items={items}
                config={timelineConfig}
                selectedItemId={selectedItemId}
                onItemClick={handleItemClick}
                highContrast={highContrast}
              />
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* List panel */}
              <RoadmapListPanel
                items={items}
                groups={groups}
                focusedIndex={focusedIndex}
                selectedItemId={selectedItemId}
                onItemClick={handleItemClick}
                onToggleGroup={handleToggleGroup}
              />

              {/* Timeline panel */}
              <RoadmapTimelinePanel
                items={items}
                groups={groups}
                config={timelineConfig}
                selectedItemId={selectedItemId}
                onItemClick={handleItemClick}
                onDateChange={handleDateChange}
              />
            </div>
          )}

          {/* Filter Dialog */}
          <RoadmapFilterDialog
            isOpen={isFilterDialogOpen}
            onClose={() => setIsFilterDialogOpen(false)}
            filters={filters}
            onApply={setFilters}
          />

          {/* Export Dialog */}
          <RoadmapExportDialog
            isOpen={isExportDialogOpen}
            onClose={() => setIsExportDialogOpen(false)}
            items={items}
            timelineConfig={timelineConfig}
          />

          {/* Business Request Detail Modal */}
          <BusinessRequestDetailModal
            isOpen={isDrawerOpen}
            onClose={handleCloseDrawer}
            requestId={drawerRequestId}
            onRequestChange={handleDrawerRequestChange}
          />

          {/* Detail Panel */}
          <RoadmapDetailPanel
            item={items.find(i => i.id === selectedItemId) || null}
            isOpen={isDetailPanelOpen}
            onClose={() => setIsDetailPanelOpen(false)}
          />
      </div>
    </DragDropContext>
  );
}
