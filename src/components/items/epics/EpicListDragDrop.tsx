import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { GripVertical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Epic {
  id: string;
  name: string;
  epic_key?: string;
  state: string;
  health?: string;
  strategic_themes?: { name: string };
  programs?: { name: string };
  owner_id?: string;
  start_date?: string;
  end_date?: string;
  global_rank?: number;
}

interface EpicListDragDropProps {
  epics: Epic[];
  selectedRows: string[];
  onRowClick: (epicId: string) => void;
  onRowSelect: (epicId: string) => void;
  getStateBadge: (state: string) => JSX.Element;
}

export function EpicListDragDrop({
  epics,
  selectedRows,
  onRowClick,
  onRowSelect,
  getStateBadge
}: EpicListDragDropProps) {
  const queryClient = useQueryClient();

  const updateRanksMutation = useMutation({
    mutationFn: async (reorderedEpics: Epic[]) => {
      const updates = reorderedEpics.map((epic, index) => ({
        id: epic.id,
        global_rank: index + 1
      }));

      // Update all ranks in parallel for much faster performance
      const updatePromises = updates.map(update =>
        supabase
          .from('epics')
          .update({ global_rank: update.global_rank })
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check if any updates failed
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error('Some updates failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic ranking updated');
    },
    onError: () => {
      toast.error('Failed to update ranking');
    }
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(epics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateRanksMutation.mutate(items);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="epics-list">
        {(provided) => (
          <TableBody ref={provided.innerRef} {...provided.droppableProps}>
            {epics.map((epic, index) => (
              <Draggable key={epic.id} draggableId={epic.id} index={index}>
                {(provided, snapshot) => (
                  <TableRow
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      snapshot.isDragging ? 'bg-muted shadow-lg' : ''
                    }`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Checkbox
                          checked={selectedRows.includes(epic.id)}
                          onCheckedChange={() => onRowSelect(epic.id)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium" onClick={() => onRowClick(epic.id)}>
                      {epic.name}
                    </TableCell>
                    <TableCell className="text-sm" onClick={() => onRowClick(epic.id)}>
                      {epic.strategic_themes?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm" onClick={() => onRowClick(epic.id)}>
                      {epic.programs?.name || '-'}
                    </TableCell>
                    <TableCell onClick={() => onRowClick(epic.id)}>
                      {getStateBadge(epic.state)}
                    </TableCell>
                    <TableCell onClick={() => onRowClick(epic.id)}>
                      <HealthBadge health={epic.health as any} />
                    </TableCell>
                    <TableCell className="text-sm" onClick={() => onRowClick(epic.id)}>
                      {epic.owner_id || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" onClick={() => onRowClick(epic.id)}>
                      {epic.start_date && epic.end_date
                        ? `${new Date(epic.start_date).toLocaleDateString()} - ${new Date(epic.end_date).toLocaleDateString()}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </TableBody>
        )}
      </Droppable>
    </DragDropContext>
  );
}
