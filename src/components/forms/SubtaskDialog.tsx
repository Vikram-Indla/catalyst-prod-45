import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtask?: any;
  storyId?: string;
}

export function SubtaskDialog({ open, onOpenChange, subtask, storyId }: SubtaskDialogProps) {
  const [name, setName] = useState(subtask?.name || '');
  const [description, setDescription] = useState(subtask?.description || '');
  const [status, setStatus] = useState(subtask?.status || 'todo');
  const [selectedStoryId, setSelectedStoryId] = useState(subtask?.story_id || storyId || '');
  const [estimateHours, setEstimateHours] = useState(subtask?.original_estimate_hours || 0);

  const queryClient = useQueryClient();

  const { data: stories } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      setName(subtask?.name || '');
      setDescription(subtask?.description || '');
      setStatus(subtask?.status || 'todo');
      setSelectedStoryId(subtask?.story_id || storyId || '');
      setEstimateHours(subtask?.original_estimate_hours || 0);
    }
  }, [open, subtask, storyId]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (subtask) {
        const { error } = await supabase
          .from('subtasks')
          .update(data)
          .eq('id', subtask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subtasks')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      toast.success(subtask ? 'Subtask updated' : 'Subtask created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save subtask');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoryId) {
      toast.error('Please select a story');
      return;
    }
    mutation.mutate({
      name,
      description,
      status,
      story_id: selectedStoryId,
      original_estimate_hours: estimateHours,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{subtask ? 'Edit Subtask' : 'Create Subtask'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="story">Story *</Label>
              <Select value={selectedStoryId} onValueChange={setSelectedStoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select story" />
                </SelectTrigger>
                <SelectContent>
                  {stories?.filter(story => story.id).map((story) => (
                    <SelectItem key={story.id} value={story.id}>
                      {story.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="hours">Estimate (hours)</Label>
            <Input
              id="hours"
              type="number"
              value={estimateHours}
              onChange={(e) => setEstimateHours(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}