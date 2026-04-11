/**
 * FeatureBacklogWorkspace — Main workspace component
 * Matches EpicBacklogWorkspace structure exactly
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeatureBacklogHeader, FeatureViewMode } from './FeatureBacklogHeader';
import { FeatureBacklogTable } from './FeatureBacklogTable';
import { FeatureBacklogFiltersDialog } from './FeatureBacklogFiltersDialog';
import { FeatureBacklogColumnsDialog } from './FeatureBacklogColumnsDialog';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { CreateFeatureModal } from '@/components/features/CreateFeatureModal';
import { fetchFeatureBacklog, fetchProgramProjects, fetchProgramEpics, clearProjectIdsCache } from '../api/featureBacklogApi';
import { FeatureKanbanBoard } from './FeatureKanbanBoard';
import { useFeatureBacklogPreferences } from '../hooks/useFeatureBacklogPreferences';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { FeatureBacklogQueryParams } from '../types';
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

interface FeatureBacklogWorkspaceProps {
  programId: string;
}

export function FeatureBacklogWorkspace({ programId }: FeatureBacklogWorkspaceProps) {
  const queryClient = useQueryClient();
  const { preferences, updatePreferences } = useFeatureBacklogPreferences(programId);

  // State
  const [viewMode, setViewMode] = useState<FeatureViewMode>(preferences.last_view === 'kanban' ? 'board' : preferences.last_view as FeatureViewMode || 'table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter state
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    projectId?: string;
    epicId?: string;
  }>({});

  // Sort state
  const [sortField, setSortField] = useState('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sync view preference - map to storage format
  useEffect(() => {
    const storageView = viewMode === 'board' ? 'kanban' : viewMode;
    if (storageView !== preferences.last_view) {
      updatePreferences({ last_view: storageView as 'list' | 'kanban' });
    }
  }, [viewMode]);

  // Query params
  const queryParams: FeatureBacklogQueryParams = {
    programId,
    page,
    pageSize,
    search: searchQuery || undefined,
    status: filters.status,
    priority: filters.priority,
    projectId: filters.projectId,
    epicId: filters.epicId,
    sortField,
    sortDirection,
  };

  // Fetch features (server-side pagination)
  const { data: backlogData, isLoading, refetch } = useQuery({
    queryKey: ['program', programId, 'feature-backlog', queryParams],
    queryFn: () => fetchFeatureBacklog(queryParams),
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch filter options
  const { data: projects } = useQuery({
    queryKey: ['program', programId, 'projects'],
    queryFn: () => fetchProgramProjects(programId),
  });

  const { data: epics } = useQuery({
    queryKey: ['program', programId, 'epics'],
    queryFn: () => fetchProgramEpics(programId),
  });

  // NOTE: Removed auto-select behavior - drawer should only open on explicit user click

  // Realtime subscription for features
  useEffect(() => {
    const channel = supabase
      .channel(`feature-backlog-${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'features',
        },
        () => {
          // Invalidate all related queries
          queryClient.invalidateQueries({ queryKey: ['program', programId, 'feature-backlog'] });
          queryClient.invalidateQueries({ queryKey: ['feature-detail'] });
          queryClient.invalidateQueries({ queryKey: ['program', programId, 'epic-backlog'] });
          queryClient.invalidateQueries({ queryKey: ['program', programId, 'roadmaps'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [programId, queryClient]);

  const handleFeatureClick = (featureId: string) => {
    // Keep the backlog context visible: open the details drawer instead of navigating away.
    // Users can still open the full page from within the drawer.
    setSelectedFeatureId(featureId);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedItems(prev =>
      selected ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(backlogData?.items.map(f => f.id) || []);
    } else {
      setSelectedItems([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('features')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (deletedIds) => {
      toast.success(`${deletedIds.length} feature(s) deleted`);
      setSelectedItems([]);
      clearProjectIdsCache(programId);
      refetch();
    },
    onError: (error: any) => {
      toast.error('Failed to delete features', {
        description: error.message,
      });
    },
  });

  const handleBulkDelete = () => {
    if (selectedItems.length > 0) {
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedItems);
    setIsDeleteDialogOpen(false);
  };

  const handleExport = useCallback(() => {
    const items = backlogData?.items || [];
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }

    try {
      const headers = ['Key', 'Summary', 'Project', 'Epic', 'Status', 'Priority', 'Assignee', 'Updated'];
      const rows = items.map(item => [
        item.key,
        item.summary.replace(/,/g, ';').replace(/\n/g, ' '),
        item.project_name || '',
        item.epic_name || '',
        item.status || '',
        item.priority || '',
        item.assignee_name || '',
        item.updated_at ? format(new Date(item.updated_at), 'yyyy-MM-dd') : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feature-backlog-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${items.length} features to CSV`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  }, [backlogData?.items]);

  const totalPages = Math.ceil((backlogData?.total || 0) / pageSize);

  return (
    <div className="h-full flex flex-col bg-background">
      <FeatureBacklogHeader
        programId={programId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFilters={() => setIsFiltersOpen(true)}
        onOpenColumns={() => setIsColumnsOpen(true)}
        onExport={handleExport}
        onCreateClick={() => setIsCreateModalOpen(true)}
        selectedCount={selectedItems.length}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
      />

      <div className={viewMode === 'board' ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 overflow-auto px-4 sm:px-6 pt-2 pb-4'}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : viewMode === 'board' ? (
          <FeatureKanbanBoard
            items={backlogData?.items || []}
            programId={programId}
            selectedItems={selectedItems}
            onItemClick={handleFeatureClick}
            onItemSelect={handleSelectItem}
            onAddFeature={() => setIsCreateModalOpen(true)}
          />
        ) : viewMode === 'table' ? (
          <FeatureBacklogTable
            items={backlogData?.items || []}
            visibleColumns={preferences.visible_columns}
            selectedItems={selectedItems}
            onItemClick={handleFeatureClick}
            onItemSelect={handleSelectItem}
            onSelectAll={handleSelectAll}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            page={page}
            pageSize={pageSize}
            totalItems={backlogData?.total || 0}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        ) : (
          /* List View - Split panel layout (matches Epic Backlog) */
          <FeatureBacklogTable
            items={backlogData?.items || []}
            visibleColumns={preferences.visible_columns}
            selectedItems={selectedItems}
            onItemClick={handleFeatureClick}
            onItemSelect={handleSelectItem}
            onSelectAll={handleSelectAll}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            page={page}
            pageSize={pageSize}
            totalItems={backlogData?.total || 0}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Feature Details Drawer */}
      {selectedFeatureId && (
        <FeatureDetailsPanel
          feature={{ id: selectedFeatureId } as any}
          open={!!selectedFeatureId}
          onClose={() => setSelectedFeatureId(null)}
        />
      )}

      {/* Filters Dialog */}
      <FeatureBacklogFiltersDialog
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={projects || []}
        epics={epics || []}
      />

      {/* Columns Dialog */}
      <FeatureBacklogColumnsDialog
        open={isColumnsOpen}
        onOpenChange={setIsColumnsOpen}
        visibleColumns={preferences.visible_columns}
        onColumnsChange={(columns) => updatePreferences({ visible_columns: columns })}
      />

      {/* Create Feature Modal */}
      <CreateFeatureModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(featureId) => {
          setIsCreateModalOpen(false);
          // Clear cache and refetch
          clearProjectIdsCache(programId);
          refetch();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.length} Feature(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected features to trash. You can restore them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
