// ==============================================
// MANAGE BACKLOG BOARD (Kanban)
// Based on Jira Align Ideation Manage Backlog
// ==============================================

import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateIdea } from '@/hooks/useIdeation';
import { toast } from 'sonner';
import type { Idea, IdeaStatus, TShirtSize } from '@/types/ideation';
import { IDEA_STATUS_COLORS, T_SHIRT_SIZE_ORDER } from '@/types/ideation';

interface ManageBacklogBoardProps {
  ideas: Idea[];
  onIdeaClick: (idea: Idea) => void;
}

const COLUMNS: { id: IdeaStatus; title: string; color: string }[] = [
  { id: 'New', title: 'New', color: 'border-t-blue-500' },
  { id: 'Open', title: 'Open', color: 'border-t-amber-500' },
  { id: 'Planned', title: 'Planned', color: 'border-t-purple-500' },
  { id: 'Completed', title: 'Completed', color: 'border-t-green-500' },
];

export function ManageBacklogBoard({ ideas, onIdeaClick }: ManageBacklogBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const updateIdea = useUpdateIdea();

  const filteredIdeas = useMemo(() => {
    if (!searchQuery.trim()) return ideas;
    const query = searchQuery.toLowerCase();
    return ideas.filter(
      (idea) =>
        idea.title.toLowerCase().includes(query) ||
        idea.description.toLowerCase().includes(query)
    );
  }, [ideas, searchQuery]);

  const columnIdeas = useMemo(() => {
    const grouped: Record<IdeaStatus, Idea[]> = {
      New: [],
      Open: [],
      Planned: [],
      Completed: [],
      Shelved: [],
    };
    filteredIdeas.forEach((idea) => {
      if (grouped[idea.status]) {
        grouped[idea.status].push(idea);
      }
    });
    return grouped;
  }, [filteredIdeas]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as IdeaStatus;

    try {
      await updateIdea.mutateAsync({
        id: draggableId,
        status: newStatus,
      });
      toast.success(`Idea moved to ${newStatus}`);
    } catch {
      toast.error('Failed to update idea status');
    }
  };

  const handleConvertToEpic = (idea: Idea) => {
    toast.info(`Converting "${idea.title}" to Epic...`);
    // Implementation would create epic and link to idea
  };

  const handleConvertToFeature = (idea: Idea) => {
    toast.info(`Converting "${idea.title}" to Feature...`);
    // Implementation would create feature and link to idea
  };

  const handleConvertToStory = (idea: Idea) => {
    toast.info(`Converting "${idea.title}" to Story...`);
    // Implementation would create story and link to idea
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-72">
              {/* Column Header */}
              <div
                className={cn(
                  'bg-muted/50 rounded-t-lg p-3 border-t-4',
                  column.color
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{column.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {columnIdeas[column.id].length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'bg-muted/30 rounded-b-lg p-2 min-h-[400px] space-y-2',
                      snapshot.isDraggingOver && 'bg-muted/50'
                    )}
                  >
                    {columnIdeas[column.id].map((idea, index) => (
                      <Draggable key={idea.id} draggableId={idea.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'p-3 cursor-pointer hover:shadow-md transition-shadow',
                              snapshot.isDragging && 'shadow-lg'
                            )}
                            onClick={() => onIdeaClick(idea)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate">
                                  {idea.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {idea.description}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleConvertToEpic(idea)}>
                                    Convert to Epic
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleConvertToFeature(idea)}>
                                    Convert to Feature
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleConvertToStory(idea)}>
                                    Convert to Story
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Edit</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  IDEA_STATUS_COLORS[idea.status as IdeaStatus]
                                )}
                              >
                                {idea.status}
                              </Badge>
                              {idea.t_shirt_size && (
                                <Badge variant="secondary" className="text-xs">
                                  {idea.t_shirt_size}
                                </Badge>
                              )}
                            </div>

                            {/* Score */}
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>Score: {idea.vote_score}</span>
                              <span>
                                {idea.for_votes}↑ {idea.against_votes}↓
                              </span>
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
