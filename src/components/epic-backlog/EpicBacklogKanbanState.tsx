import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical } from 'lucide-react';

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
  { key: 'not_started', label: 'Not Started', color: 'bg-[#F4F5F7]', textColor: 'text-[#6B778C]' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-[#F4F5F7]', textColor: 'text-[#6B778C]' },
  { key: 'accepted', label: 'Accepted', color: 'bg-[#F4F5F7]', textColor: 'text-[#6B778C]' },
];

const STATE_BORDER_COLORS: Record<string, string> = {
  'not_started': 'border-l-[#DE350B]',
  'in_progress': 'border-l-[#FF8B00]', 
  'accepted': 'border-l-[#0052CC]',
};

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
      toast({ title: 'Epic state updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update epic state', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const epicId = result.draggableId;
    const newState = result.destination.droppableId;
    
    updateStateMutation.mutate({ epicId, newState });
  };

  return (
    <div className="h-full overflow-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Column Headers */}
        <div className="grid grid-cols-3 gap-px bg-border mb-px">
          {STATES.map((state) => {
            const stateEpics = epics.filter(e => e.state === state.key);
            return (
              <div 
                key={state.key} 
                className={`${state.color} px-4 py-3 flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-semibold ${state.textColor}`}>{state.label}</span>
                </div>
                <span className={`text-sm font-semibold ${state.textColor}`}>{stateEpics.length}</span>
              </div>
            );
          })}
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-3 gap-px bg-border min-h-[600px]">
          {STATES.map((state) => {
            const stateEpics = epics.filter(e => e.state === state.key);
            return (
              <Droppable key={state.key} droppableId={state.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-background p-3 space-y-2 ${
                      snapshot.isDraggingOver ? 'bg-muted/50' : ''
                    }`}
                  >
                    {stateEpics.map((epic, index) => (
                      <Draggable key={epic.id} draggableId={epic.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`border-l-4 ${STATE_BORDER_COLORS[state.key]} p-3 cursor-pointer hover:shadow-md transition-all ${
                              snapshot.isDragging ? 'shadow-xl rotate-2' : ''
                            }`}
                            onClick={() => onEpicSelect(epic.id)}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <Checkbox className="mt-0.5" onClick={(e) => e.stopPropagation()} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-primary">
                                      {epic.epic_key || epic.id.slice(0, 8)}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-foreground line-clamp-2">
                                    {epic.name}
                                  </p>
                                </div>
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
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
