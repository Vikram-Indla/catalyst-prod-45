import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { BacklogItem, BacklogMeta, BacklogPISection } from '../types';
import { BacklogSection } from './BacklogSection';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // If we have sections, render grouped by PI with drag-drop
  if (sections && sections.length > 0) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="p-4 space-y-4">
          {sections.map((section) => (
            <Droppable key={section.id} droppableId={section.id}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  <BacklogSection
                    section={section}
                    selectedItems={selectedItems}
                    onItemClick={onItemClick}
                    onItemSelect={onItemSelect}
                  />
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    );
  }

  // Otherwise render flat list
  return (
    <div className="p-4">
      <BacklogSection
        section={{
          id: 'all',
          type: 'pi',
          title: 'All Items',
          itemCount: items.length,
          isExpanded: true,
          items,
        }}
        selectedItems={selectedItems}
        onItemClick={onItemClick}
        onItemSelect={onItemSelect}
      />
    </div>
  );
}
