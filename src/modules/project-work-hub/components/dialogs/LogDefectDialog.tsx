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
import { WorkItem, Priority, StatusCategory } from '../../types';

interface LogDefectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  stories?: WorkItem[];
}

const priorityOptions = [
  { label: 'Highest', value: 'HIGHEST' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
  { label: 'Lowest', value: 'LOWEST' },
];

const quarterOptions = [
  { label: 'Q1 2025', value: 'q1-2025' },
  { label: 'Q2 2025', value: 'q2-2025' },
  { label: 'Q3 2025', value: 'q3-2025' },
  { label: 'Q4 2025', value: 'q4-2025' },
];

const releaseOptions = [
  { label: 'Release 1.0', value: 'rel-1.0' },
  { label: 'Release 1.1', value: 'rel-1.1' },
  { label: 'Release 2.0', value: 'rel-2.0' },
];

const storyOptions = [
  { label: 'STORY-001: Implement login form', value: 'story-001' },
  { label: 'STORY-002: Create user profile page', value: 'story-002' },
  { label: 'STORY-003: Add notification system', value: 'story-003' },
];

export const LogDefectDialog: React.FC<LogDefectDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  stories,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');
  const [quarter, setQuarter] = useState('');
  const [release, setRelease] = useState('');
  const [priority, setPriority] = useState('HIGH');

  const handleSubmit = () => {
    if (!summary.trim() || !story || !quarter || !release || !priority) return;

    onSubmit({
      type: 'DEFECT',
      summary: summary.trim(),
      description: description.trim(),
      status: 'OPEN',
      statusCategory: 'TODO' as StatusCategory,
      priority: priority as Priority,
      quarterId: quarter,
      releaseVersionId: release,
      parentId: story,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setStory('');
    setQuarter('');
    setRelease('');
    setPriority('HIGH');
    onClose();
  };

  const isValid = summary.trim() && story && quarter && release && priority;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Defect</DialogTitle>
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
              placeholder="Enter defect summary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="story">
              Story <span className="text-destructive">*</span>
            </Label>
            <Select value={story} onValueChange={setStory}>
              <SelectTrigger>
                <SelectValue placeholder="Select related story (required)" />
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
              Defects must be linked to a Story
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quarter">
                Quarter <span className="text-destructive">*</span>
              </Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="release">
                Release Version <span className="text-destructive">*</span>
              </Label>
              <Select value={release} onValueChange={setRelease}>
                <SelectTrigger>
                  <SelectValue placeholder="Select release" />
                </SelectTrigger>
                <SelectContent>
                  {releaseOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">
              Priority <span className="text-destructive">*</span>
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the defect, steps to reproduce, and expected behavior"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Log Defect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
