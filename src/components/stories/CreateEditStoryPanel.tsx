import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateEditStoryPanelProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storyId?: string;
  initialTeamId?: string;
  initialSprintId?: string;
}

export function CreateEditStoryPanel({ open, onClose, onSuccess, storyId, initialTeamId, initialSprintId }: CreateEditStoryPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    feature_id: '',
    team_id: initialTeamId || '',
    sprint_id: initialSprintId || '',
    state: 'backlog',
    story_points: '',
    priority: 'medium',
    acceptance_criteria: '',
  });

  const { data: features = [] } = useQuery({
    queryKey: ['features-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints-list', formData.team_id],
    queryFn: async () => {
      if (!formData.team_id) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('id, name')
        .eq('team_id', formData.team_id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!formData.team_id,
  });

  const { data: existingStory } = useQuery({
    queryKey: ['story-edit', storyId],
    queryFn: async () => {
      if (!storyId) return null;
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storyId && open,
  });

  useEffect(() => {
    if (existingStory) {
      setFormData({
        name: existingStory.name || '',
        description: existingStory.description || '',
        feature_id: existingStory.feature_id || '',
        team_id: existingStory.team_id || '',
        sprint_id: existingStory.sprint_id || '',
        state: existingStory.state || 'backlog',
        story_points: existingStory.story_points?.toString() || '',
        priority: existingStory.priority || 'medium',
        acceptance_criteria: existingStory.acceptance_criteria || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        feature_id: '',
        team_id: initialTeamId || '',
        sprint_id: initialSprintId || '',
        state: 'backlog',
        story_points: '',
        priority: 'medium',
        acceptance_criteria: '',
      });
    }
  }, [existingStory, open, initialTeamId, initialSprintId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        title: formData.name, // Sync title with name
        description: formData.description || null,
        feature_id: formData.feature_id || null,
        team_id: formData.team_id || null,
        sprint_id: formData.sprint_id || null,
        state: formData.state,
        story_points: formData.story_points ? parseInt(formData.story_points) : null,
        priority: formData.priority,
        acceptance_criteria: formData.acceptance_criteria || null,
      };

      if (storyId) {
        const { error } = await supabase
          .from('stories')
          .update(payload)
          .eq('id', storyId);
        if (error) throw error;
        toast({ title: 'Story updated successfully' });
      } else {
        const { error } = await supabase
          .from('stories')
          .insert([payload]);
        if (error) throw error;
        toast({ title: 'Story created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{storyId ? 'Edit Story' : 'Create Story'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Story Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feature">Feature</Label>
              <Select value={formData.feature_id} onValueChange={(value) => setFormData({ ...formData, feature_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select feature" />
                </SelectTrigger>
                <SelectContent>
                  {features.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select 
                value={formData.team_id} 
                onValueChange={(value) => setFormData({ ...formData, team_id: value, sprint_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint">Sprint</Label>
            <Select 
              value={formData.sprint_id} 
              onValueChange={(value) => setFormData({ ...formData, sprint_id: value })}
              disabled={!formData.team_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.team_id ? "Select sprint" : "Select team first"} />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="story_points">Story Points</Label>
              <Input
                id="story_points"
                type="number"
                value={formData.story_points}
                onChange={(e) => setFormData({ ...formData, story_points: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceptance_criteria">Acceptance Criteria</Label>
            <Textarea
              id="acceptance_criteria"
              value={formData.acceptance_criteria}
              onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-brand-gold hover:bg-brand-gold-hover">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {storyId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
