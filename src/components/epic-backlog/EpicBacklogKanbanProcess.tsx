import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  process_step_id?: string;
  process_step_entered_at?: string;
  process_flow_entered_at?: string;
  points_estimate?: number;
}

interface EpicBacklogKanbanProcessProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
}

export function EpicBacklogKanbanProcess({ epics, onEpicSelect, onRefetch }: EpicBacklogKanbanProcessProps) {
  const { toast } = useToast();
  const [showExitCriteria, setShowExitCriteria] = useState(false);

  const { data: processFlows } = useQuery({
    queryKey: ['process-flows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_flows')
        .select('*, process_steps(*)')
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
  });

  const updateEpicProcessStep = useMutation({
    mutationFn: async ({ epicId, processStepId }: { epicId: string; processStepId: string | null }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('epics')
        .update({ 
          process_step_id: processStepId,
          process_step_entered_at: now,
          process_flow_entered_at: processStepId && !epics.find(e => e.id === epicId)?.process_flow_entered_at ? now : undefined,
        })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Epic process step updated' });
      onRefetch();
    },
    onError: () => {
      toast({ title: 'Failed to update process step', variant: 'destructive' });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const epicId = draggableId;
    const processStepId = destination.droppableId === 'unassigned' ? null : destination.droppableId;

    updateEpicProcessStep.mutate({ epicId, processStepId });
  };

  const calculateDaysInStep = (epic: Epic) => {
    if (!epic.process_step_entered_at) return 0;
    const entered = new Date(epic.process_step_entered_at);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateDaysInFlow = (epic: Epic) => {
    if (!epic.process_flow_entered_at) return 0;
    const entered = new Date(epic.process_flow_entered_at);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
  };

  const unassignedEpics = epics.filter(e => !e.process_step_id);
  const allSteps = processFlows?.flatMap(flow => flow.process_steps || []) || [];

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="px-6 py-3 border-b flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch 
            id="exit-criteria" 
            checked={showExitCriteria}
            onCheckedChange={setShowExitCriteria}
          />
          <Label htmlFor="exit-criteria">Show Exit Criteria</Label>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-6 h-full">
            {/* Unassigned Column */}
            <Droppable droppableId="unassigned">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-muted/50 rounded-lg p-4 min-w-[280px] flex-shrink-0"
                >
                  <div className="text-sm font-medium mb-2">Unassigned ({unassignedEpics.length})</div>
                  {unassignedEpics.map((epic, index) => (
                    <Draggable key={epic.id} draggableId={epic.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <div 
                            className="p-3 mb-2 bg-card border rounded cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => onEpicSelect(epic.id)}
                          >
                            <div className="font-medium">{epic.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {epic.epic_key || epic.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Process Step Columns */}
            {allSteps.map((step: any) => {
              const stepEpics = epics.filter(e => e.process_step_id === step.id);
              return (
                <Droppable key={step.id} droppableId={step.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="bg-muted/50 rounded-lg p-4 min-w-[280px] flex-shrink-0"
                    >
                      <div className="text-sm font-medium mb-2">{step.name} ({stepEpics.length})</div>
                      {showExitCriteria && step.exit_criteria && step.exit_criteria.length > 0 && (
                        <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted rounded">
                          <div className="font-medium mb-1">Exit Criteria:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {step.exit_criteria.map((criteria: string, idx: number) => (
                              <li key={idx}>{criteria}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {stepEpics.map((epic, index) => (
                        <Draggable key={epic.id} draggableId={epic.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div 
                                className="p-3 mb-2 bg-card border rounded cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => onEpicSelect(epic.id)}
                              >
                                <div className="font-medium">{epic.name}</div>
                                <div className="text-sm text-muted-foreground">ID: {epic.epic_key || epic.id.slice(0, 8)}</div>
                                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                  <div>Time in Step: {calculateDaysInStep(epic)} days</div>
                                  <div>Time in Flow: {calculateDaysInFlow(epic)} days</div>
                                </div>
                              </div>
                            </div>
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
    </div>
  );
}
