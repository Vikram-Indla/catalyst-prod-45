/**
 * BacklogWorkspace - Epic Backlog Workspace
 * Split-panel layout for list view (matches Product Demand UX exactly)
 * Left panel: Epic list with search and quick filters
 * Right panel: Epic detail with inline editing
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBacklogState } from '../hooks/useBacklogState';
import { BacklogHeader } from './BacklogHeader';
import { EpicListPanel, EpicListItem } from './split-panel/EpicListPanel';
import { EpicDetailPanel, EpicDetailItem } from './split-panel/EpicDetailPanel';
import { EpicKanbanBoard } from './EpicKanbanBoard';
import { EpicTableView } from './EpicTableView';
import { EpicDrawer } from '@/components/items/epics/EpicDrawer';
import { EpicFiltersDialog } from './EpicFiltersDialog';
import { BacklogColumnsDialog } from './BacklogColumnsDialog';
import { CreateEpicModal } from './CreateEpicModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBacklogItems } from '../api/backlogApi';
import { useEpicBacklogPreferences } from '@/hooks/useEpicBacklogPreferences';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function BacklogWorkspace() {
  const backlogState = useBacklogState();
  const queryClient = useQueryClient();
  const { preferences, updatePreferences } = useEpicBacklogPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Selected epic for detail panel / drawer
  const [selectedEpic, setSelectedEpic] = useState<EpicListItem | null>(null);
  const [drawerEpicId, setDrawerEpicId] = useState<string | null>(null);
  
  // Dialogs
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [isCreateEpicDialogOpen, setIsCreateEpicDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Bulk selection
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Local search for list panel (separate from toolbar)
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<'all' | 'my' | 'theme' | 'unassigned'>('all');
  
  // Toolbar search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile detail view state
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  
  // Get current user for "My Items" filter
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Check URL for epicId param to auto-open drawer
  const epicIdFromUrl = searchParams.get('epicId');

  useEffect(() => {
    if (epicIdFromUrl) {
      setDrawerEpicId(epicIdFromUrl);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('epicId');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [epicIdFromUrl, searchParams, setSearchParams]);

  // Sync view changes to user preferences
  useEffect(() => {
    if (!preferences) return;

    // Preferences only support last_view: 'list' | 'kanban'.
    const prefView = backlogState.view === 'state' || backlogState.view === 'column' || backlogState.view === 'processFlow'
      ? 'kanban'
      : 'list';

    if (prefView !== preferences.last_view) {
      updatePreferences({ last_view: prefView });
    }
  }, [backlogState.view, preferences, updatePreferences]);

  // REALTIME: Subscribe to epics table changes (all changes, not just program-scoped)
  // This ensures orphan epics and cross-program updates are captured
  useEffect(() => {
    const channel = supabase
      .channel('epic-backlog-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'epics',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
          queryClient.invalidateQueries({ queryKey: ['epics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch backlog items
  const { data: backlogData, isLoading } = useQuery({
    queryKey: ['backlog-items', backlogState.programId, backlogState.scope, backlogState.type, backlogState.timeboxType, backlogState.timeboxId, backlogState.view, backlogState.sort, backlogState.filters, searchQuery],
    queryFn: () => fetchBacklogItems({
      scope: backlogState.scope,
      type: backlogState.type,
      timeboxType: backlogState.timeboxType,
      timeboxId: backlogState.timeboxId,
      view: backlogState.view,
      sort: backlogState.sort,
      filters: backlogState.filters,
      programId: backlogState.programId || undefined,
      search: searchQuery || undefined,
    }),
    enabled: !backlogState.isEpicBacklog || !!backlogState.programId,
  });

  // Transform backlog items to EpicListItem format
  const epicListItems: EpicListItem[] = useMemo(() => {
    if (!backlogData?.items) return [];
    
    return backlogData.items.map((item: any) => ({
      id: item.id,
      epicKey: item.epic_key || item.key || `E-${item.id.slice(0, 4)}`,
      name: item.name || item.title || 'Untitled Epic',
      status: item.status || item.processStep || 'proposed',
      themeName: item.themeName || null,
      quarters: Array.isArray(item.quarters) ? item.quarters : [],
      assigneeName: item.assigneeName || null,
      assigneeId: item.assignee_id || null,
      mvp: item.mvp || false,
      createdAt: item.created_at || null,
    }));
  }, [backlogData?.items]);

  // Filter and sort for list panel
  const filteredEpics = useMemo(() => {
    let filtered = [...epicListItems];
    
    // Apply list panel search
    if (listSearchQuery) {
      const query = listSearchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.epicKey.toLowerCase().includes(query)
      );
    }
    
    // Apply quick filter
    if (activeQuickFilter === 'my' && currentUserId) {
      filtered = filtered.filter(e => e.assigneeId === currentUserId);
    } else if (activeQuickFilter === 'theme') {
      filtered = filtered.filter(e => e.themeName !== null && e.themeName !== '');
    } else if (activeQuickFilter === 'unassigned') {
      filtered = filtered.filter(e => !e.assigneeId);
    }
    
    return filtered;
  }, [epicListItems, listSearchQuery, activeQuickFilter, currentUserId]);

  // Sync selectedEpic with latest data when it updates
  useEffect(() => {
    if (!selectedEpic || epicListItems.length === 0) return;
    
    const updated = epicListItems.find(e => e.id === selectedEpic.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedEpic)) {
      setSelectedEpic(updated);
    }
  }, [epicListItems, selectedEpic?.id]);

  // Transform selected epic to detail format
  const selectedEpicDetail: EpicDetailItem | null = useMemo(() => {
    if (!selectedEpic) return null;
    
    const rawItem = backlogData?.items?.find((item: any) => item.id === selectedEpic.id);
    
    return {
      id: selectedEpic.id,
      epicKey: selectedEpic.epicKey,
      name: selectedEpic.name,
      description: rawItem?.description || null,
      status: selectedEpic.status,
      themeName: selectedEpic.themeName,
      themeId: rawItem?.theme_id || null,
      quarters: selectedEpic.quarters,
      assigneeName: selectedEpic.assigneeName,
      assigneeId: selectedEpic.assigneeId,
      mvp: selectedEpic.mvp,
      createdAt: selectedEpic.createdAt,
      updatedAt: rawItem?.updated_at || null,
    };
  }, [selectedEpic, backlogData?.items]);

  // Handle field update
  const handleFieldUpdate = async (field: string, value: any) => {
    if (!selectedEpic) return;

    const { error } = await supabase
      .from('epics')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', selectedEpic.id);

    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    toast.success('Epic updated');
  };

  // Handle clone
  const handleClone = async () => {
    if (!selectedEpic || !backlogState.programId) return;

    const { data: original } = await supabase
      .from('epics')
      .select('name')
      .eq('id', selectedEpic.id)
      .single();

    if (!original) {
      toast.error('Failed to clone epic');
      return;
    }

    const { error } = await supabase
      .from('epics')
      .insert({
        name: `${original.name} (Copy)`,
        primary_program_id: backlogState.programId,
        status: 'proposed',
      });

    if (error) {
      toast.error('Failed to clone epic');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    toast.success('Epic cloned successfully');
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedEpic) return;

    const { error } = await supabase
      .from('epics')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', selectedEpic.id);

    if (error) {
      toast.error('Failed to delete epic');
      return;
    }

    setSelectedEpic(null);
    queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    toast.success('Epic deleted');
  };

  // Bulk delete mutation
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
      toast.success(`${count} epic(s) deleted`);
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Export to CSV
  const handleExport = useCallback(() => {
    const items = backlogData?.items || [];
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }

    try {
      const headers = ['Key', 'Name', 'Status', 'Theme', 'Quarter', 'Assignee', 'MVP', 'Created'];
      const rows = items.map((item: any) => [
        item.epic_key || item.key || '',
        (item.name || '').replace(/,/g, ';').replace(/\n/g, ' '),
        item.status || '',
        item.themeName || '',
        item.quarters?.[0] || '',
        item.assigneeName || '',
        item.mvp ? 'Yes' : 'No',
        item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd') : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map((cell: any) => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `epic-backlog-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${items.length} epics`);
    } catch (error) {
      toast.error('Failed to export');
    }
  }, [backlogData?.items]);

  // Handle epic selection
  const handleSelectEpic = (epic: EpicListItem) => {
    setSelectedEpic(epic);
    setMobileShowDetail(true);
  };

  const handleMobileBack = () => {
    setMobileShowDetail(false);
  };

  const isListView = ['list', 'sprint'].includes(backlogState.view);
  const isTableView = backlogState.view === 'table';
  const activeFiltersCount = Object.values(backlogState.filters).filter(v => v !== undefined && v !== 'all').length;

  return (
    <div className="h-full flex flex-col bg-background">
      <BacklogHeader
        onOpenFilters={() => setIsFiltersDialogOpen(true)}
        onOpenColumns={() => setIsColumnsDialogOpen(true)}
        onCreateEpic={() => setIsCreateEpicDialogOpen(true)}
        onExport={handleExport}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div 
          className="flex items-center gap-3 px-6 py-2 border-b"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
            {selectedItems.length} epic{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={bulkDeleteMutation.isPending}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedItems([])}
            className="gap-1.5"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : isTableView ? (
          /* Table View - Full width like Demand Table */
          <div className="h-full overflow-auto">
            <EpicTableView
              data={backlogData?.items || []}
              isLoading={isLoading}
              onRowClick={(id) => setDrawerEpicId(id)}
              programId={backlogState.programId}
              selectedItems={selectedItems}
              onItemSelect={(id, selected) => {
                setSelectedItems(prev => 
                  selected ? [...prev, id] : prev.filter(x => x !== id)
                );
              }}
            />
          </div>
        ) : isListView ? (
          /* Split Panel Layout for List View */
          <div className="h-full flex flex-col md:flex-row" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Left Panel - List */}
            <div className={cn(
              "w-full md:w-[380px] shrink-0 h-full",
              mobileShowDetail ? "hidden md:block" : "block"
            )}>
              <EpicListPanel
                epics={filteredEpics}
                selectedEpicId={selectedEpic?.id || null}
                onSelectEpic={handleSelectEpic}
                searchQuery={listSearchQuery}
                onSearchChange={setListSearchQuery}
                activeFilter={activeQuickFilter}
                onFilterChange={setActiveQuickFilter}
                onCreateEpic={() => setIsCreateEpicDialogOpen(true)}
                isLoading={isLoading}
              />
            </div>

            {/* Right Panel - Detail */}
            <div className={cn(
              "flex-1 min-w-0 h-full",
              mobileShowDetail ? "block" : "hidden md:block"
            )}>
              <EpicDetailPanel
                epic={selectedEpicDetail}
                onUpdateField={handleFieldUpdate}
                onOpenDrawer={() => selectedEpic && setDrawerEpicId(selectedEpic.id)}
                onClone={handleClone}
                onDelete={handleDelete}
                onMobileBack={handleMobileBack}
                showMobileBack={mobileShowDetail}
              />
            </div>
          </div>
        ) : (
          /* Kanban View */
          <div className="h-full overflow-auto px-4 sm:px-6 pt-2 pb-4">
            <EpicKanbanBoard
              items={backlogData?.items || []}
              meta={backlogData?.meta}
              selectedItems={selectedItems}
              onItemClick={(id) => setDrawerEpicId(id)}
              onItemSelect={(id, selected) => {
                setSelectedItems(prev => 
                  selected ? [...prev, id] : prev.filter(x => x !== id)
                );
              }}
              onAddEpic={() => setIsCreateEpicDialogOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Epic Drawer - for full details */}
      <EpicDrawer
        epicId={drawerEpicId}
        isOpen={!!drawerEpicId}
        onClose={() => setDrawerEpicId(null)}
      />

      {/* Dialogs */}
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
        <CreateEpicModal
          isOpen={isCreateEpicDialogOpen}
          onClose={() => setIsCreateEpicDialogOpen(false)}
          programId={backlogState.programId}
        />
      )}

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.length} epic{selectedItems.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected epics to the recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                bulkDeleteMutation.mutate(selectedItems);
                setIsDeleteDialogOpen(false);
              }}
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
