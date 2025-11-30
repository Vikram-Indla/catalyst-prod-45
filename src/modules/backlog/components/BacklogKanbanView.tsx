import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { BacklogItem, BacklogMeta } from '../types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface BacklogKanbanViewProps {
  items: BacklogItem[];
  meta?: BacklogMeta;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

export function BacklogKanbanView({
  items,
  meta,
  selectedItems,
  onItemClick,
  onItemSelect,
}: BacklogKanbanViewProps) {
  const queryClient = useQueryClient();
  const states = meta?.states || ['not_started', 'in_progress', 'accepted'];

  const updateStateMutation = useMutation({
    mutationFn: async ({ itemId, newState }: { itemId: string; newState: string }) => {
      const { error } = await supabase
        .from('epics' as any)
        .update({ state: newState } as any)
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('State updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update state: ${error.message}`);
    },
  });

  const getItemsByState = (state: string) => {
    return items.filter((item) => item.state === state);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceState = result.source.droppableId;
    const destState = result.destination.droppableId;

    if (sourceState === destState) return;

    const itemId = result.draggableId;
    updateStateMutation.mutate({ itemId, newState: destState });
  };

  const getStateLabel = (state: string) => {
    const labels: Record<string, string> = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      accepted: 'Accepted',
      funnel: 'Funnel',
      analyzing: 'Analyzing',
      backlog: 'Backlog',
      implementing: 'Implementing',
      validating: 'Validating',
      deploying: 'Deploying',
      done: 'Done',
    };
    return labels[state] || state;
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto h-full">
        {states.map((state) => {
          const stateItems = getItemsByState(state);
          return (
            <div key={state} className="flex-shrink-0 w-[300px]">
              <div className="sticky top-0 bg-background pb-2 z-10">
                <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                  <span className="font-medium text-sm">{getStateLabel(state)}</span>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                    {stateItems.length}
                  </span>
                </div>
              </div>

              <Droppable droppableId={state}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'space-y-2 mt-2 min-h-[200px] p-2 rounded-lg transition-colors',
                      snapshot.isDraggingOver && 'bg-muted/50'
                    )}
                  >
                    {stateItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Card
                              className={cn(
                                'p-3 cursor-pointer hover:shadow-md transition-all',
                                selectedItems.includes(item.id) && 'ring-2 ring-primary',
                                snapshot.isDragging && 'shadow-lg opacity-90 rotate-2'
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onItemClick(item.id);
                              }}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <Checkbox
                                  checked={selectedItems.includes(item.id)}
                                  onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-xs text-muted-foreground mb-1">
                                    {item.displayId || item.id.slice(0, 8)}
                                  </div>
                                  <div className="text-sm font-medium line-clamp-2">
                                    {item.name}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.health && (
                                  <div
                                    className={cn(
                                      'h-2 w-2 rounded-full',
                                      {
                                        green: 'bg-success',
                                        yellow: 'bg-warning',
                                        red: 'bg-destructive',
                                        gray: 'bg-muted-foreground',
                                      }[item.health]
                                    )}
                                  />
                                )}
                                
                                {item.points !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.points} pts
                                  </span>
                                )}

                                {item.mvp && (
                                  <span className="ml-auto px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                                    MVP
                                  </span>
                                )}

                                {item.blocked && (
                                  <span className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded">
                                    Blocked
                                  </span>
                                )}
                              </div>
                            </Card>
                          </div>
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
  );
}
