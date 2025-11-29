import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

interface CreateSprintDialogProps {
  teamId: string;
  teamName: string;
  sprintPrefix?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSprintDialog({ 
  teamId, 
  teamName, 
  sprintPrefix = 'Sprint',
  open, 
  onOpenChange 
}: CreateSprintDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [goal, setGoal] = useState('');

  const queryClient = useQueryClient();

  const createSprint = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('iterations')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      toast.success('Sprint created successfully');
      // Reset form
      setName('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
      setGoal('');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to create sprint');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createSprint.mutate({
      name: name || `${sprintPrefix} ${Date.now()}`,
      team_id: teamId,
      start_date: startDate,
      end_date: endDate,
      goal: goal || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Sprint for {teamName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Sprint Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., ${sprintPrefix} 24`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="goal">Sprint Goal</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Optional sprint goal"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSprint.isPending}>
              {createSprint.isPending ? 'Creating...' : 'Create Sprint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
