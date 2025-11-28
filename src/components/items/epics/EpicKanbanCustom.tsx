import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Settings, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Epic {
  id: string;
  name: string;
  epic_key?: string;
  state: string;
  health?: string;
  strategic_themes?: { name: string };
  owner_id?: string;
  owner_name?: string;
  estimate?: number;
  custom_column_id?: string;
}

interface Column {
  id: string;
  column_id: string;
  label: string;
  color: string;
  wip_limit: number | null;
}

interface EpicKanbanCustomProps {
  epics: Epic[];
  onEpicClick: (epicId: string) => void;
  onContextMenu: (epic: Epic, e: React.MouseEvent) => void;
  onConfigureColumns?: () => void;
}

export function EpicKanbanCustom({ epics, onEpicClick, onContextMenu }: EpicKanbanCustomProps) {
  const queryClient = useQueryClient();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6B7280');

  // Fetch user's custom columns
  const { data: customColumns = [], isLoading: isLoadingColumns } = useQuery({
    queryKey: ['epic-custom-columns'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('epic_custom_columns')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (error) throw error;
      return data as Column[];
    },
  });

  // Default columns if none exist
  const columns = customColumns.length > 0
    ? customColumns
    : [
        { id: 'new', column_id: 'new', label: 'New', color: '#94A3B8', wip_limit: null },
        { id: 'in_progress', column_id: 'in_progress', label: 'In Progress', color: '#3B82F6', wip_limit: null },
        { id: 'review', column_id: 'review', label: 'Review', color: '#F59E0B', wip_limit: null },
        { id: 'completed', column_id: 'completed', label: 'Completed', color: '#10B981', wip_limit: null },
      ];

  const columnEpics: Record<string, Epic[]> = {};
  columns.forEach(col => {
    columnEpics[col.column_id] = epics.filter(e => e.custom_column_id === col.column_id || (!e.custom_column_id && col.column_id === 'new'));
  });

  const addColumnMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('epic_custom_columns').insert({
        user_id: user.id,
        column_id: newColumnLabel.toLowerCase().replace(/\s+/g, '_'),
        label: newColumnLabel,
        color: newColumnColor,
        position: columns.length,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-custom-columns'] });
      setNewColumnLabel('');
      setNewColumnColor('#6B7280');
      toast.success('Column added');
    },
    onError: () => toast.error('Failed to add column'),
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const { error } = await supabase
        .from('epic_custom_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-custom-columns'] });
      toast.success('Column deleted');
    },
    onError: () => toast.error('Failed to delete column'),
  });

  const updateEpicColumnMutation = useMutation({
    mutationFn: async ({ epicId, columnId }: { epicId: string; columnId: string }) => {
      // Store custom column in a JSON field or create a separate table
      // For now, we'll use a placeholder - in production, add a custom_columns table
      const { error } = await supabase
        .from('epics')
        .update({ state: columnId as any })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic column updated');
    },
    onError: () => {
      toast.error('Failed to update epic column');
    }
  });

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination || source.droppableId === destination.droppableId) {
      return;
    }

    const newColumnId = destination.droppableId;
    updateEpicColumnMutation.mutate({ epicId: draggableId, columnId: newColumnId });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Custom Columns View</h3>
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure Columns
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure Custom Columns</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="font-medium">Current Columns</h3>
                <div className="space-y-2">
                  {columns.map((col) => (
                    <div key={col.column_id} className="flex items-center gap-2 p-2 border rounded">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: col.color }} />
                      <span className="flex-1">{col.label}</span>
                      {col.wip_limit && (
                        <Badge variant="secondary" className="text-xs">
                          WIP: {col.wip_limit}
                        </Badge>
                      )}
                      {customColumns.length > 0 && (
                        <Button size="icon" variant="ghost" onClick={() => deleteColumnMutation.mutate(col.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Add New Column</h3>
                <div className="grid gap-4">
                  <div>
                    <Label>Column Name</Label>
                    <Input
                      value={newColumnLabel}
                      onChange={(e) => setNewColumnLabel(e.target.value)}
                      placeholder="Enter column name"
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input type="color" value={newColumnColor} onChange={(e) => setNewColumnColor(e.target.value)} />
                  </div>
                  <Button onClick={() => addColumnMutation.mutate()} disabled={!newColumnLabel}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <div key={column.column_id} className="flex-shrink-0 w-80">
              <div className="rounded-t-lg p-3" style={{ backgroundColor: column.color }}>
                <h3 className="font-semibold text-sm">{column.label}</h3>
                <span className="text-xs text-muted-foreground">
                  {columnEpics[column.column_id]?.length || 0} epics
                </span>
              </div>
              <Droppable droppableId={column.column_id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] p-2 bg-muted/30 rounded-b-lg ${
                      snapshot.isDraggingOver ? 'bg-muted/50' : ''
                    }`}
                  >
                    {columnEpics[column.column_id]?.map((epic, index) => (
                      <Draggable key={epic.id} draggableId={epic.id} index={index}>
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
