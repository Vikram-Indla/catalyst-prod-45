import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Settings, AlertCircle } from 'lucide-react';

type StoryStatus = Database['public']['Enums']['story_status'];

interface ColumnConfig {
  status: StoryStatus;
  title: string;
  wipLimit?: number;
}

export default function SprintBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [swimlaneByAssignee, setSwimlaneByAssignee] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { status: 'todo', title: 'To Do', wipLimit: 10 },
    { status: 'in_progress', title: 'In Progress', wipLimit: 5 },
    { status: 'done', title: 'Done' },
  ]);

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
        .select('*, features(name), profiles!stories_assignee_id_fkey(full_name)')
        .eq('sprint_id', selectedSprintId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSprintId,
  });

  const updateStoryMutation = useMutation({
    mutationFn: async ({ storyId, status }: { storyId: string; status: StoryStatus }) => {
      const { error } = await supabase
        .from('stories')
        .update({ status })
        .eq('id', storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast({ title: "Story updated", description: "Status changed successfully" });
    },
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const storyId = result.draggableId;
    const newStatus = result.destination.droppableId as StoryStatus;
    
    // Check WIP limit
    const targetColumn = columns.find(c => c.status === newStatus);
    const currentCount = getStoriesByStatus(newStatus).length;
    
    if (targetColumn?.wipLimit && currentCount >= targetColumn.wipLimit && newStatus !== 'done') {
      toast({
        title: "WIP Limit Exceeded",
        description: `Cannot exceed ${targetColumn.wipLimit} items in ${targetColumn.title}`,
        variant: "destructive",
      });
      return;
    }

    updateStoryMutation.mutate({ storyId, status: newStatus });
  };

  const getStoriesByStatus = (status: StoryStatus, assigneeId?: string) => {
    return stories?.filter(s => {
      const matchesStatus = s.status === status;
      if (!swimlaneByAssignee || !assigneeId) return matchesStatus;
      return matchesStatus && s.assignee_id === assigneeId;
    }) || [];
  };

  const getUniqueAssignees = () => {
    const assignees = stories?.filter(s => s.assignee_id).map(s => ({
      id: s.assignee_id,
      name: (s.profiles as any)?.full_name || 'Unassigned'
    }));
    const uniqueMap = new Map();
    assignees?.forEach(a => uniqueMap.set(a.id, a));
    return Array.from(uniqueMap.values());
  };

  const renderStoryCard = (story: any) => (
    <div className="p-3 bg-card border rounded-lg space-y-2 hover:shadow-md transition-shadow">
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
              {((story.profiles as any)?.full_name || 'U').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {(story.profiles as any)?.full_name || 'Unassigned'}
          </span>
        </div>
      )}
    </div>
  );

  const renderColumn = (column: ColumnConfig, assigneeId?: string) => {
    const columnStories = getStoriesByStatus(column.status, assigneeId);
    const isOverLimit = column.wipLimit && columnStories.length > column.wipLimit;

    return (
      <Droppable key={`${column.status}-${assigneeId || 'all'}`} droppableId={column.status}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-4 min-h-[400px] ${snapshot.isDraggingOver ? 'bg-accent/5' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <span>{column.title}</span>
                <Badge variant="secondary">{columnStories.length}</Badge>
              </h4>
              {column.wipLimit && (
                <div className={`text-xs flex items-center gap-1 ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {isOverLimit && <AlertCircle className="h-3 w-3" />}
                  <span>Limit: {column.wipLimit}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {columnStories.map((story, index) => (
                <Draggable key={story.id} draggableId={story.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      {renderStoryCard(story)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </Card>
        )}
      </Droppable>
    );
  };

  return (
    <div className="px-[var(--s4)] sm:px-[var(--s6)] lg:px-[var(--s8)] py-[var(--s6)] lg:py-[var(--s8)] space-y-[var(--s6)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--s4)]">
        <div>
          <h1 className="text-3xl font-bold">Sprint Board</h1>
          <p className="text-muted-foreground">Manage sprint work items with WIP limits</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[var(--s4)]">
          <div className="flex items-center gap-[var(--s2)]">
            <Switch
              id="swimlane-mode"
              checked={swimlaneByAssignee}
              onCheckedChange={setSwimlaneByAssignee}
            />
            <Label htmlFor="swimlane-mode">Swimlane by Assignee</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-[var(--s4)]">
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
            <div className="space-y-[var(--s6)]">
              {getUniqueAssignees().map((assignee) => (
                <div key={assignee.id} className="space-y-[var(--s2)]">
                  <h3 className="text-lg font-semibold flex items-center gap-[var(--s2)]">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {assignee.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {assignee.name}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--s4)]">
                    {columns.map((column) => renderColumn(column, assignee.id))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--s4)]">
              {columns.map((column) => renderColumn(column))}
            </div>
          )}
        </DragDropContext>
      )}

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Board Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-[var(--s4)]">
            {columns.map((column, index) => (
              <div key={column.status} className="space-y-[var(--s2)]">
                <Label>{column.title}</Label>
                <div className="flex gap-[var(--s2)]">
                  <Input
                    value={column.title}
                    onChange={(e) => {
                      const newColumns = [...columns];
                      newColumns[index].title = e.target.value;
                      setColumns(newColumns);
                    }}
                    placeholder="Column name"
                  />
                  <Input
                    type="number"
                    value={column.wipLimit || ''}
                    onChange={(e) => {
                      const newColumns = [...columns];
                      newColumns[index].wipLimit = e.target.value ? parseInt(e.target.value) : undefined;
                      setColumns(newColumns);
                    }}
                    placeholder="WIP limit"
                    className="w-32"
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setConfigDialogOpen(false)}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}