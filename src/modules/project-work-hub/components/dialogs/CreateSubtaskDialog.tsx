import React, { useState } from 'react';
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
import { WorkItem, StatusCategory } from '../../types';

interface CreateSubtaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  stories?: WorkItem[];
}

const storyOptions = [
  { label: 'STORY-001: Implement login form', value: 'story-001' },
  { label: 'STORY-002: Create user profile page', value: 'story-002' },
  { label: 'STORY-003: Add notification system', value: 'story-003' },
];

export const CreateSubtaskDialog: React.FC<CreateSubtaskDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  stories,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');

  const handleSubmit = () => {
    if (!summary.trim() || !story) return;

    onSubmit({
      type: 'SUBTASK',
      summary: summary.trim(),
      description: description.trim(),
      status: 'TODO',
      statusCategory: 'TODO' as StatusCategory,
      parentId: story,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setStory('');
    onClose();
  };

  const isValid = summary.trim() && story;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Subtask</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="summary">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter subtask summary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="story">
              Story <span className="text-destructive">*</span>
            </Label>
            <Select value={story} onValueChange={setStory}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent story (required)" />
              </SelectTrigger>
              <SelectContent>
                {storyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Subtasks must belong to a Story
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter subtask description"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Create Subtask
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
