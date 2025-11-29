import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: string;
}

export function CreateDependencyDialog({
  open,
  onOpenChange,
  teamId,
}: CreateDependencyDialogProps) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [fromWorkItemType, setFromWorkItemType] = useState<'feature' | 'story'>('feature');
  const [toWorkItemType, setToWorkItemType] = useState<'feature' | 'story'>('feature');
  const [fromFeatureId, setFromFeatureId] = useState('');
  const [toFeatureId, setToFeatureId] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'med' | 'high'>('low');
  const [neededByDate, setNeededByDate] = useState('');
  const [dependsOnTeamId, setDependsOnTeamId] = useState('');

  // Fetch work items for the requesting team (features or stories)
  const { data: requestingWorkItems } = useQuery({
    queryKey: ['team-work-items', teamId, fromWorkItemType],
    queryFn: async () => {
      if (!teamId) return [];
      
      if (fromWorkItemType === 'feature') {
        const { data, error } = await supabase
          .from('features')
          .select('id, name, display_id')
          .eq('team_id', teamId)
          .order('name');
        if (error) throw error;
        return data.map(item => ({ ...item, display: `${item.display_id || item.id.slice(0, 8)} - ${item.name}` }));
      } else {
        const { data, error } = await supabase
          .from('stories')
          .select('id, name')
          .eq('team_id', teamId)
          .order('name');
        if (error) throw error;
        return data.map(item => ({ ...item, display: `Story - ${item.name}` }));
      }
    },
    enabled: !!teamId && open,
  });

  // Fetch all teams for dependency target
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch work items for the dependent team (features or stories)
  const { data: dependentWorkItems } = useQuery({
    queryKey: ['team-work-items', dependsOnTeamId, toWorkItemType],
    queryFn: async () => {
      if (!dependsOnTeamId) return [];
      
      if (toWorkItemType === 'feature') {
        const { data, error } = await supabase
          .from('features')
          .select('id, name, display_id')
          .eq('team_id', dependsOnTeamId)
          .order('name');
        if (error) throw error;
        return data.map(item => ({ ...item, display: `${item.display_id || item.id.slice(0, 8)} - ${item.name}` }));
      } else {
        const { data, error } = await supabase
          .from('stories')
          .select('id, name')
          .eq('team_id', dependsOnTeamId)
          .order('name');
        if (error) throw error;
        return data.map(item => ({ ...item, display: `Story - ${item.name}` }));
      }
    },
    enabled: !!dependsOnTeamId && open,
  });

  const createMutation = useMutation({
    mutationFn: async (newDependency: any) => {
      const { data, error } = await supabase
        .from('dependencies')
        .insert([newDependency])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['dependencies'] });
      toast.success('Dependency created successfully');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to create dependency: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromFeatureId || !toFeatureId) {
      toast.error('Please select both requesting and dependent features');
      return;
    }

    createMutation.mutate({
      from_feature_id: fromFeatureId,
      to_feature_id: toFeatureId,
      requesting_team_id: teamId,
      depends_on_team_id: dependsOnTeamId || null,
      description,
      risk_level: riskLevel,
      needed_by_date: neededByDate || null,
      status: 'open',
    });
  };

  const handleClose = () => {
    setDescription('');
    setFromWorkItemType('feature');
    setToWorkItemType('feature');
    setFromFeatureId('');
    setToFeatureId('');
    setRiskLevel('low');
    setNeededByDate('');
    setDependsOnTeamId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Dependency</DialogTitle>
          <DialogDescription>
            Define a dependency between features across teams
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="from-type">Requesting Type *</Label>
                <Select value={fromWorkItemType} onValueChange={(v: any) => setFromWorkItemType(v)}>
                  <SelectTrigger id="from-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="from-work-item">Requesting Work Item *</Label>
                <Select value={fromFeatureId} onValueChange={setFromFeatureId} required>
                  <SelectTrigger id="from-work-item">
                    <SelectValue placeholder={`Select ${fromWorkItemType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {requestingWorkItems?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="depends-on-team">Depends On Team</Label>
              <Select value={dependsOnTeamId} onValueChange={setDependsOnTeamId}>
                <SelectTrigger id="depends-on-team">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="to-type">Dependent Type *</Label>
                <Select value={toWorkItemType} onValueChange={(v: any) => setToWorkItemType(v)}>
                  <SelectTrigger id="to-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="to-work-item">Dependent Work Item *</Label>
                <Select
                  value={toFeatureId}
                  onValueChange={setToFeatureId}
                  disabled={!dependsOnTeamId}
                  required
                >
                  <SelectTrigger id="to-work-item">
                    <SelectValue placeholder={`Select ${toWorkItemType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {dependentWorkItems?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the dependency..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="risk-level">Risk Level</Label>
                <Select value={riskLevel} onValueChange={(v: any) => setRiskLevel(v)}>
                  <SelectTrigger id="risk-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="med">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="needed-by">Needed By Date</Label>
                <Input
                  id="needed-by"
                  type="date"
                  value={neededByDate}
                  onChange={(e) => setNeededByDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Dependency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
