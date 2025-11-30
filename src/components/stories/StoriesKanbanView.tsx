// Stories Kanban View - reusing patterns from Features/Epics Kanban
// Citation: Catalyst_Stories_PRD_v2.pdf
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StoryWithRelations, STORY_STATUS_COLUMNS } from '@/types/story.types';

interface StoriesKanbanViewProps {
  stories: StoryWithRelations[];
  onStorySelect: (id: string) => void;
  onRefetch: () => void;
}

export function StoriesKanbanView({ stories, onStorySelect, onRefetch }: StoriesKanbanViewProps) {
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const storyId = result.draggableId;
    const newStatus = result.destination.droppableId;

    try {
      const { error } = await supabase
        .from('stories')
        .update({ status: newStatus as any })
        .eq('id', storyId);

      if (error) throw error;

      toast.success('Story status updated');
      onRefetch();
    } catch (error) {
      console.error('Error updating story status:', error);
      toast.error('Failed to update story status');
    }
  };

  const getStoriesByStatus = (status: string) => {
    return stories.filter(s => s.status === status || (!s.status && status === 'todo'));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STORY_STATUS_COLUMNS.map(column => {
          const columnStories = getStoriesByStatus(column.id);
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
                      {columnStories.length}
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
                      {columnStories.map((story, index) => (
                        <Draggable key={story.id} draggableId={story.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-pointer hover:shadow-md transition-shadow",
                                snapshot.isDragging && "shadow-lg rotate-2"
                              )}
                              onClick={() => onStorySelect(story.id)}
                            >
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-medium line-clamp-2">{story.name}</span>
                                </div>

                                {story.features?.name && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    Feature: {story.features.name}
                                  </div>
                                )}

                                {story.teams?.name && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    Team: {story.teams.name}
                                  </div>
                                )}

                                {story.iterations?.name && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    Sprint: {story.iterations.name}
                                  </div>
                                )}

                                {story.estimate_points !== null && story.estimate_points !== undefined && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Points</span>
                                    <Badge variant="outline" className="text-xs">
                                      {story.estimate_points}
                                    </Badge>
                                  </div>
                                )}

                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columnStories.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          Drop stories here
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
