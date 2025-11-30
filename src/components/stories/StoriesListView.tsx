// Stories List View with Multi-Level Ranking Support
// Based on Jira Align specification for story backlog ranking
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoryWithRelations, STORY_STATUS_LABELS } from '@/types/story.types';
import { useWorkItemRanking, RankingContext } from '@/hooks/useWorkItemRanking';
import { StoriesRankingIndicator } from './StoriesRankingIndicator';

interface StoriesListViewProps {
  stories: StoryWithRelations[];
  selectedRows: Set<string>;
  onRowClick: (story: StoryWithRelations) => void;
  onRowSelect: (storyId: string) => void;
  context: RankingContext;
  isFilterActive?: boolean;
}

export function StoriesListView({
  stories,
  selectedRows,
  onRowClick,
  onRowSelect,
  context,
  isFilterActive = false
}: StoriesListViewProps) {
  const { batchUpdateRankings, fetchRanking, isRanking } = useWorkItemRanking('story', ['all-stories']);
  const [storiesWithRanks, setStoriesWithRanks] = useState<Array<StoryWithRelations & { displayRank: number | null }>>([]);

  // Fetch rankings for all stories in current context
  useEffect(() => {
    const loadRankings = async () => {
      const withRanks = await Promise.all(
        stories.map(async (story) => {
          const rank = await fetchRanking(story.id, context);
          return { ...story, displayRank: rank };
        })
      );
      
      // Sort by rank if available, otherwise preserve order
      const sorted = withRanks.sort((a, b) => {
        if (a.displayRank === null && b.displayRank === null) return 0;
        if (a.displayRank === null) return 1;
        if (b.displayRank === null) return -1;
        return a.displayRank - b.displayRank;
      });
      
      setStoriesWithRanks(sorted);
    };

    loadRankings();
  }, [stories, context, fetchRanking]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || isFilterActive) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    // Reorder locally
    const reordered = Array.from(storiesWithRanks);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, moved);

    // Update local state immediately
    setStoriesWithRanks(reordered);

    // Prepare rank updates
    const updates = reordered.map((story, index) => ({
      workItemId: story.id,
      newRank: index + 1
    }));

    // Save to database
    await batchUpdateRankings(updates, context);
  };

  const isDragDisabled = isFilterActive || isRanking;

  return (
    <div className="space-y-4">
      {/* Ranking Context Indicator */}
      <div className="flex items-center justify-between px-1">
        <StoriesRankingIndicator
          context={context}
          rank={null}
          isFilterActive={isFilterActive}
        />
        {!isFilterActive && (
          <span className="text-xs text-muted-foreground">
            Drag stories to reorder priority
          </span>
        )}
      </div>

      <div className="border rounded-lg bg-card">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                {!isDragDisabled && (
                  <TableHead className="w-12"></TableHead>
                )}
                <TableHead className="w-12">
                  <Checkbox />
                </TableHead>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Story</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Sprint</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <Droppable droppableId="stories-list">
              {(provided) => (
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {storiesWithRanks.map((story, index) => (
                    <Draggable
                      key={story.id}
                      draggableId={story.id}
                      index={index}
                      isDragDisabled={isDragDisabled}
                    >
                      {(provided, snapshot) => (
                        <TableRow
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "cursor-pointer",
                            snapshot.isDragging && "shadow-lg bg-accent/50",
                            isDragDisabled && "opacity-60"
                          )}
                          onClick={() => onRowClick(story)}
                        >
                          {!isDragDisabled && (
                            <TableCell {...provided.dragHandleProps} onClick={(e) => e.stopPropagation()}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          )}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(story.id)}
                              onCheckedChange={() => onRowSelect(story.id)}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {story.displayRank || '-'}
                          </TableCell>
                          <TableCell className="font-medium">{story.name}</TableCell>
                          <TableCell>{story.features?.name || '-'}</TableCell>
                          <TableCell>{story.iterations?.name || 'Backlog'}</TableCell>
                          <TableCell>{story.teams?.name || '-'}</TableCell>
                          <TableCell>{story.estimate_points || '-'}</TableCell>
                          <TableCell>Unassigned</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {story.status ? STORY_STATUS_LABELS[story.status as keyof typeof STORY_STATUS_LABELS] : 'To Do'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {storiesWithRanks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isDragDisabled ? 9 : 10} className="text-center text-muted-foreground py-8">
                        No stories found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              )}
            </Droppable>
          </Table>
        </DragDropContext>
      </div>
    </div>
  );
}
