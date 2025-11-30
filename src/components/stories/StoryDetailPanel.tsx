// Story Detail Panel - comprehensive view with tabs
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { X, Edit2, Save, Calendar, User, Flag } from 'lucide-react';
import { STORY_STATUS_LABELS } from '@/types/story.types';
import type { StoryWithRelations } from '@/types/story.types';

interface StoryDetailPanelProps {
  story: StoryWithRelations;
  onClose: () => void;
  onUpdate?: () => void;
}

export function StoryDetailPanel({ story, onClose, onUpdate }: StoryDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState(story);
  const queryClient = useQueryClient();

  const { data: features } = useQuery({
    queryKey: ['features-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: iterations } = useQuery({
    queryKey: ['iterations-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase.from('iterations').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', story.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Story updated');
      queryClient.invalidateQueries({ queryKey: ['all-stories'] });
      setIsEditing(false);
      onUpdate?.();
    },
    onError: () => {
      toast.error('Failed to update story');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: editedStory.name,
      description: editedStory.description,
      acceptance_criteria: editedStory.acceptance_criteria,
      status: editedStory.status,
      feature_id: editedStory.feature_id,
      team_id: editedStory.team_id,
      sprint_id: editedStory.sprint_id,
      estimate_points: editedStory.estimate_points,
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{story.name}</h2>
            <Badge variant="outline" className="capitalize">
              {story.status ? STORY_STATUS_LABELS[story.status] : 'To Do'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="details" className="h-full">
          <div className="border-b px-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="children">Children</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <Flag className="h-4 w-4" />
                Story Name
              </label>
              {isEditing ? (
                <Input
                  value={editedStory.name}
                  onChange={(e) => setEditedStory({ ...editedStory, name: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{story.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              {isEditing ? (
                <Textarea
                  value={editedStory.description || ''}
                  onChange={(e) => setEditedStory({ ...editedStory, description: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{story.description || 'No description'}</p>
              )}
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="text-sm font-medium mb-1 block">Acceptance Criteria</label>
              {isEditing ? (
                <Textarea
                  value={editedStory.acceptance_criteria || ''}
                  onChange={(e) => setEditedStory({ ...editedStory, acceptance_criteria: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{story.acceptance_criteria || 'No criteria'}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              {isEditing ? (
                <Select
                  value={editedStory.status || 'todo'}
                  onValueChange={(value: any) => setEditedStory({ ...editedStory, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {story.status ? STORY_STATUS_LABELS[story.status] : 'To Do'}
                </Badge>
              )}
            </div>

            {/* Feature */}
            <div>
              <label className="text-sm font-medium mb-1 block">Feature</label>
              {isEditing ? (
                <Select
                  value={editedStory.feature_id}
                  onValueChange={(value) => setEditedStory({ ...editedStory, feature_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {features?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{story.features?.name || 'No feature'}</p>
              )}
            </div>

            {/* Team */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <User className="h-4 w-4" />
                Team
              </label>
              {isEditing ? (
                <Select
                  value={editedStory.team_id || undefined}
                  onValueChange={(value) => setEditedStory({ ...editedStory, team_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{story.teams?.name || 'No team'}</p>
              )}
            </div>

            {/* Sprint */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4" />
                Sprint
              </label>
              {isEditing ? (
                <Select
                  value={editedStory.sprint_id || undefined}
                  onValueChange={(value) => setEditedStory({ ...editedStory, sprint_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {iterations?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{story.iterations?.name || 'Backlog'}</p>
              )}
            </div>

            {/* Estimate Points */}
            <div>
              <label className="text-sm font-medium mb-1 block">Story Points</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedStory.estimate_points || ''}
                  onChange={(e) => setEditedStory({ ...editedStory, estimate_points: parseInt(e.target.value) || null })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{story.estimate_points || 'Not estimated'}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="children" className="p-4">
            <p className="text-sm text-muted-foreground">Child subtasks will be displayed here.</p>
          </TabsContent>

          <TabsContent value="discussions" className="p-4">
            <p className="text-sm text-muted-foreground">Discussions will be displayed here.</p>
          </TabsContent>

          <TabsContent value="history" className="p-4">
            <p className="text-sm text-muted-foreground">Change history will be displayed here.</p>
          </TabsContent>

          <TabsContent value="links" className="p-4">
            <p className="text-sm text-muted-foreground">Related links will be displayed here.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
