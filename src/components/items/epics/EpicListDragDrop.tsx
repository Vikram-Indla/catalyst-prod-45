import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { GripVertical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EpicContextMenu } from './EpicContextMenu';

interface Epic {
  id: string;
  name: string;
  epic_key?: string;
  state: string;
  health?: string;
  strategic_themes?: { name: string };
  programs?: { name: string };
  owner_id?: string;
  owner_name?: string;
  start_date?: string;
  end_date?: string;
  global_rank?: number;
  estimate?: number;
}

interface EpicListDragDropProps {
  epics: Epic[];
  selectedRows: string[];
  onRowClick: (epicId: string) => void;
  onRowSelect: (epicId: string) => void;
  getStateBadge: (state: string) => JSX.Element;
  columnsToShow: string[];
  onContextMenuAction: {
    duplicate: (epic: Epic) => void;
    moveToTop: (epic: Epic) => void;
    moveToBottom: (epic: Epic) => void;
    moveToPosition: (epic: Epic) => void;
    moveToPI: (epic: Epic) => void;
    recycleBin: (epic: Epic) => void;
    parkingLot: (epic: Epic) => void;
  };
}

export function EpicListDragDrop({ 
  epics, 
  selectedRows, 
  onRowClick, 
  onRowSelect, 
  getStateBadge,
  columnsToShow,
  onContextMenuAction
}: EpicListDragDropProps) {
  const queryClient = useQueryClient();

  const updateRanksMutation = useMutation({
    mutationFn: async ({ reorderedEpics, movedEpic, fromRank, toRank }: { 
      reorderedEpics: Epic[]; 
      movedEpic: Epic;
      fromRank: number;
      toRank: number;
    }) => {
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

      return { movedEpic, fromRank, toRank };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success(`Moved "${data.movedEpic.name}" from rank ${data.fromRank} to rank ${data.toRank}`);
    },
    onError: () => {
      toast.error('Failed to update ranking');
    }
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const fromRank = result.source.index + 1;
    const toRank = result.destination.index + 1;

    const items = Array.from(epics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateRanksMutation.mutate({ 
      reorderedEpics: items, 
      movedEpic: reorderedItem, 
      fromRank, 
      toRank 
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="epics-list">
        {(provided) => (
          <TableBody ref={provided.innerRef} {...provided.droppableProps}>
            {epics.map((epic, index) => (
              <Draggable key={epic.id} draggableId={epic.id} index={index}>
                {(provided, snapshot) => (
                  <EpicContextMenu
                    epic={epic}
                    onDuplicate={onContextMenuAction.duplicate}
                    onMoveToTop={onContextMenuAction.moveToTop}
                    onMoveToBottom={onContextMenuAction.moveToBottom}
                    onMoveToPosition={onContextMenuAction.moveToPosition}
                    onMoveToPI={onContextMenuAction.moveToPI}
                    onRecycleBin={onContextMenuAction.recycleBin}
                    onParkingLot={onContextMenuAction.parkingLot}
                  >
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
                    {columnsToShow.includes('rank') && (
                      <TableCell className="text-sm font-mono text-muted-foreground" onClick={() => onRowClick(epic.id)}>
                        {epic.global_rank || index + 1}
                      </TableCell>
                    )}
                    {columnsToShow.includes('name') && (
                      <TableCell className="font-medium" onClick={() => onRowClick(epic.id)}>
                        {epic.name}
                      </TableCell>
                    )}
                    {columnsToShow.includes('epic_key') && (
                      <TableCell className="text-sm text-muted-foreground" onClick={() => onRowClick(epic.id)}>
                        {epic.epic_key || '-'}
                      </TableCell>
                    )}
                    {columnsToShow.includes('theme') && (
                      <TableCell className="text-sm" onClick={() => onRowClick(epic.id)}>
                        {epic.strategic_themes?.name || '-'}
                      </TableCell>
                    )}
                    {columnsToShow.includes('program') && (
                      <TableCell className="text-sm" onClick={() => onRowClick(epic.id)}>
                        {epic.programs?.name || '-'}
                      </TableCell>
                    )}
                    {columnsToShow.includes('state') && (
                      <TableCell onClick={() => onRowClick(epic.id)}>
                        {getStateBadge(epic.state)}
                      </TableCell>
                    )}
                    {columnsToShow.includes('health') && (
                      <TableCell onClick={() => onRowClick(epic.id)}>
                        <HealthBadge health={epic.health as any} />
                      </TableCell>
                    )}
                    {columnsToShow.includes('owner') && (
                      <TableCell className="text-sm" onClick={() => onRowClick(epic.id)}>
                        {epic.owner_name || '-'}
                      </TableCell>
                    )}
                    {columnsToShow.includes('dates') && (
                      <TableCell className="text-sm text-muted-foreground" onClick={() => onRowClick(epic.id)}>
                        {epic.start_date && epic.end_date
                          ? `${new Date(epic.start_date).toLocaleDateString()} - ${new Date(epic.end_date).toLocaleDateString()}`
                          : '-'}
                      </TableCell>
                    )}
                    {columnsToShow.includes('estimate') && (
                      <TableCell className="text-sm" onClick={() => onRowClick(epic.id)}>
                        {epic.estimate ? `${epic.estimate} pts` : '-'}
                      </TableCell>
                    )}
                  </TableRow>
                  </EpicContextMenu>
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
