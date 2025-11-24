import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface RiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk?: any;
}

export function RiskDialog({ open, onOpenChange, risk }: RiskDialogProps) {
  const [name, setName] = useState(risk?.name || '');
  const [description, setDescription] = useState(risk?.description || '');
  const [roamStatus, setRoamStatus] = useState(risk?.roam_status || 'owned');
  const [programId, setProgramId] = useState(risk?.program_id || '');
  const [piId, setPiId] = useState(risk?.pi_id || '');
  const [impact, setImpact] = useState(risk?.impact || 1);
  const [probability, setProbability] = useState(risk?.probability || 1);

  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: pis } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('program_increments').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (risk) {
        const { error } = await supabase
          .from('risks')
          .update(data)
          .eq('id', risk.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('risks')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast.success(risk ? 'Risk updated' : 'Risk created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save risk');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId || !piId) {
      toast.error('Please select a program and PI');
      return;
    }
    mutation.mutate({
      name,
      description,
      roam_status: roamStatus,
      program_id: programId,
      pi_id: piId,
      impact,
      probability,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{risk ? 'Edit Risk' : 'Create Risk'}</DialogTitle>
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
          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="status">ROAM Status</Label>
              <Select value={roamStatus} onValueChange={setRoamStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="impact">Impact (1-5)</Label>
              <Input
                id="impact"
                type="number"
                min="1"
                max="5"
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="probability">Probability (1-5)</Label>
              <Input
                id="probability"
                type="number"
                min="1"
                max="5"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
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
