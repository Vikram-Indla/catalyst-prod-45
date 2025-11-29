import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Feature {
  id: string;
  display_id?: string;
  name: string;
  status: string;
  health?: string;
  progress_pct?: number;
  estimate_points?: number;
  epics?: { name: string };
}

interface FeaturesKanbanViewProps {
  features: Feature[];
  onFeatureSelect: (id: string) => void;
  onRefetch: () => void;
}

const KANBAN_COLUMNS = [
  { id: 'funnel', label: 'Funnel', color: 'bg-muted' },
  { id: 'analyzing', label: 'Analyzing', color: 'bg-warning' },
  { id: 'backlog', label: 'Backlog', color: 'bg-primary' },
  { id: 'implementing', label: 'Implementing', color: 'bg-workitem-theme' },
  { id: 'validating', label: 'Validating', color: 'bg-warning-600' },
  { id: 'deploying', label: 'Deploying', color: 'bg-info' },
  { id: 'done', label: 'Done', color: 'bg-success' },
];

export function FeaturesKanbanView({ features, onFeatureSelect, onRefetch }: FeaturesKanbanViewProps) {
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const featureId = result.draggableId;
    const newStatus = result.destination.droppableId;

    try {
      const { error } = await supabase
        .from('features')
        .update({ status: newStatus as any })
        .eq('id', featureId);

      if (error) throw error;

      toast.success('Feature status updated');
      onRefetch();
    } catch (error) {
      console.error('Error updating feature status:', error);
      toast.error('Failed to update feature status');
    }
  };

  const getFeaturesByStatus = (status: string) => {
    return features.filter(f => f.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(column => {
          const columnFeatures = getFeaturesByStatus(column.id);
          return (
            <div key={column.id} className="flex-shrink-0 w-[320px]">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", column.color)} />
                      <CardTitle className="text-sm font-medium">{column.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {columnFeatures.length}
                    </Badge>
                  </div>
                </CardHeader>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[200px] transition-colors",
                        snapshot.isDraggingOver && "bg-accent/5"
                      )}
                    >
                      {columnFeatures.map((feature, index) => (
                        <Draggable key={feature.id} draggableId={feature.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-pointer hover:shadow-md transition-shadow",
                                snapshot.isDragging && "shadow-lg rotate-2"
                              )}
                              onClick={() => onFeatureSelect(feature.id)}
                            >
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-medium line-clamp-2">{feature.name}</span>
                                  {feature.health && <HealthBadge health={feature.health as any} />}
                                </div>
                                
                                {feature.display_id && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {feature.display_id}
                                  </div>
                                )}

                                {feature.epics?.name && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    Epic: {feature.epics.name}
                                  </div>
                                )}

                                {typeof feature.progress_pct === 'number' && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Progress</span>
                                      <span className="font-medium">{feature.progress_pct}%</span>
                                    </div>
                                    <Progress value={feature.progress_pct} className="h-1" />
                                  </div>
                                )}

                                {feature.estimate_points && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Points</span>
                                    <Badge variant="outline" className="text-xs">
                                      {feature.estimate_points}
                                    </Badge>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columnFeatures.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          Drop features here
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
