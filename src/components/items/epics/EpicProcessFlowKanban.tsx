import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { MoreVertical, Clock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Epic {
  id: string;
  name: string;
  epic_key?: string;
  process_step_id?: string;
  process_step_entered_at?: string;
  health?: string;
  strategic_themes?: { name: string };
  owner_id?: string;
  owner_name?: string;
  estimate?: number;
}

interface EpicProcessFlowKanbanProps {
  epics: Epic[];
  onEpicClick: (epicId: string) => void;
  onContextMenu: (epic: Epic, e: React.MouseEvent) => void;
}

export function EpicProcessFlowKanban({ epics, onEpicClick, onContextMenu }: EpicProcessFlowKanbanProps) {
  const queryClient = useQueryClient();

  const { data: processSteps } = useQuery({
    queryKey: ['process-steps'],
    queryFn: async () => {
      const { data: flows } = await supabase
        .from('process_flows')
        .select('id')
        .limit(1)
        .single();
      
      if (!flows) return [];

      const { data, error } = await supabase
        .from('process_steps')
        .select('*')
        .eq('process_flow_id', flows.id)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });

  const [columns, setColumns] = useState<Record<string, Epic[]>>({});

  useEffect(() => {
    if (!processSteps) return;

    const cols: Record<string, Epic[]> = {};
    processSteps.forEach(step => {
      cols[step.id] = epics.filter(e => e.process_step_id === step.id);
    });

    // Unassigned epics
    cols['unassigned'] = epics.filter(e => !e.process_step_id);

    setColumns(cols);
  }, [epics, processSteps]);

  const updateEpicProcessStepMutation = useMutation({
    mutationFn: async ({ epicId, stepId }: { epicId: string; stepId: string | null }) => {
      const { error } = await supabase
        .from('epics')
        .update({ 
          process_step_id: stepId,
          process_step_entered_at: stepId ? new Date().toISOString() : null
        })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic process step updated');
    },
    onError: () => {
      toast.error('Failed to update epic process step');
    }
  });

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination || source.droppableId === destination.droppableId) {
      return;
    }

    const newStepId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
    updateEpicProcessStepMutation.mutate({ epicId: draggableId, stepId: newStepId });

    // Optimistic update
    setColumns(prev => {
      const newCols = { ...prev };
      const sourceItems = [...newCols[source.droppableId]];
      const destItems = [...newCols[destination.droppableId]];
      const [movedItem] = sourceItems.splice(source.index, 1);
      movedItem.process_step_id = newStepId || undefined;
      movedItem.process_step_entered_at = new Date().toISOString();
      destItems.splice(destination.index, 0, movedItem);
      
      newCols[source.droppableId] = sourceItems;
      newCols[destination.droppableId] = destItems;
      return newCols;
    });
  };

  const getTimeInStep = (enteredAt?: string) => {
    if (!enteredAt) return null;
    return formatDistanceToNow(new Date(enteredAt), { addSuffix: true });
  };

  if (!processSteps) return <div>Loading process flow...</div>;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Unassigned Column */}
        <div className="flex-shrink-0 w-80">
          <div className="rounded-t-lg p-3 bg-slate-200">
            <h3 className="font-semibold text-sm">Unassigned</h3>
            <span className="text-xs text-muted-foreground">
              {columns['unassigned']?.length || 0} epics
            </span>
          </div>
          <Droppable droppableId="unassigned">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[200px] p-2 bg-muted/30 rounded-b-lg ${
                  snapshot.isDraggingOver ? 'bg-muted/50' : ''
                }`}
              >
                {columns['unassigned']?.map((epic, index) => (
                  <EpicCard
                    key={epic.id}
                    epic={epic}
                    index={index}
                    onEpicClick={onEpicClick}
                    onContextMenu={onContextMenu}
                    timeInStep={getTimeInStep(epic.process_step_entered_at)}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Process Step Columns */}
        {processSteps.map(step => (
          <div key={step.id} className="flex-shrink-0 w-80">
            <div className="rounded-t-lg p-3 bg-primary/10">
              <h3 className="font-semibold text-sm">{step.name}</h3>
              <span className="text-xs text-muted-foreground">
                {columns[step.id]?.length || 0} epics
              </span>
            </div>
            <Droppable droppableId={step.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[200px] p-2 bg-muted/30 rounded-b-lg ${
                    snapshot.isDraggingOver ? 'bg-muted/50' : ''
                  }`}
                >
                  {columns[step.id]?.map((epic, index) => (
                    <EpicCard
                      key={epic.id}
                      epic={epic}
                      index={index}
                      onEpicClick={onEpicClick}
                      onContextMenu={onContextMenu}
                      timeInStep={getTimeInStep(epic.process_step_entered_at)}
                    />
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

function EpicCard({ epic, index, onEpicClick, onContextMenu, timeInStep }: {
  epic: Epic;
  index: number;
  onEpicClick: (id: string) => void;
  onContextMenu: (epic: Epic, e: React.MouseEvent) => void;
  timeInStep: string | null;
}) {
  return (
    <Draggable draggableId={epic.id} index={index}>
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
          {timeInStep && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Clock className="h-3 w-3" />
              {timeInStep}
            </div>
          )}
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
  );
}
