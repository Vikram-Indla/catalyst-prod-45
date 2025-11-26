import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  points_estimate?: number;
  epic_program_increments?: Array<{ pi_id: string }>;
}

interface EpicBacklogKanbanColumnProps {
  epics: Epic[];
  programIncrements: Array<{ id: string; name: string }>;
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
}

export function EpicBacklogKanbanColumn({ epics, programIncrements, onEpicSelect, onRefetch }: EpicBacklogKanbanColumnProps) {
  const { toast } = useToast();

  const updatePIMutation = useMutation({
    mutationFn: async ({ epicId, piId }: { epicId: string; piId: string | null }) => {
      // Remove existing assignments
      await supabase.from('epic_program_increments').delete().eq('epic_id', epicId);
      
      // Add new assignment if not unassigned
      if (piId) {
        const { error } = await supabase
          .from('epic_program_increments')
          .insert({ epic_id: epicId, pi_id: piId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic PI assignment updated' });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const epicId = result.draggableId;
    const newPIId = result.destination.droppableId === 'unassigned' ? null : result.destination.droppableId;
    
    updatePIMutation.mutate({ epicId, piId: newPIId });
  };

  // Organize epics by PI
  const epicsByPI: Record<string, Epic[]> = { unassigned: [] };
  programIncrements.forEach(pi => {
    epicsByPI[pi.id] = [];
  });

  epics.forEach(epic => {
    const piIds = epic.epic_program_increments?.map(epi => epi.pi_id) || [];
    if (piIds.length === 0) {
      epicsByPI.unassigned.push(epic);
    } else {
      piIds.forEach(piId => {
        if (epicsByPI[piId]) {
          epicsByPI[piId].push(epic);
        }
      });
    }
  });

  return (
    <div className="p-6 h-full overflow-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${programIncrements.length + 1}, minmax(250px, 1fr))` }}>
          {/* Unassigned Column */}
          <div className="flex flex-col">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Unassigned</h3>
              <p className="text-sm text-muted-foreground">{epicsByPI.unassigned.length} epics</p>
            </div>
            <Droppable droppableId="unassigned">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-2 p-4 rounded-lg bg-muted/30 ${
                    snapshot.isDraggingOver ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {epicsByPI.unassigned.map((epic, index) => (
                    <Draggable key={epic.id} draggableId={epic.id} index={index}>
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => onEpicSelect(epic.id)}
                        >
                          <div className="space-y-2">
                            <span className="font-medium text-sm block">{epic.name}</span>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{epic.epic_key || epic.id.slice(0, 8)}</span>
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

          {/* PI Columns */}
          {programIncrements.map((pi) => {
            const piEpics = epicsByPI[pi.id] || [];
            return (
              <div key={pi.id} className="flex flex-col">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{pi.name}</h3>
                  <p className="text-sm text-muted-foreground">{piEpics.length} epics</p>
                </div>
                <Droppable droppableId={pi.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 p-4 rounded-lg bg-blue-50 ${
                        snapshot.isDraggingOver ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      {piEpics.map((epic, index) => (
                        <Draggable key={epic.id} draggableId={epic.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => onEpicSelect(epic.id)}
                            >
                              <div className="space-y-2">
                                <span className="font-medium text-sm block">{epic.name}</span>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{epic.epic_key || epic.id.slice(0, 8)}</span>
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
