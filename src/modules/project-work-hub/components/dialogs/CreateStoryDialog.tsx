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

interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  features?: WorkItem[];
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

const featureOptions = [
  { label: 'FEAT-001: User Authentication', value: 'feat-001' },
  { label: 'FEAT-002: Dashboard Redesign', value: 'feat-002' },
  { label: 'FEAT-003: API Integration', value: 'feat-003' },
];

export const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  features,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [feature, setFeature] = useState('');
  const [quarter, setQuarter] = useState('');
  const [release, setRelease] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

  const handleSubmit = () => {
    if (!summary.trim() || !feature || !quarter || !release) return;

    onSubmit({
      type: 'STORY',
      summary: summary.trim(),
      description: description.trim(),
      status: 'TODO',
      statusCategory: 'TODO' as StatusCategory,
      priority: priority as Priority,
      quarterId: quarter,
      releaseVersionId: release,
      parentId: feature,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setFeature('');
    setQuarter('');
    setRelease('');
    setPriority('MEDIUM');
    setAcceptanceCriteria('');
    onClose();
  };

  const isValid = summary.trim() && feature && quarter && release;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
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
              placeholder="Enter story summary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature">
              Feature <span className="text-destructive">*</span>
            </Label>
            <Select value={feature} onValueChange={setFeature}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent feature (required)" />
              </SelectTrigger>
              <SelectContent>
                {featureOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Stories must belong to a Feature
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
            <Label htmlFor="priority">Priority</Label>
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
              placeholder="Enter story description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceptance">Acceptance Criteria</Label>
            <Textarea
              id="acceptance"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              placeholder="Enter acceptance criteria (one per line)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Create Story
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
