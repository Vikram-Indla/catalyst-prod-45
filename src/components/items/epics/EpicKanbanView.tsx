import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { MoreVertical } from 'lucide-react';
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
}

interface EpicKanbanViewProps {
  epics: Epic[];
  onEpicClick: (epicId: string) => void;
  onContextMenu: (epic: Epic, e: React.MouseEvent) => void;
}

const STATE_COLUMNS = [
  { id: 'funnel', label: 'Funnel', color: 'bg-slate-100' },
  { id: 'analyzing', label: 'Analyzing', color: 'bg-blue-100' },
  { id: 'portfolio_backlog', label: 'Portfolio Backlog', color: 'bg-yellow-100' },
  { id: 'implementing', label: 'Implementing', color: 'bg-green-100' },
  { id: 'validating_in_production', label: 'Validating', color: 'bg-purple-100' },
  { id: 'done', label: 'Done', color: 'bg-emerald-100' },
];

export function EpicKanbanView({ epics, onEpicClick, onContextMenu }: EpicKanbanViewProps) {
  const queryClient = useQueryClient();
  
  // Sync columns with epics prop changes
  const columns = (() => {
    const cols: Record<string, Epic[]> = {};
    STATE_COLUMNS.forEach(col => {
      cols[col.id] = epics.filter(e => e.state === col.id || (!e.state && col.id === 'funnel'));
    });
    return cols;
  })();

  const updateEpicStateMutation = useMutation({
    mutationFn: async ({ epicId, state }: { epicId: string; state: any }) => {
      const { error } = await supabase
        .from('epics')
        .update({ state: state as any })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic state updated');
    },
    onError: () => {
      toast.error('Failed to update epic state');
    }
  });

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination || source.droppableId === destination.droppableId) {
      return;
    }

    const newState = destination.droppableId;
    updateEpicStateMutation.mutate({ epicId: draggableId, state: newState });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATE_COLUMNS.map(column => (
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
  );
}
