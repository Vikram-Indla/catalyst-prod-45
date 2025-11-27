import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface CustomColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLUMN_COLORS = [
  { name: 'Gray', value: 'gray' },
  { name: 'Red', value: 'red' },
  { name: 'Orange', value: 'orange' },
  { name: 'Yellow', value: 'yellow' },
  { name: 'Green', value: 'green' },
  { name: 'Blue', value: 'blue' },
  { name: 'Purple', value: 'purple' },
];

export function CustomColumnsDialog({ open, onOpenChange }: CustomColumnsDialogProps) {
  const [newColumnName, setNewColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState('gray');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: columns, refetch } = useQuery({
    queryKey: ['process-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_steps')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const createColumn = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const maxOrder = Math.max(0, ...(columns?.map(c => c.sort_order || 0) || []));
      const { error } = await supabase
        .from('process_steps')
        .insert({ 
          name, 
          exit_criteria: color,
          sort_order: maxOrder + 1,
          process_flow_id: 'default-flow'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      setNewColumnName('');
      setSelectedColor('gray');
      toast({ title: 'Column created' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create column',
        variant: 'destructive',
      });
    },
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('process_steps')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({ title: 'Column deleted' });
    },
  });

  const reorderColumns = useMutation({
    mutationFn: async (reorderedColumns: any[]) => {
      const updates = reorderedColumns.map((col, index) => 
        supabase
          .from('process_steps')
          .update({ sort_order: index })
          .eq('id', col.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      refetch();
      toast({ title: 'Column order updated' });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !columns) return;

    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderColumns.mutate(items);
  };

  const handleCreate = () => {
    if (!newColumnName.trim()) return;
    createColumn.mutate({ name: newColumnName.trim(), color: selectedColor });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Custom Columns</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Create New Column */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Create New Column</h3>
            <div className="flex gap-3">
              <Input
                placeholder="Column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1"
              />
              <div className="flex gap-1">
                {COLUMN_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-6 h-6 rounded border-2 transition-all",
                      `bg-${color.value}-500`,
                      selectedColor === color.value && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
              <Button onClick={handleCreate} disabled={!newColumnName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Columns */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Existing Columns (drag to reorder)</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="columns">
                {(provided) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="border rounded-lg divide-y max-h-[400px] overflow-auto"
                  >
                    {columns?.map((column, index) => (
                      <Draggable key={column.id} draggableId={column.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "p-3 flex items-center justify-between gap-3",
                              snapshot.isDragging && "bg-accent shadow-lg"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                              </div>
                              <div 
                                className={cn(
                                  "w-4 h-4 rounded", 
                                  `bg-${column.exit_criteria || 'gray'}-500`
                                )} 
                              />
                              <span className="font-medium">{column.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteColumn.mutate(column.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {(!columns || columns.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No custom columns created yet
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
