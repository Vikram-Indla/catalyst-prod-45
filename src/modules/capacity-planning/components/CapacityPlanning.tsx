import { useState, useMemo, useCallback } from 'react';
import { addWeeks, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { useResourceInventory } from '@/hooks/useResourceInventory';
import { useCapacityBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, CapacityBooking } from '../hooks/useCapacityBookings';
import { useViewConfig, useSaveViewConfig } from '../hooks/useViewConfig';
import { CapacityHeader } from './CapacityHeader';
import { GanttView } from './GanttView';
import { ListView } from './ListView';
import { InsightsPanel } from './InsightsPanel';
import { AddResourceModal } from './AddResourceModal';
import { AssignModal } from './AssignModal';
import { BulkActionsBar } from './BulkActionsBar';
import { ExportModal } from './ExportModal';
import { getGCCWeekStart } from '../utils/dateUtils';
import { CapacityFilters, DEFAULT_FILTERS } from './CapacityFilter';
import { groupBookingsByResourceWithLanes } from '../utils/laneAllocation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function CapacityPlanning() {
  // Data hooks
  const { data: allResources = [], isLoading: loadingResources } = useResourceInventory();
  const { data: bookings = [], isLoading: loadingBookings } = useCapacityBookings();
  const { data: viewConfig } = useViewConfig();
  const saveViewConfig = useSaveViewConfig();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  // Fetch business requests for the assign modal
  const { data: businessRequests = [] } = useQuery({
    queryKey: ['business-requests-for-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, request_key, title, planned_quarter, rank, impl_start_date')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>(viewConfig?.view_mode || 'gantt');
  const [timeSpan, setTimeSpan] = useState<'2weeks' | '5weeks'>(viewConfig?.time_span || '2weeks');
  const [groupBy, setGroupBy] = useState(viewConfig?.group_by || 'none');
  const [startDate, setStartDate] = useState(() => getGCCWeekStart(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [showInsights, setShowInsights] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewDirty, setViewDirty] = useState(false);
  const [filters, setFilters] = useState<CapacityFilters>(DEFAULT_FILTERS);

  // Modal state
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<CapacityBooking | null>(null);
  const [newBookingResourceId, setNewBookingResourceId] = useState<string | undefined>();
  const [newBookingDate, setNewBookingDate] = useState<Date | undefined>();

  // Calculate visible date range
  const weeksCount = timeSpan === '2weeks' ? 2 : 5;
  const endDate = addDays(addWeeks(startDate, weeksCount), -1);

  // Resources currently in view
  const viewResourceIds = useMemo(() => {
    if (viewConfig?.resource_ids && viewConfig.resource_ids.length > 0) {
      return viewConfig.resource_ids;
    }
    return allResources.filter(r => r.is_active).map(r => r.id);
  }, [viewConfig?.resource_ids, allResources]);

  const viewResources = useMemo(() => {
    return allResources.filter(r => viewResourceIds.includes(r.id));
  }, [allResources, viewResourceIds]);

  // Calculate overlap data for all resources
  const resourceLaneData = useMemo(() => {
    return groupBookingsByResourceWithLanes(bookings, startDate, endDate);
  }, [bookings, startDate, endDate]);

  // Identify overbooked resources
  const overbookedResourceIds = useMemo(() => {
    const ids = new Set<string>();
    resourceLaneData.forEach((data, resourceId) => {
      if (data.hasOverlaps) {
        ids.add(resourceId);
      }
    });
    return ids;
  }, [resourceLaneData]);

  // Apply filters to bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Filter by role (resource's role)
    if (filters.roles.length > 0) {
      const resourceIdsWithRole = new Set(
        allResources
          .filter(r => r.role_code && filters.roles.includes(r.role_code))
          .map(r => r.id)
      );
      filtered = filtered.filter(b => resourceIdsWithRole.has(b.resource_id));
    }

    // Filter by type
    if (filters.types.length > 0) {
      filtered = filtered.filter(b => filters.types.includes(b.booking_type));
    }

    // Filter by status
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(b => b.status && filters.statuses.includes(b.status));
    }

    // Filter by priority
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(b => b.priority && filters.priorities.includes(b.priority));
    }

    // Filter by overbooked only
    if (filters.overbookedOnly) {
      filtered = filtered.filter(b => overbookedResourceIds.has(b.resource_id));
    }

    // Filter by date match mode
    if (filters.dateMatchMode === 'inside') {
      filtered = filtered.filter(b => {
        const bStart = startOfDay(new Date(b.start_date));
        const bEnd = startOfDay(new Date(b.end_date));
        const rangeStart = startOfDay(startDate);
        const rangeEnd = startOfDay(endDate);
        return !isBefore(bStart, rangeStart) && !isAfter(bEnd, rangeEnd);
      });
    }

    return filtered;
  }, [bookings, filters, allResources, overbookedResourceIds, startDate, endDate]);

  // Filter resources based on filtered bookings and overbooked filter
  const filteredResources = useMemo(() => {
    let resources = viewResources;

    // If filtering by roles, only show resources with those roles
    if (filters.roles.length > 0) {
      resources = resources.filter(r => r.role_code && filters.roles.includes(r.role_code));
    }

    // If overbooked only, filter to only overbooked resources
    if (filters.overbookedOnly) {
      resources = resources.filter(r => overbookedResourceIds.has(r.id));
    }

    return resources;
  }, [viewResources, filters, overbookedResourceIds]);

  // Handlers
  const handleViewModeChange = useCallback((mode: 'list' | 'gantt') => {
    setViewMode(mode);
    saveViewConfig.mutate({ view_mode: mode });
  }, [saveViewConfig]);

  const handleTimeSpanChange = useCallback((span: '2weeks' | '5weeks') => {
    setTimeSpan(span);
    saveViewConfig.mutate({ time_span: span });
  }, [saveViewConfig]);

  const handleGroupByChange = useCallback((group: string) => {
    setGroupBy(group);
    saveViewConfig.mutate({ group_by: group });
  }, [saveViewConfig]);

  const handleAddResources = useCallback((resourceIds: string[]) => {
    const newIds = [...new Set([...viewResourceIds, ...resourceIds])];
    saveViewConfig.mutate({ resource_ids: newIds });
    setViewDirty(true);
  }, [viewResourceIds, saveViewConfig]);

  const handleRemoveResource = useCallback((resourceId: string) => {
    const newIds = viewResourceIds.filter(id => id !== resourceId);
    saveViewConfig.mutate({ resource_ids: newIds });
    setViewDirty(true);
  }, [viewResourceIds, saveViewConfig]);

  const handleCreateBooking = useCallback((resourceId: string, date?: Date) => {
    setNewBookingResourceId(resourceId);
    setNewBookingDate(date);
    setEditingBooking(null);
    setAssignModalOpen(true);
  }, []);

  const handleAssignResource = useCallback((resourceId: string) => {
    setNewBookingResourceId(resourceId);
    setNewBookingDate(new Date());
    setEditingBooking(null);
    setAssignModalOpen(true);
  }, []);

  const handleBookingClick = useCallback((booking: CapacityBooking) => {
    setEditingBooking(booking);
    setNewBookingResourceId(booking.resource_id);
    setNewBookingDate(undefined);
    setAssignModalOpen(true);
  }, []);

  const handleSaveBooking = useCallback((data: any) => {
    if (editingBooking) {
      updateBooking.mutate({ id: editingBooking.id, ...data });
    } else {
      createBooking.mutate(data);
    }
    setAssignModalOpen(false);
    setEditingBooking(null);
  }, [editingBooking, createBooking, updateBooking]);

  const handleDeleteBooking = useCallback((bookingId: string) => {
    deleteBooking.mutate(bookingId);
    setAssignModalOpen(false);
    setEditingBooking(null);
  }, [deleteBooking]);

  const handleBulkDelete = useCallback(() => {
    selectedItems.forEach(id => deleteBooking.mutate(id));
    setSelectedItems(new Set());
  }, [selectedItems, deleteBooking]);

  const handleSaveView = useCallback(() => {
    saveViewConfig.mutate({
      resource_ids: viewResourceIds,
      view_mode: viewMode,
      time_span: timeSpan,
      group_by: groupBy,
    }, {
      onSuccess: () => setViewDirty(false),
    });
  }, [saveViewConfig, viewResourceIds, viewMode, timeSpan, groupBy]);

  const isLoading = loadingResources || loadingBookings;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <CapacityHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExport={() => setExportModalOpen(true)}
        startDate={startDate}
        onStartDateChange={setStartDate}
        timeSpan={timeSpan}
        onTimeSpanChange={handleTimeSpanChange}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
        showInsights={showInsights}
        onToggleInsights={() => setShowInsights(!showInsights)}
        onSaveView={handleSaveView}
        isSaving={saveViewConfig.isPending}
        saveDisabled={!viewDirty}
        filters={filters}
        onFiltersChange={setFilters}
        resources={viewResources}
      />

      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedItems.size}
          onClear={() => setSelectedItems(new Set())}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : viewMode === 'gantt' ? (
          <GanttView
            resources={filteredResources}
            bookings={filteredBookings}
            startDate={startDate}
            timeSpan={timeSpan}
            searchQuery={searchQuery}
            onRemoveResource={handleRemoveResource}
            onAddResource={() => setAddResourceOpen(true)}
            onBookingClick={handleBookingClick}
            onCreateBooking={handleCreateBooking}
            onAssign={() => setAssignModalOpen(true)}
            resourceLaneData={resourceLaneData}
          />
        ) : (
          <ListView
            resources={filteredResources}
            bookings={filteredBookings}
            groupBy={groupBy}
            searchQuery={searchQuery}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            onBookingClick={handleBookingClick}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {/* Insights Panel */}
        {showInsights && (
          <InsightsPanel
            resources={filteredResources}
            bookings={filteredBookings}
            visible={true}
          />
        )}
      </div>

      {/* Modals */}
      <AddResourceModal
        open={addResourceOpen}
        onClose={() => setAddResourceOpen(false)}
        allResources={allResources}
        currentResourceIds={viewResourceIds}
        onAddResources={handleAddResources}
      />

      <AssignModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setEditingBooking(null);
        }}
        booking={editingBooking}
        resourceId={newBookingResourceId}
        initialDate={newBookingDate}
        businessRequests={businessRequests}
        viewResources={viewResources}
        onSave={handleSaveBooking}
        onDelete={editingBooking ? () => handleDeleteBooking(editingBooking.id) : undefined}
      />

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        resources={filteredResources}
        bookings={filteredBookings}
      />
    </div>
  );
}
