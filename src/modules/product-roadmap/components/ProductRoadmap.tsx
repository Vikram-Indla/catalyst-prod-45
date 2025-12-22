/**
 * Main Product Roadmap Component
 * Integrates drag & drop and keyboard navigation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RoadmapToolbar } from './RoadmapToolbar';
import { RoadmapListPanel } from './RoadmapListPanel';
import { RoadmapTimelinePanel } from './RoadmapTimelinePanel';
import { RoadmapLoadingSkeleton } from './RoadmapLoadingSkeleton';
import { RoadmapEmptyState } from './RoadmapEmptyState';
import { useRoadmapDemands, useReorderDemands, useUpdateDemandDates } from '../hooks/useRoadmapDemands';
import { useRoadmapFilters } from '../hooks/useRoadmapFilters';
import { useRoadmapDragDrop } from '../hooks/useRoadmapDragDrop';
import { useRoadmapKeyboard } from '../hooks/useRoadmapKeyboard';
import { groupDemands } from '../utils/grouping';
import type { TimelineConfig, GroupingField, TimelineZoom, RoadmapGroup } from '../types/roadmap';
import { DEFAULT_TIMELINE_CONFIG } from '../types/roadmap';
import { addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';

export function ProductRoadmap() {
  // Filter state
  const { filters, setFilters, activeFilterCount } = useRoadmapFilters();
  
  // Grouping state
  const [grouping, setGrouping] = useState<GroupingField>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Timeline config
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>(DEFAULT_TIMELINE_CONFIG);
  
  // Selection state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Dialog states (placeholders for now)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Data fetching
  const { data: items = [], isLoading, error } = useRoadmapDemands(filters);
  const reorderMutation = useReorderDemands();
  const updateDatesMutation = useUpdateDemandDates();

  // Grouped items
  const groups = useMemo<RoadmapGroup[] | undefined>(() => {
    if (!grouping) return undefined;
    return groupDemands(items, grouping).map(g => ({
      ...g,
      isExpanded: expandedGroups.has(g.key) || expandedGroups.size === 0, // Default expanded
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

  // Keyboard navigation handlers
  const handleOpenDrawer = useCallback((id: string) => {
    setSelectedItemId(id);
    // TODO: Open drawer
    toast.info('Drawer opening for: ' + id);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setSelectedItemId(id);
    // TODO: Open edit mode
    toast.info('Edit mode for: ' + id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    // TODO: Show confirmation dialog
    toast.info('Delete confirmation for: ' + id);
  }, []);

  const handleMove = useCallback((id: string, direction: 'up' | 'down') => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const reordered = [...items];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];
    
    const updates = reordered.map((item, index) => ({
      id: item.id,
      rank: index + 1,
    }));
    handleReorder(updates);
  }, [items, handleReorder]);

  const handleCreateNew = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex } = useRoadmapKeyboard({
    items,
    onSelect: setSelectedItemId,
    onOpenDrawer: handleOpenDrawer,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onMove: handleMove,
    onCreateNew: handleCreateNew,
    enabled: !isLoading && items.length > 0,
  });

  const handleItemClick = useCallback((id: string) => {
    setSelectedItemId(id);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      setFocusedIndex(index);
    }
  }, [items, setFocusedIndex]);

  const handleToggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleNavigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    setTimelineConfig(prev => {
      if (direction === 'today') {
        const today = new Date();
        return {
          ...prev,
          startDate: subMonths(today, 1),
          endDate: addMonths(today, 8),
        };
      }
      const delta = direction === 'next' ? 3 : -3;
      return {
        ...prev,
        startDate: addMonths(prev.startDate, delta),
        endDate: addMonths(prev.endDate, delta),
      };
    });
  }, []);

  const handleZoomChange = useCallback((zoom: TimelineZoom) => {
    setTimelineConfig(prev => ({ ...prev, zoom }));
  }, []);

  if (isLoading) {
    return <RoadmapLoadingSkeleton />;
  }

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
    <TooltipProvider>
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
          />

          {/* Main content */}
          {items.length === 0 ? (
            <RoadmapEmptyState onCreateClick={() => setIsCreateDialogOpen(true)} />
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
        </div>
      </DragDropContext>
    </TooltipProvider>
  );
}
