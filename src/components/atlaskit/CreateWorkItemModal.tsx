import React, { useState, useEffect } from 'react';
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
import { useCatalystContext } from '@/contexts/CatalystContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpaceOption {
  label: string;
  value: string;
  type: 'program' | 'project';
  icon: string;
  programName?: string;
}

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
  const { workspaceType, programId, projectId, programName, projectName } = useCatalystContext();
  
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('story');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('in-requirements');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch programs (stored in portfolios table)
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects (stored in programs table)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, portfolio_id, portfolios(name)')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Build space options from real data
  const allSpaces: SpaceOption[] = [
    ...programs.map(p => ({
      label: p.name,
      value: `program-${p.id}`,
      type: 'program' as const,
      icon: '📁',
    })),
    ...projects.map(p => ({
      label: p.name,
      value: `project-${p.id}`,
      type: 'project' as const,
      icon: '📊',
      programName: (p.portfolios as any)?.name || 'Unknown Program',
    })),
  ];

  // Pre-select space based on current context when modal opens
  useEffect(() => {
    if (isOpen) {
      if (workspaceType === 'program' && programId) {
        setSelectedSpace(`program-${programId}`);
        setSelectedWorkType('epic');
      } else if (workspaceType === 'project' && projectId) {
        setSelectedSpace(`project-${projectId}`);
        setSelectedWorkType('story');
      } else {
        // Default to first available space
        if (allSpaces.length > 0) {
          const firstSpace = allSpaces[0];
          setSelectedSpace(firstSpace.value);
          setSelectedWorkType(firstSpace.type === 'program' ? 'epic' : 'story');
        }
      }
    }
  }, [isOpen, workspaceType, programId, projectId, allSpaces.length]);

  const selectedSpaceData = allSpaces.find(s => s.value === selectedSpace);
  const spaceType = selectedSpaceData?.type || 'project';
  const workTypes = workTypesBySpace[spaceType] || workTypesBySpace.project;
  const selectedWorkTypeData = workTypes.find(w => w.value === selectedWorkType);

  const handleSpaceChange = (value: string) => {
    setSelectedSpace(value);
    const space = allSpaces.find(s => s.value === value);
    if (space?.type === 'program') {
      setSelectedWorkType('epic');
    } else {
      setSelectedWorkType('story');
    }
  };

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
      // TODO: Implement actual creation logic
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
            <Select value={selectedSpace} onValueChange={handleSpaceChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select space..." />
              </SelectTrigger>
              <SelectContent>
                {programs.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-[#5E6C84]">Programs</div>
                    {allSpaces.filter(s => s.type === 'program').map((space) => (
                      <SelectItem key={space.value} value={space.value}>
                        <span className="flex items-center gap-2">
                          <span>{space.icon}</span>
                          <span>{space.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
                {projects.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-[#5E6C84] border-t mt-1 pt-2">Projects</div>
                    {allSpaces.filter(s => s.type === 'project').map((space) => (
                      <SelectItem key={space.value} value={space.value}>
                        <span className="flex items-center gap-2">
                          <span>{space.icon}</span>
                          <span>{space.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
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
                <SelectItem value="medium">= Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <a href="#" className="text-xs text-[#0052CC] hover:underline">
              Learn about priority levels ↗
            </a>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#172B4D]">Description</Label>
            <div className="border rounded-md">
              <div className="flex gap-2 p-2 border-b bg-[#F4F5F7]">
                <button className="text-sm font-bold px-1">B</button>
                <button className="text-sm italic px-1">I</button>
                <button className="text-sm px-1">...</button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Type /ai for Atlassian Intelligence or @ to mention and notify someone."
                className="min-h-[100px] border-0 focus-visible:ring-0"
              />
            </div>
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
              className="bg-[#0052CC] hover:bg-[#0747A6] text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
