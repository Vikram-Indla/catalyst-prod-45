import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { BacklogItem, BacklogMeta, BacklogPISection } from '../types';
import { BacklogSection } from './BacklogSection';
import { BacklogEnterpriseTable } from './BacklogEnterpriseTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBacklogState } from '../hooks/useBacklogState';

interface BacklogListViewProps {
  items: BacklogItem[];
  sections?: BacklogPISection[];
  meta?: BacklogMeta;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

export function BacklogListView({
  items,
  sections,
  meta,
  selectedItems,
  onItemClick,
  onItemSelect,
}: BacklogListViewProps) {
  const queryClient = useQueryClient();
  const { isEpicBacklog } = useBacklogState();

  const updateRanksMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; rank: number }> }) => {
      const promises = updates.map(item =>
        supabase
          .from('epics')
          .update({ global_rank: item.rank })
          .eq('id', item.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Rank updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rank: ${error.message}`);
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceSectionId = result.source.droppableId;
    const destSectionId = result.destination.droppableId;
    
    if (sourceSectionId !== destSectionId) return;

    const section = sections?.find(s => s.id === sourceSectionId);
    if (!section) return;

    const sectionItems = Array.from(section.items);
    const [removed] = sectionItems.splice(result.source.index, 1);
    sectionItems.splice(result.destination.index, 0, removed);

    const updates = sectionItems.map((item, index) => ({
      id: item.id,
      rank: index + 1,
    }));

    updateRanksMutation.mutate({ updates });
  };

  // Use CatalystEnterpriseTable for Epic Backlog (flat list view)
  if (isEpicBacklog && (!sections || sections.length === 0 || (sections.length === 1 && sections[0].id === 'all'))) {
    return (
      <div className="p-4">
        <BacklogEnterpriseTable
          items={items}
          meta={meta}
          selectedItems={selectedItems}
          onItemClick={onItemClick}
          onItemSelect={onItemSelect}
        />
      </div>
    );
  }

  // If we have sections, render grouped by PI with drag-drop
  if (sections && sections.length > 0) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="p-4 space-y-4">
          {sections.map((section) => (
            <BacklogSection
              key={section.id}
              section={section}
              selectedItems={selectedItems}
              onItemClick={onItemClick}
              onItemSelect={onItemSelect}
            />
          ))}
        </div>
      </DragDropContext>
    );
  }

  // Fallback: render flat list with BacklogEnterpriseTable
  return (
    <div className="p-4">
      <BacklogEnterpriseTable
        items={items}
        meta={meta}
        selectedItems={selectedItems}
        onItemClick={onItemClick}
        onItemSelect={onItemSelect}
      />
    </div>
  );
}
