import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBacklogState } from '../hooks/useBacklogState';
import { BacklogHeader } from './BacklogHeader';
import { BacklogListView } from './BacklogListView';
import { BacklogKanbanView } from './BacklogKanbanView';
import { EpicDrawer } from '@/components/items/epics/EpicDrawer';
import { BacklogFiltersDialog } from './BacklogFiltersDialog';
import { BacklogColumnsDialog } from './BacklogColumnsDialog';
import { CreateEpicDialog } from '@/modules/program-epics/components/CreateEpicDialog';
import { useQuery } from '@tanstack/react-query';
import { fetchBacklogItems } from '../api/backlogApi';
import { useEpicBacklogPreferences } from '@/hooks/useEpicBacklogPreferences';

export function BacklogWorkspace() {
  const backlogState = useBacklogState();
  const { preferences, updatePreferences } = useEpicBacklogPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [isCreateEpicDialogOpen, setIsCreateEpicDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleEpicCreated = (epicId: string) => {
    setSelectedItemId(epicId);
  };

  const isListView = ['list', 'sprint'].includes(backlogState.view);

  return (
    <div className="h-full flex flex-col bg-background">
      <BacklogHeader
        onOpenFilters={() => setIsFiltersDialogOpen(true)}
        onOpenColumns={() => setIsColumnsDialogOpen(true)}
        onCreateEpic={() => setIsCreateEpicDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

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
            <BacklogKanbanView
              items={backlogData?.items || []}
              meta={backlogData?.meta}
              selectedItems={selectedItems}
              onItemClick={handleItemClick}
              onItemSelect={handleItemSelect}
            />
          )}
        </div>

        <EpicDrawer
          epicId={selectedItemId}
          isOpen={!!selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      </div>

      <BacklogFiltersDialog
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
    </div>
  );
}
