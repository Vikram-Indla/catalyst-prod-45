import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Database } from '@/integrations/supabase/types';

type StoryStatus = Database['public']['Enums']['story_status'];

export default function SprintBoard() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [swimlaneByAssignee, setSwimlaneByAssignee] = useState(false);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .eq('team_id', selectedTeamId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  const { data: stories } = useQuery({
    queryKey: ['stories', selectedSprintId],
    queryFn: async () => {
      if (!selectedSprintId) return [];
      const { data, error } = await supabase
        .from('stories')
        .select('*, features(name)')
        .eq('sprint_id', selectedSprintId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSprintId,
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const storyId = result.draggableId;
    const newStatus = result.destination.droppableId as StoryStatus;

    await supabase
      .from('stories')
      .update({ status: newStatus })
      .eq('id', storyId);
  };

  const columns: { status: StoryStatus; title: string }[] = [
    { status: 'todo', title: 'To Do' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'done', title: 'Done' },
  ];

  const getStoriesByStatus = (status: StoryStatus, assigneeId?: string) => {
    return stories?.filter(s => {
      const matchesStatus = s.status === status;
      if (!swimlaneByAssignee || !assigneeId) return matchesStatus;
      return matchesStatus && s.assignee_id === assigneeId;
    }) || [];
  };

  const getUniqueAssignees = () => {
    const assignees = stories?.filter(s => s.assignee_id).map(s => s.assignee_id);
    return [...new Set(assignees)];
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sprint Board</h1>
          <p className="text-muted-foreground">Manage sprint work items</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="swimlane-mode"
            checked={swimlaneByAssignee}
            onCheckedChange={setSwimlaneByAssignee}
          />
          <Label htmlFor="swimlane-mode">Swimlane by Assignee</Label>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Team" />
          </SelectTrigger>
          <SelectContent>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSprintId} onValueChange={setSelectedSprintId} disabled={!selectedTeamId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints?.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSprintId && (
        <DragDropContext onDragEnd={handleDragEnd}>
          {swimlaneByAssignee ? (
            <div className="space-y-6">
              {getUniqueAssignees().map((assigneeId) => (
                <div key={assigneeId} className="space-y-2">
                  <h3 className="text-lg font-semibold">Assignee {assigneeId?.slice(0, 8)}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {columns.map((column) => (
                      <Droppable key={column.status} droppableId={column.status}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="p-4 min-h-[200px]"
                          >
                            <h4 className="font-medium mb-3">{column.title}</h4>
                            <div className="space-y-2">
                              {getStoriesByStatus(column.status, assigneeId).map((story, index) => (
                                <Draggable key={story.id} draggableId={story.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="p-3 bg-card border rounded-lg space-y-2"
                                    >
                                      <div className="font-medium text-sm line-clamp-2">{story.name}</div>
                                      <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-xs">
                                          {story.features?.name}
                                        </Badge>
                                        {story.estimate_points && (
                                          <Badge variant="secondary" className="text-xs">
                                            {story.estimate_points} pts
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </Card>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {columns.map((column) => (
                <Droppable key={column.status} droppableId={column.status}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="p-4 min-h-[600px]"
                    >
                      <h4 className="font-medium mb-4 flex items-center justify-between">
                        <span>{column.title}</span>
                        <Badge variant="secondary">
                          {getStoriesByStatus(column.status).length}
                        </Badge>
                      </h4>
                      <div className="space-y-2">
                        {getStoriesByStatus(column.status).map((story, index) => (
                          <Draggable key={story.id} draggableId={story.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="p-3 bg-card border rounded-lg space-y-2"
                              >
                                <div className="font-medium text-sm line-clamp-2">{story.name}</div>
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs">
                                    {story.features?.name}
                                  </Badge>
                                  {story.estimate_points && (
                                    <Badge variant="secondary" className="text-xs">
                                      {story.estimate_points} pts
                                    </Badge>
                                  )}
                                </div>
                                {story.assignee_id && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-xs">
                                        {story.assignee_id.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </Card>
                  )}
                </Droppable>
              ))}
            </div>
          )}
        </DragDropContext>
      )}
    </div>
  );
}
