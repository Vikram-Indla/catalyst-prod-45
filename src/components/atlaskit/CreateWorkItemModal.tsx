import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { X } from 'lucide-react';

interface CreateWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const allSpaces = [
  { label: 'Product Program (PROD)', value: 'prod', type: 'program', icon: '📁' },
  { label: 'Engineering Program (ENG)', value: 'eng', type: 'program', icon: '📁' },
  { label: 'ICP Project (ICP)', value: 'icp', type: 'project', programName: 'Product Program', icon: '📊' },
  { label: 'Mobile App (MOB)', value: 'mob', type: 'project', programName: 'Product Program', icon: '📱' },
];

const workTypesBySpace: Record<string, Array<{ label: string; value: string; icon: string }>> = {
  program: [{ label: 'Epic', value: 'epic', icon: '⚡' }],
  project: [
    { label: 'Feature', value: 'feature', icon: '📦' },
    { label: 'Story', value: 'story', icon: '📗' },
    { label: 'Task', value: 'task', icon: '☑️' },
    { label: 'Bug', value: 'bug', icon: '🐛' },
    { label: 'Defect', value: 'defect', icon: '❌' },
  ],
};

export function CreateWorkItemModal({ isOpen, onClose }: CreateWorkItemModalProps) {
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('story');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('in-requirements');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSpaceData = allSpaces.find(s => s.value === selectedSpace);
  const spaceType = selectedSpaceData?.type || 'project';
  const workTypes = workTypesBySpace[spaceType] || workTypesBySpace.project;
  const selectedWorkTypeData = workTypes.find(w => w.value === selectedWorkType);

  const handleSubmit = async () => {
    if (!selectedSpace || !summary.trim()) return;
    
    setIsSubmitting(true);
    try {
      console.log('Creating work item:', {
        space: selectedSpace,
        workType: selectedWorkType,
        summary,
        description,
        status,
        priority,
      });
      handleClose();
    } catch (error) {
      console.error('Error creating work item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedSpace('');
    setSelectedWorkType('story');
    setSummary('');
    setDescription('');
    setStatus('in-requirements');
    setPriority('medium');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#172B4D]">
            Create {selectedWorkTypeData?.label || 'Story'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-xs text-[#5E6C84]">
            Required fields are marked with an asterisk *
          </p>

          {/* Space */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#172B4D]">
              Space <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedSpace} onValueChange={(value) => {
              setSelectedSpace(value);
              const space = allSpaces.find(s => s.value === value);
              if (space?.type === 'program') {
                setSelectedWorkType('epic');
              } else {
                setSelectedWorkType('story');
              }
            }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select space..." />
              </SelectTrigger>
              <SelectContent>
                {allSpaces.map((space) => (
                  <SelectItem key={space.value} value={space.value}>
                    <span className="flex items-center gap-2">
                      <span>{space.icon}</span>
                      <span>{space.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Program info for projects */}
          {selectedSpaceData?.type === 'project' && selectedSpaceData.programName && (
            <div className="p-3 bg-[#F4F5F7] rounded">
              <div className="text-xs font-semibold text-[#5E6C84] mb-1">Program</div>
              <div className="text-sm text-[#172B4D]">{selectedSpaceData.programName}</div>
            </div>
          )}

          {/* Work Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#172B4D]">
              Work type <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <a href="#" className="text-xs text-[#0052CC] hover:underline">
              Learn about work types ↗
            </a>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#172B4D]">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in-requirements">In Requirements</SelectItem>
                <SelectItem value="to-do">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[#5E6C84]">This is the initial status upon creation</p>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#172B4D]">
              Summary <span className="text-red-500">*</span>
            </Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What needs to be done?"
              className="h-10"
            />
            {!summary.trim() && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span>⚠</span> Summary is required
              </p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#172B4D]">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="highest">Highest</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#172B4D]">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-[#172B4D] cursor-pointer">
            <input type="checkbox" className="rounded" />
            Create another
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedSpace || !summary.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
