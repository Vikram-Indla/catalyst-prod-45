import { useState } from 'react';
import { useBacklogState } from '../hooks/useBacklogState';
import { BacklogHeader } from './BacklogHeader';
import { BacklogToolbar } from './BacklogToolbar';
import { BacklogListView } from './BacklogListView';
import { BacklogKanbanView } from './BacklogKanbanView';
import { UnassignedBacklogPanel } from './UnassignedBacklogPanel';
import { EpicDetailsPanel } from './EpicDetailsPanel';
import { BacklogFiltersDialog } from './BacklogFiltersDialog';
import { BacklogColumnsDialog } from './BacklogColumnsDialog';
import { PrioritizationDialog } from './PrioritizationDialog';
import { useQuery } from '@tanstack/react-query';
import { fetchBacklogItems, fetchUnassignedItems } from '../api/backlogApi';
import { exportBacklogToCsv } from '../utils/exportCsv';
import { toast } from 'sonner';

export function BacklogWorkspace() {
  const backlogState = useBacklogState();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isUnassignedOpen, setIsUnassignedOpen] = useState(false);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [isPrioritizationOpen, setIsPrioritizationOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch backlog items
  const { data: backlogData, isLoading } = useQuery({
    queryKey: ['backlog-items', backlogState],
    queryFn: () => fetchBacklogItems({
      scope: backlogState.scope,
      type: backlogState.type,
      timeboxType: backlogState.timeboxType,
      timeboxId: backlogState.timeboxId,
      view: backlogState.view,
      sort: backlogState.sort,
      filters: backlogState.filters,
    }),
  });

  // Fetch unassigned items for panel
  const { data: unassignedData } = useQuery({
    queryKey: ['unassigned-items', backlogState.type],
    queryFn: () => fetchUnassignedItems({
      scope: backlogState.scope,
      type: backlogState.type,
      timeboxType: backlogState.timeboxType,
      view: backlogState.view,
    }),
    enabled: isUnassignedOpen,
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

  const handleExport = () => {
    const items = backlogData?.items || [];
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    
    const filename = `backlog-${backlogState.type}-${new Date().toISOString().split('T')[0]}.csv`;
    exportBacklogToCsv(items, filename);
    toast.success(`Exported ${items.length} items to CSV`);
  };

  const isListView = ['list', 'sprint'].includes(backlogState.view);

  return (
    <div className="flex h-screen flex-col bg-background">
      <BacklogHeader
        onOpenFilters={() => setIsFiltersDialogOpen(true)}
        onOpenColumns={() => setIsColumnsDialogOpen(true)}
      />
      
      <BacklogToolbar
        selectedCount={selectedItems.length}
        onOpenPrioritization={() => setIsPrioritizationOpen(true)}
        onToggleUnassigned={() => setIsUnassignedOpen(!isUnassignedOpen)}
        isUnassignedOpen={isUnassignedOpen}
        onExport={handleExport}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
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

        {isUnassignedOpen && (
          <UnassignedBacklogPanel
            items={unassignedData?.items || []}
            meta={unassignedData?.meta}
            onClose={() => setIsUnassignedOpen(false)}
            onItemClick={handleItemClick}
          />
        )}

        {selectedItemId && (
          <EpicDetailsPanel
            itemId={selectedItemId}
            itemType={backlogState.type}
            onClose={() => setSelectedItemId(null)}
          />
        )}
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

      <PrioritizationDialog
        open={isPrioritizationOpen}
        onOpenChange={setIsPrioritizationOpen}
        selectedItems={selectedItems}
        itemType={backlogState.type}
      />
    </div>
  );
}
