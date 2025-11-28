import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Settings } from 'lucide-react';
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
  owner_id?: string;
  estimate?: number;
  custom_column_id?: string;
}

interface Column {
  id: string;
  label: string;
  color: string;
}

interface EpicKanbanCustomProps {
  epics: Epic[];
  onEpicClick: (epicId: string) => void;
  onContextMenu: (epic: Epic, e: React.MouseEvent) => void;
  onConfigureColumns?: () => void;
}

export function EpicKanbanCustom({ epics, onEpicClick, onContextMenu, onConfigureColumns }: EpicKanbanCustomProps) {
  const queryClient = useQueryClient();
  
  // Default custom columns - in real implementation these would come from user preferences
  const [customColumns] = useState<Column[]>([
    { id: 'new', label: 'New', color: 'bg-slate-100' },
    { id: 'in-progress', label: 'In Progress', color: 'bg-blue-100' },
    { id: 'review', label: 'Review', color: 'bg-yellow-100' },
    { id: 'completed', label: 'Completed', color: 'bg-green-100' },
  ]);

  const [columns, setColumns] = useState(() => {
    const cols: Record<string, Epic[]> = {};
    customColumns.forEach(col => {
      cols[col.id] = epics.filter(e => e.custom_column_id === col.id || (!e.custom_column_id && col.id === 'new'));
    });
    return cols;
  });

  const updateEpicColumnMutation = useMutation({
    mutationFn: async ({ epicId, columnId }: { epicId: string; columnId: string }) => {
      // Store custom column in a JSON field or create a separate table
      // For now, we'll use a placeholder - in production, add a custom_columns table
      const { error } = await supabase
        .from('epics')
        .update({ state: columnId as any })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic column updated');
    },
    onError: () => {
      toast.error('Failed to update epic column');
    }
  });

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination || source.droppableId === destination.droppableId) {
      return;
    }

    const newColumnId = destination.droppableId;
    updateEpicColumnMutation.mutate({ epicId: draggableId, columnId: newColumnId });

    // Optimistic update
    setColumns(prev => {
      const newCols = { ...prev };
      const sourceItems = [...newCols[source.droppableId]];
      const destItems = [...newCols[destination.droppableId]];
      const [movedItem] = sourceItems.splice(source.index, 1);
      movedItem.custom_column_id = newColumnId;
      destItems.splice(destination.index, 0, movedItem);
      
      newCols[source.droppableId] = sourceItems;
      newCols[destination.droppableId] = destItems;
      return newCols;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Custom Columns View</h3>
        <Button variant="outline" size="sm" onClick={onConfigureColumns}>
          <Settings className="h-4 w-4 mr-2" />
          Configure Columns
        </Button>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {customColumns.map(column => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <div className={`rounded-t-lg p-3 ${column.color}`}>
                <h3 className="font-semibold text-sm">{column.label}</h3>
                <span className="text-xs text-muted-foreground">
                  {columns[column.id]?.length || 0} epics
                </span>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] p-2 bg-muted/30 rounded-b-lg ${
                      snapshot.isDraggingOver ? 'bg-muted/50' : ''
                    }`}
                  >
                    {columns[column.id]?.map((epic, index) => (
                      <Draggable key={epic.id} draggableId={epic.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-2 p-3 cursor-pointer hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                            onClick={() => onEpicClick(epic.id)}
                            onContextMenu={(e) => onContextMenu(epic, e)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {epic.epic_key && (
                                  <span className="text-xs text-muted-foreground">{epic.epic_key}</span>
                                )}
                                <h4 className="font-medium text-sm mt-1">{epic.name}</h4>
                              </div>
                              <button
                                className="p-1 hover:bg-muted rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContextMenu(epic, e);
                                }}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {epic.health && <HealthBadge health={epic.health as any} />}
                              {epic.strategic_themes && (
                                <Badge variant="secondary" className="text-xs">
                                  {epic.strategic_themes.name}
                                </Badge>
                              )}
                              {epic.estimate && (
                                <Badge variant="outline" className="text-xs">
                                  {epic.estimate} pts
                                </Badge>
                              )}
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
