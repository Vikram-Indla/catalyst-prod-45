import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint?: any;
}

export function SprintDialog({ open, onOpenChange, sprint }: SprintDialogProps) {
  const [name, setName] = useState(sprint?.name || '');
  const [piId, setPiId] = useState(sprint?.pi_id || '');
  const [teamId, setTeamId] = useState(sprint?.team_id || '');
  const [startDate, setStartDate] = useState(sprint?.start_date || '');
  const [endDate, setEndDate] = useState(sprint?.end_date || '');

  const queryClient = useQueryClient();

  const { data: pis } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('program_increments').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (sprint) {
        const { error } = await supabase
          .from('iterations')
          .update(data)
          .eq('id', sprint.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('iterations')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iterations'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success(sprint ? 'Sprint updated' : 'Sprint created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save sprint');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!piId || !startDate || !endDate) {
      toast.error('Please fill all required fields');
      return;
    }
    mutation.mutate({
      name,
      pi_id: piId,
      team_id: teamId || null,
      start_date: startDate,
      end_date: endDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{sprint ? 'Edit Sprint' : 'Create Sprint'}</DialogTitle>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi">PI *</Label>
              <Select value={piId} onValueChange={setPiId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PI" />
                </SelectTrigger>
                <SelectContent>
                  {pis?.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="team">Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
