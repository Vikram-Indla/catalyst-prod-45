import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { TeamType } from '@/types/team.types';

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: any;
}

export function TeamDialog({ open, onOpenChange, team }: TeamDialogProps) {
  const [name, setName] = useState(team?.name || '');
  const [programId, setProgramId] = useState(team?.program_id || '');
  const [teamType, setTeamType] = useState<TeamType>(team?.team_type || 'AGILE');
  const [shortName, setShortName] = useState(team?.short_name || '');

  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (team) {
        const { error } = await supabase
          .from('teams')
          .update(data)
          .eq('id', team.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teams')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success(team ? 'Team updated' : 'Team created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save team');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) {
      toast.error('Please select a program');
      return;
    }
    mutation.mutate({
      name,
      short_name: shortName || undefined,
      program_id: programId,
      team_type: teamType,
      is_active: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'Create Team'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="shortName">Short Name</Label>
            <Input
              id="shortName"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g., PLT"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program">Program *</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="teamType">Team Type *</Label>
              <Select value={teamType} onValueChange={(value: any) => setTeamType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGILE">Agile / Scrum</SelectItem>
                  <SelectItem value="KANBAN">Kanban</SelectItem>
                  <SelectItem value="COP">CoP</SelectItem>
                </SelectContent>
              </Select>
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
