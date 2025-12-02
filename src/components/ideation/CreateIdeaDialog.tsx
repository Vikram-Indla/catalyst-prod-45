// ==============================================
// CREATE IDEA DIALOG
// Form for creating new ideas
// ==============================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateIdea } from '@/hooks/useIdeation';
import { toast } from 'sonner';
import type { CreateIdeaRequest } from '@/types/ideation';

interface CreateIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaGroupId: string;
  userId: string;
}

export function CreateIdeaDialog({
  open,
  onOpenChange,
  ideaGroupId,
  userId,
}: CreateIdeaDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const createIdea = useCreateIdea();

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    const request: CreateIdeaRequest = {
      idea_group_id: ideaGroupId,
      title: title.trim(),
      description: description.trim(),
      owner_id: userId,
      is_public: isPublic,
    };

    try {
      await createIdea.mutateAsync(request);
      toast.success('Idea created successfully');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create idea');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIsPublic(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Idea</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter idea title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your idea..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Idea</Label>
              <p className="text-sm text-muted-foreground">
                Make this idea visible to all users
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createIdea.isPending}>
            {createIdea.isPending ? 'Creating...' : 'Create Idea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
