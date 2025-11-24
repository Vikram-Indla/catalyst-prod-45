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

interface StoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story?: any;
}

export function StoryDialog({ open, onOpenChange, story }: StoryDialogProps) {
  const [name, setName] = useState(story?.name || '');
  const [description, setDescription] = useState(story?.description || '');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(story?.acceptance_criteria || '');
  const [status, setStatus] = useState(story?.status || 'todo');
  const [featureId, setFeatureId] = useState(story?.feature_id || '');
  const [teamId, setTeamId] = useState(story?.team_id || '');
  const [estimatePoints, setEstimatePoints] = useState(story?.estimate_points || 0);

  const queryClient = useQueryClient();

  const { data: features } = useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('*').order('name');
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

  useEffect(() => {
    if (open) {
      setName(story?.name || '');
      setDescription(story?.description || '');
      setAcceptanceCriteria(story?.acceptance_criteria || '');
      setStatus(story?.status || 'todo');
      setFeatureId(story?.feature_id || '');
      setTeamId(story?.team_id || '');
      setEstimatePoints(story?.estimate_points || 0);
    }
  }, [open, story]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (story) {
        const { error } = await supabase
          .from('stories')
          .update(data)
          .eq('id', story.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stories')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success(story ? 'Story updated' : 'Story created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save story');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureId) {
      toast.error('Please select a feature');
      return;
    }
    mutation.mutate({
      name,
      description,
      acceptance_criteria: acceptanceCriteria,
      status,
      feature_id: featureId,
      team_id: teamId || null,
      estimate_points: estimatePoints,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{story ? 'Edit Story' : 'Create Story'}</DialogTitle>
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
          <div>
            <Label htmlFor="acceptance">Acceptance Criteria</Label>
            <Textarea
              id="acceptance"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="feature">Feature *</Label>
              <Select value={featureId} onValueChange={setFeatureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select feature" />
                </SelectTrigger>
                <SelectContent>
                  {features?.map((feature) => (
                    <SelectItem key={feature.id} value={feature.id}>
                      {feature.name}
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
            <div>
              <Label htmlFor="points">Estimate Points</Label>
              <Input
                id="points"
                type="number"
                value={estimatePoints}
                onChange={(e) => setEstimatePoints(Number(e.target.value))}
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
