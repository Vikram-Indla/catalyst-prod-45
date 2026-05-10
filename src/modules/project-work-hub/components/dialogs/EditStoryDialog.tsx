/**
 * Edit Story Dialog — loads existing story and allows editing
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { catalystToast as toast } from '@/lib/catalystToast';
import { Loader2 } from '@/lib/atlaskit-icons';

interface EditStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  storyId: string;
  projectId: string;
}

export const EditStoryDialog: React.FC<EditStoryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  storyId,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featureId, setFeatureId] = useState<string>('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [status, setStatus] = useState<string>('open');

  // Fetch story data
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ['story-detail', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!storyId,
  });

  // Populate form
  useEffect(() => {
    if (story) {
      setTitle(story.title || '');
      setDescription(story.description || '');
      setFeatureId(story.feature_id || '');
      setAcceptanceCriteria((story as any).acceptance_criteria || '');
      setStatus((story as any).status || 'open');
    }
  }, [story]);

  // Fetch features for parent selector
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['features-for-story', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const updateStory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('stories')
        .update({
          title: title.trim(),
          name: title.trim(),
          description: description.trim() || null,
          feature_id: featureId || null,
          acceptance_criteria: acceptanceCriteria.trim() || null,
          status,
        } as any)
        .eq('id', storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['story-detail', storyId] });
      toast.success('Story updated', 'The story has been updated successfully.');
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Failed to update story', error.message);
    },
  });

  const isValid = title.trim().length > 0;

  if (storyLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Story {(story as any)?.story_key ? `— ${(story as any).story_key}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter story title"
              disabled={updateStory.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature">Feature</Label>
            <Select value={featureId} onValueChange={setFeatureId} disabled={featuresLoading || updateStory.isPending}>
              <SelectTrigger>
                <SelectValue placeholder={featuresLoading ? 'Loading features...' : 'Select parent feature'} />
              </SelectTrigger>
              <SelectContent>
                {features?.map((feature) => (
                  <SelectItem key={feature.id} value={feature.id}>
                    {feature.display_id ? `${feature.display_id}: ` : ''}{feature.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={updateStory.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter story description (optional)"
              rows={3}
              disabled={updateStory.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceptance">Acceptance Criteria</Label>
            <Textarea
              id="acceptance"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              placeholder="Enter acceptance criteria (optional)"
              rows={3}
              disabled={updateStory.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateStory.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => updateStory.mutate()}
            disabled={!isValid || updateStory.isPending}
          >
            {updateStory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
