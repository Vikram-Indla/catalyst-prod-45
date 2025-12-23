import React, { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projectId: string;
}

export const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featureId, setFeatureId] = useState<string>('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

  // Fetch real features from database filtered by project_id
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

  // Create story mutation
  const createStory = useMutation({
    mutationFn: async (storyData: { 
      title: string;
      name: string; 
      description?: string;
      feature_id: string;
      acceptance_criteria?: string;
    }) => {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          title: storyData.title,
          name: storyData.name,
          description: storyData.description || null,
          feature_id: storyData.feature_id,
          acceptance_criteria: storyData.acceptance_criteria || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate work items query so the list refreshes
      queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story created', 'The story has been created successfully.');
      resetForm();
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Failed to create story', error.message);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFeatureId('');
    setAcceptanceCriteria('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !featureId) return;

    createStory.mutate({
      title: title.trim(),
      name: title.trim(), // name is required, use title as the name
      description: description.trim() || undefined,
      feature_id: featureId,
      acceptance_criteria: acceptanceCriteria.trim() || undefined,
    });
  };

  const isValid = title.trim() && featureId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
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
              disabled={createStory.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature">
              Feature <span className="text-destructive">*</span>
            </Label>
            <Select value={featureId} onValueChange={setFeatureId} disabled={featuresLoading || createStory.isPending}>
              <SelectTrigger>
                <SelectValue placeholder={featuresLoading ? "Loading features..." : "Select parent feature (required)"} />
              </SelectTrigger>
              <SelectContent>
                {features?.map((feature) => (
                  <SelectItem key={feature.id} value={feature.id}>
                    {feature.display_id ? `${feature.display_id}: ` : ''}{feature.name}
                  </SelectItem>
                ))}
                {features?.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No features in this project. Create a feature first.
                  </div>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Stories must belong to a Feature
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter story description (optional)"
              rows={3}
              disabled={createStory.isPending}
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
              disabled={createStory.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createStory.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createStory.isPending}
          >
            {createStory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Story
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
