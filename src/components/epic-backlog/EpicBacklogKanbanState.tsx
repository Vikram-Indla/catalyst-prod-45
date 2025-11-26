import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  state: string;
  points_estimate?: number;
}

interface EpicBacklogKanbanStateProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
}

const STATES = [
  { key: 'not_started', label: 'Not Started', color: 'bg-gray-100' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100' },
  { key: 'accepted', label: 'Accepted', color: 'bg-green-100' },
];

export function EpicBacklogKanbanState({ epics, onEpicSelect, onRefetch }: EpicBacklogKanbanStateProps) {
  const { toast } = useToast();

  const updateStateMutation = useMutation({
    mutationFn: async ({ epicId, newState }: { epicId: string; newState: 'not_started' | 'in_progress' | 'accepted' }) => {
      const { error } = await supabase
        .from('epics')
        .update({ state: newState as any })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic state updated' });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const epicId = result.draggableId;
    const newState = result.destination.droppableId;
    
    updateStateMutation.mutate({ epicId, newState });
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-3 gap-4 h-full">
          {STATES.map((state) => {
            const stateEpics = epics.filter(e => e.state === state.key);
            return (
              <div key={state.key} className="flex flex-col">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{state.label}</h3>
                  <p className="text-sm text-muted-foreground">{stateEpics.length} epics</p>
                </div>
                <Droppable droppableId={state.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 p-4 rounded-lg ${state.color} ${
                        snapshot.isDraggingOver ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      {stateEpics.map((epic, index) => (
                        <Draggable key={epic.id} draggableId={epic.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                              onClick={() => onEpicSelect(epic.id)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <span className="font-medium text-sm">{epic.name}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{epic.epic_key || epic.id.slice(0, 8)}</span>
                                  {epic.points_estimate && (
                                    <Badge variant="outline">{epic.points_estimate} pts</Badge>
                                  )}
                                </div>
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
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
