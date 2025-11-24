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

interface FeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: any;
}

export function FeatureDialog({ open, onOpenChange, feature }: FeatureDialogProps) {
  const [name, setName] = useState(feature?.name || '');
  const [description, setDescription] = useState(feature?.description || '');
  const [status, setStatus] = useState(feature?.status || 'funnel');
  const [health, setHealth] = useState(feature?.health || 'green');
  const [epicId, setEpicId] = useState(feature?.epic_id || '');
  const [programId, setProgramId] = useState(feature?.program_id || '');
  const [piId, setPiId] = useState(feature?.pi_id || '');
  const [estimatePoints, setEstimatePoints] = useState(feature?.estimate_points || 0);
  const [wsjfScore, setWsjfScore] = useState(feature?.wsjf_score || 0);

  const queryClient = useQueryClient();

  const { data: epics } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('epics').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

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

  useEffect(() => {
    if (open) {
      setName(feature?.name || '');
      setDescription(feature?.description || '');
      setStatus(feature?.status || 'funnel');
      setHealth(feature?.health || 'green');
      setEpicId(feature?.epic_id || '');
      setProgramId(feature?.program_id || '');
      setPiId(feature?.pi_id || '');
      setEstimatePoints(feature?.estimate_points || 0);
      setWsjfScore(feature?.wsjf_score || 0);
    }
  }, [open, feature]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (feature) {
        const { error } = await supabase
          .from('features')
          .update(data)
          .eq('id', feature.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('features')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success(feature ? 'Feature updated' : 'Feature created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save feature');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!epicId || !programId) {
      toast.error('Please select an epic and program');
      return;
    }
    mutation.mutate({
      name,
      description,
      status,
      health,
      epic_id: epicId,
      program_id: programId,
      pi_id: piId || null,
      estimate_points: estimatePoints,
      wsjf_score: wsjfScore,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{feature ? 'Edit Feature' : 'Create Feature'}</DialogTitle>
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
              <Label htmlFor="epic">Epic *</Label>
              <Select value={epicId} onValueChange={setEpicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select epic" />
                </SelectTrigger>
                <SelectContent>
                  {epics?.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      {epic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funnel">Funnel</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="implementing">Implementing</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="health">Health</Label>
              <Select value={health} onValueChange={setHealth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pi">PI</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="points">Estimate Points</Label>
              <Input
                id="points"
                type="number"
                value={estimatePoints}
                onChange={(e) => setEstimatePoints(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="wsjf">WSJF Score</Label>
              <Input
                id="wsjf"
                type="number"
                value={wsjfScore}
                onChange={(e) => setWsjfScore(Number(e.target.value))}
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
