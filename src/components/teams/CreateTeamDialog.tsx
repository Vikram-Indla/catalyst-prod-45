import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateTeam } from '@/hooks/useTeams';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [programId, setProgramId] = useState('');
  const [teamType, setTeamType] = useState<'AGILE' | 'KANBAN' | 'COP'>('AGILE');

  const createTeam = useCreateTeam();

  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTeam.mutateAsync({
      name,
      short_name: shortName || undefined,
      program_id: programId,
      team_type: teamType,
      is_active: true,
    });

    // Reset form
    setName('');
    setShortName('');
    setProgramId('');
    setTeamType('AGILE');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Platform Team"
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

          <div>
            <Label htmlFor="program">Program *</Label>
            <Select value={programId} onValueChange={setProgramId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="teamType">Team Type *</Label>
            <Select value={teamType} onValueChange={(value: any) => setTeamType(value)} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGILE">Agile / Scrum</SelectItem>
                <SelectItem value="KANBAN">Kanban</SelectItem>
                <SelectItem value="COP">Community of Practice (CoP)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
