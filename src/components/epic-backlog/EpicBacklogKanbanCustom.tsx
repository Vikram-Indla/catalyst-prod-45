import { useMutation } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EpicContextMenu } from './EpicContextMenu';
import { EpicLabelSelector } from './EpicLabelSelector';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  state: string;
  mvp?: boolean;
  points_estimate?: number;
  process_step_id?: string;
}

interface Column {
  id: string;
  name: string;
  color?: string;
  exit_criteria?: string;
}

interface EpicBacklogKanbanCustomProps {
  epics: Epic[];
  columns: Column[];
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
  onManageLabels?: () => void;
}

export function EpicBacklogKanbanCustom({ 
  epics, 
  columns, 
  onEpicSelect, 
  onRefetch,
  onManageLabels 
}: EpicBacklogKanbanCustomProps) {
  // Group epics by custom column (using process_step_id as column identifier)
  const epicsByColumn = columns.reduce((acc, column) => {
    acc[column.id] = epics.filter(epic => epic.process_step_id === column.id || (!epic.process_step_id && column.id === 'unassigned'));
    return acc;
  }, {} as Record<string, Epic[]>);

  const updateEpicColumn = useMutation({
    mutationFn: async ({ epicId, columnId }: { epicId: string; columnId: string }) => {
      const { error } = await supabase
        .from('epics')
        .update({ 
          process_step_id: columnId === 'unassigned' ? null : columnId 
        })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Epic moved');
      onRefetch();
    },
    onError: () => {
      toast.error('Failed to move epic');
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceColumnId = result.source.droppableId;
    const destinationColumnId = result.destination.droppableId;

    if (sourceColumnId === destinationColumnId) return;

    const epicId = result.draggableId;
    updateEpicColumn.mutate({ epicId, columnId: destinationColumnId });
  };

  const getColumnColor = (column: Column) => {
    const color = column.color || column.exit_criteria || 'gray';
    switch (color) {
      case 'red': return 'border-t-red-500';
      case 'orange': return 'border-t-orange-500';
      case 'yellow': return 'border-t-yellow-500';
      case 'green': return 'border-t-green-500';
      case 'blue': return 'border-t-blue-500';
      case 'purple': return 'border-t-purple-500';
      default: return 'border-t-gray-300';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnEpics = epicsByColumn[column.id] || [];
          
          return (
            <div key={column.id} className="flex-shrink-0 w-80">
              <Card className={cn("border-t-4", getColumnColor(column))}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{column.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnEpics.length}
                    </Badge>
                  </div>
                </CardHeader>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[400px] transition-colors",
                        snapshot.isDraggingOver && "bg-accent/20"
                      )}
                    >
                      {columnEpics.map((epic, index) => (
                        <Draggable key={epic.id} draggableId={epic.id} index={index}>
                          {(provided, snapshot) => (
                            <EpicContextMenu epicId={epic.id} onRefetch={onRefetch}>
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "cursor-pointer hover:shadow-md transition-shadow",
                                  snapshot.isDragging && "shadow-lg rotate-2"
                                )}
                              >
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start gap-2">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="mt-1 flex-shrink-0"
                                    >
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-2 min-w-0">
                                      <div 
                                        className="font-medium text-sm leading-tight cursor-pointer"
                                        onClick={() => onEpicSelect(epic.id)}
                                      >
                                        {epic.name}
                                      </div>
                                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="font-mono">
                                          {epic.epic_key || `#${epic.id.slice(0, 6)}`}
                                        </span>
                                        {epic.points_estimate && (
                                          <Badge variant="outline" className="text-xs">
                                            {epic.points_estimate} pts
                                          </Badge>
                                        )}
                                      </div>
                                      <EpicLabelSelector 
                                        epicId={epic.id}
                                        onManageLabels={onManageLabels}
                                      />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </EpicContextMenu>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columnEpics.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          Drop epics here
                        </div>
                      )}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
