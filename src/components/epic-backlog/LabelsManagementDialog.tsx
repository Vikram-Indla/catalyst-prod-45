import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabelsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LABEL_COLORS = [
  { name: 'Red', value: 'red', bg: 'bg-red-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500' },
  { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-500' },
  { name: 'Green', value: 'green', bg: 'bg-green-500' },
  { name: 'Teal', value: 'teal', bg: 'bg-teal-500' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-workitem-theme' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500' },
  { name: 'Gray', value: 'gray', bg: 'bg-gray-500' },
];

export function LabelsManagementDialog({ open, onOpenChange }: LabelsManagementDialogProps) {
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: labels } = useQuery({
    queryKey: ['epic-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_labels')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await supabase
        .from('epic_labels')
        .insert({ name, color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-labels'] });
      setNewLabelName('');
      setSelectedColor('blue');
      toast({ title: 'Label created' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create label',
        variant: 'destructive',
      });
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from('epic_labels')
        .update({ name, color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-labels'] });
      setEditingId(null);
      toast({ title: 'Label updated' });
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epic_labels')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-labels'] });
      toast({ title: 'Label deleted' });
    },
  });

  const handleCreate = () => {
    if (!newLabelName.trim()) return;
    createLabel.mutate({ name: newLabelName.trim(), color: selectedColor });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Create New Label */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Create New Label</h3>
            <div className="flex gap-3">
              <Input
                placeholder="Label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1"
              />
              <div className="flex gap-2">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.bg,
                      selectedColor === color.value && "ring-2 ring-offset-2 ring-primary"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
              <Button onClick={handleCreate} disabled={!newLabelName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Labels */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Existing Labels</h3>
            <div className="border rounded-lg divide-y max-h-[400px] overflow-auto">
              {labels?.map((label) => (
                <div key={label.id} className="p-3 flex items-center justify-between gap-3">
                  {editingId === label.id ? (
                    <>
                      <Input
                        defaultValue={label.name}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== label.name) {
                            updateLabel.mutate({
                              id: label.id,
                              name: e.target.value.trim(),
                              color: label.color,
                            });
                          } else {
                            setEditingId(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn("w-4 h-4 rounded-full", `bg-${label.color}-500`)} />
                        <span className="font-medium">{label.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(label.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLabel.mutate(label.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(!labels || labels.length === 0) && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No labels created yet
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
