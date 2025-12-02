import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface SplitEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epic: any;
  onSuccess?: () => void;
}

export function SplitEpicDialog({
  open,
  onOpenChange,
  epic,
  onSuccess
}: SplitEpicDialogProps) {
  const queryClient = useQueryClient();
  const [newEpicName, setNewEpicName] = useState(`${epic?.name || ''} - Part 2`);
  const [description, setDescription] = useState('');

  const splitMutation = useMutation({
    mutationFn: async () => {
      // Create the new epic as a split
      const { data, error } = await supabase
        .from('epics')
        .insert([{
          name: newEpicName,
          description: description || epic?.description,
          portfolio_id: epic?.portfolio_id,
          primary_program_id: epic?.primary_program_id,
          theme_id: epic?.theme_id,
          health: epic?.health,
          owner_id: epic?.owner_id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic split successfully');
      onOpenChange(false);
      setNewEpicName(`${epic?.name || ''} - Part 2`);
      setDescription('');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to split epic');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split Epic</DialogTitle>
          <DialogDescription>
            Create a new epic by splitting "{epic?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="new-name">New Epic Name</Label>
            <Input
              id="new-name"
              value={newEpicName}
              onChange={(e) => setNewEpicName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description for the new epic..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => splitMutation.mutate()} 
            disabled={!newEpicName.trim() || splitMutation.isPending}
          >
            {splitMutation.isPending ? 'Splitting...' : 'Split Epic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
