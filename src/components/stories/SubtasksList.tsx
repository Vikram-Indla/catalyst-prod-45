// Subtasks List - manage child subtasks for a story
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Trash2, Edit2, CheckCircle2, Circle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubtasksListProps {
  storyId: string;
}

export function SubtasksList({ storyId }: SubtasksListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: subtasks, isLoading } = useQuery({
    queryKey: ['subtasks', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('subtasks')
        .insert({
          story_id: storyId,
          name,
          status: 'todo',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', storyId] });
      setNewSubtaskName('');
      setIsAdding(false);
      toast.success('Subtask added');
    },
    onError: () => {
      toast.error('Failed to add subtask');
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', storyId] });
      setEditingId(null);
      toast.success('Subtask updated');
    },
    onError: () => {
      toast.error('Failed to update subtask');
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', storyId] });
      setDeleteId(null);
      toast.success('Subtask deleted');
    },
    onError: () => {
      toast.error('Failed to delete subtask');
    },
  });

  const handleAddSubtask = () => {
    if (newSubtaskName.trim()) {
      addSubtaskMutation.mutate(newSubtaskName.trim());
    }
  };

  const handleToggleStatus = (subtask: any) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    updateSubtaskMutation.mutate({
      id: subtask.id,
      updates: { status: newStatus },
    });
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      updateSubtaskMutation.mutate({
        id,
        updates: { name: editingName.trim() },
      });
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading subtasks...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Add Subtask */}
      {!isAdding ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Subtask
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Subtask name..."
            value={newSubtaskName}
            onChange={(e) => setNewSubtaskName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleAddSubtask}
            disabled={!newSubtaskName.trim() || addSubtaskMutation.isPending}
          >
            Add
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsAdding(false);
              setNewSubtaskName('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-2">
        {subtasks && subtasks.length > 0 ? (
          subtasks.map((subtask: any) => (
            <div
              key={subtask.id}
              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/5"
            >
              {/* Status Toggle */}
              <button
                onClick={() => handleToggleStatus(subtask)}
                className="flex-shrink-0"
              >
                {subtask.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Name */}
              {editingId === subtask.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(subtask.id)}
                  onBlur={() => handleSaveEdit(subtask.id)}
                  className="flex-1 h-8"
                  autoFocus
                />
              ) : (
                <span
                  className={`flex-1 text-sm ${
                    subtask.status === 'done' ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {subtask.name}
                </span>
              )}

              {/* Status Badge */}
              <Badge
                variant={subtask.status === 'done' ? 'default' : 'outline'}
                className="text-xs"
              >
                {subtask.status === 'done' ? 'Done' : 'To Do'}
              </Badge>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingId(subtask.id);
                      setEditingName(subtask.name);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteId(subtask.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No subtasks yet. Click "Add Subtask" to create one.
          </p>
        )}
      </div>

      {/* Summary */}
      {subtasks && subtasks.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            {subtasks.filter((s: any) => s.status === 'done').length} of {subtasks.length} completed
          </span>
          <span>
            {Math.round((subtasks.filter((s: any) => s.status === 'done').length / subtasks.length) * 100)}% done
          </span>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtask</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subtask? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteSubtaskMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
