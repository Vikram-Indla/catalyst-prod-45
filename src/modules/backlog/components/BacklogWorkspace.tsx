import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBacklogState } from '../hooks/useBacklogState';
import { BacklogHeader } from './BacklogHeader';
import { BacklogListView } from './BacklogListView';
import { EpicKanbanBoard } from './EpicKanbanBoard';
import { EpicDrawer } from '@/components/items/epics/EpicDrawer';
import { EpicFiltersDialog } from './EpicFiltersDialog';
import { BacklogColumnsDialog } from './BacklogColumnsDialog';
import { CreateEpicDialog } from '@/modules/program-epics/components/CreateEpicDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBacklogItems } from '../api/backlogApi';
import { useEpicBacklogPreferences } from '@/hooks/useEpicBacklogPreferences';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function BacklogWorkspace() {
  const backlogState = useBacklogState();
  const queryClient = useQueryClient();
  const { preferences, updatePreferences } = useEpicBacklogPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [isCreateEpicDialogOpen, setIsCreateEpicDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Check URL for epicId param to auto-open drawer (used when navigating from Business Request links)
  const epicIdFromUrl = searchParams.get('epicId');

  // Auto-open epic drawer if epicId is in URL
  useEffect(() => {
    if (epicIdFromUrl) {
      setSelectedItemId(epicIdFromUrl);
      // Clear the epicId from URL to avoid re-opening on subsequent navigation
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('epicId');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [epicIdFromUrl, searchParams, setSearchParams]);

  // Sync view changes to user preferences
  useEffect(() => {
    if (preferences && backlogState.view !== preferences.last_view) {
      const validView = backlogState.view === 'column' ? 'kanban' : backlogState.view;
      updatePreferences({ last_view: validView as 'list' | 'kanban' });
    }
  }, [backlogState.view, preferences]);

  // Sync column changes to user preferences
  useEffect(() => {
    if (preferences && JSON.stringify(backlogState.columnsShown) !== JSON.stringify(preferences.selected_columns_main)) {
      updatePreferences({ selected_columns_main: backlogState.columnsShown });
    }
  }, [backlogState.columnsShown, preferences]);

  // REALTIME: Subscribe to epics table changes for live updates
  useEffect(() => {
    if (!backlogState.programId) return;

    const channel = supabase
      .channel('epic-backlog-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'epics',
          filter: `primary_program_id=eq.${backlogState.programId}`,
        },
        (payload) => {
          console.log('[Epic Backlog] Realtime update:', payload.eventType);
          // Invalidate query to refresh data
          queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [backlogState.programId, queryClient]);

  // CRITICAL: Include programId in query key to prevent stale data across programs
  const { data: backlogData, isLoading } = useQuery({
    queryKey: ['backlog-items', backlogState.programId, backlogState.scope, backlogState.type, backlogState.timeboxType, backlogState.timeboxId, backlogState.view, backlogState.sort, backlogState.filters],
    queryFn: () => fetchBacklogItems({
      scope: backlogState.scope,
      type: backlogState.type,
      timeboxType: backlogState.timeboxType,
      timeboxId: backlogState.timeboxId,
      view: backlogState.view,
      sort: backlogState.sort,
      filters: backlogState.filters,
      programId: backlogState.programId || undefined,
    }),
    enabled: !backlogState.isEpicBacklog || !!backlogState.programId,
  });

  // Bulk delete mutation (soft delete)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (epicIds: string[]) => {
      const { error } = await supabase
        .from('epics')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', epicIds);
      if (error) throw error;
      return epicIds.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} epic(s) deleted successfully`);
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete epics: ${error.message}`);
    },
  });

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setIsDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedItems);
    setIsDeleteDialogOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const handleItemClick = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => 
      selected 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleEpicCreated = (_epicId: string) => {
    // Don't open the drawer after creation - just let the list refresh
    // The query invalidation in CreateEpicDialog handles refreshing the list
  };

  // Export epics to CSV
  const handleExport = useCallback(() => {
    const items = backlogData?.items || [];
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }

    try {
      // Define CSV columns
      const headers = ['Key', 'Name', 'Status', 'State', 'Owner', 'Points', 'Start Date', 'Target Date', 'Created'];
      
      // Map items to CSV rows
      const rows = items.map((item: any) => [
        item.key || '',
        (item.name || item.title || '').replace(/,/g, ';').replace(/\n/g, ' '),
        item.status || '',
        item.state || '',
        item.owner_name || item.owner || '',
        item.points || item.story_points || '',
        item.start_date ? format(new Date(item.start_date), 'yyyy-MM-dd') : '',
        item.target_date || item.end_date ? format(new Date(item.target_date || item.end_date), 'yyyy-MM-dd') : '',
        item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd') : '',
      ]);

      // Build CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map((cell: any) => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `epic-backlog-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${items.length} epics to CSV`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  }, [backlogData?.items]);

  const isListView = ['list', 'sprint'].includes(backlogState.view);

  return (
    <div className="h-full flex flex-col bg-background">
      <BacklogHeader
        onOpenFilters={() => setIsFiltersDialogOpen(true)}
        onOpenColumns={() => setIsColumnsDialogOpen(true)}
        onCreateEpic={() => setIsCreateEpicDialogOpen(true)}
        onExport={handleExport}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Bulk Actions Bar - shows when items are selected */}
      {selectedItems.length > 0 && (
        <div 
          className="flex items-center gap-3 px-6 py-2 border-b"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
            {selectedItems.length} request{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearSelection}
            className="gap-1.5"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto px-4 sm:px-6 pt-2 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : isListView ? (
            <BacklogListView
              items={backlogData?.items || []}
              sections={backlogData?.sections || []}
              meta={backlogData?.meta}
              selectedItems={selectedItems}
              onItemClick={handleItemClick}
              onItemSelect={handleItemSelect}
            />
          ) : (
            <EpicKanbanBoard
              items={backlogData?.items || []}
              meta={backlogData?.meta}
              selectedItems={selectedItems}
              onItemClick={handleItemClick}
              onItemSelect={handleItemSelect}
              onAddEpic={() => setIsCreateEpicDialogOpen(true)}
            />
          )}
        </div>

        <EpicDrawer
          epicId={selectedItemId}
          isOpen={!!selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      </div>

      <EpicFiltersDialog
        open={isFiltersDialogOpen}
        onOpenChange={setIsFiltersDialogOpen}
        filters={backlogState.filters}
        onFiltersChange={backlogState.setFilters}
      />

      <BacklogColumnsDialog
        open={isColumnsDialogOpen}
        onOpenChange={setIsColumnsDialogOpen}
        columnsShown={backlogState.columnsShown}
        onColumnsChange={backlogState.setColumnsShown}
      />

      {backlogState.programId && (
        <CreateEpicDialog
          open={isCreateEpicDialogOpen}
          onOpenChange={setIsCreateEpicDialogOpen}
          programId={backlogState.programId}
          onCreated={handleEpicCreated}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.length} epic{selectedItems.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected epics to the recycle bin. You can restore them later if needed.
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
