/**
 * CreateStoryModal — Enhanced Create Story modal
 * Features: Change Number, Acceptance Criteria, Inline Subtasks
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { X, Link2 } from 'lucide-react';

import { ChangeNumberSelect } from '@/components/common/ChangeNumberSelect';
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';
import { SubtaskInlineEditor } from './SubtaskInlineEditor';
import { createStory } from '@/services/storyService';
import { PRIORITY_OPTIONS, type SubtaskInput, type StoryPriority } from '@/types/story';

interface ParentFeature {
  id: string;
  key: string;
  title: string;
  program_id?: string;
  program_name?: string;
  epic_id?: string;
  epic_key?: string;
  product_name?: string;
  department_name?: string;
  release_id?: string;
  release_name?: string;
  project_id?: string;
  project_name?: string;
}

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentFeature: ParentFeature;
  releases?: Array<{ id: string; name: string }>;
  teamMembers?: Array<{ id: string; full_name: string; avatar_url?: string }>;
  projects?: Array<{ id: string; name: string }>;
}

export function CreateStoryModal({
  isOpen,
  onClose,
  parentFeature,
  releases = [],
  teamMembers = [],
  projects = [],
}: CreateStoryModalProps) {
  const queryClient = useQueryClient();
  const [createAnother, setCreateAnother] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseId, setReleaseId] = useState<string | null>(parentFeature.release_id || null);
  const [changeNumberId, setChangeNumberId] = useState<string | null>(null);
  const [priority, setPriority] = useState<StoryPriority>('medium');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setReleaseId(parentFeature.release_id || null);
    setChangeNumberId(null);
    setPriority('medium');
    setOwnerId(null);
    setAcceptanceCriteria([]);
    setSubtasks([]);
  };

  const createStoryMutation = useMutation({
    mutationFn: createStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail', parentFeature.id] });
      queryClient.invalidateQueries({ queryKey: ['feature-story-stats', parentFeature.id] });
      queryClient.invalidateQueries({ queryKey: ['stories', parentFeature.id] });
      toast.success('Story created successfully');
      
      if (createAnother) {
        resetForm();
      } else {
        onClose();
      }
    },
    onError: (error: any) => {
      toast.error('Failed to create story', { description: error.message });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (title.length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }

    createStoryMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      feature_id: parentFeature.id,
      release_id: releaseId,
      change_number_id: changeNumberId,
      priority,
      owner_id: ownerId,
      acceptance_criteria: acceptanceCriteria,
      subtasks,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">Create Story</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Parent Feature:{' '}
                <span className="text-gold-link font-mono font-medium">{parentFeature.key}</span>
                {' '}{parentFeature.title}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">{title.length}/200</span>
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Enter story title..."
              className="w-full"
            />
          </div>

          {/* Three Column Row: Release, Change Number, Priority */}
          <div className="grid grid-cols-3 gap-4">
            {/* Release */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Release</Label>
              <Select value={releaseId || ''} onValueChange={(v) => setReleaseId(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select release..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {releases.map((release) => (
                    <SelectItem key={release.id} value={release.id}>
                      {release.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Change Number */}
            <ChangeNumberSelect
              value={changeNumberId}
              onChange={setChangeNumberId}
              showLabel
              placeholder="Select..."
            />

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as StoryPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: opt.color }}
                        />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Owner</Label>
            <Select value={ownerId || ''} onValueChange={(v) => setOwnerId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this story..."
              rows={3}
            />
          </div>

          {/* Acceptance Criteria */}
          <AcceptanceCriteriaEditor
            criteria={acceptanceCriteria}
            onChange={setAcceptanceCriteria}
          />

          {/* Subtasks */}
          <SubtaskInlineEditor
            subtasks={subtasks}
            onChange={setSubtasks}
            teamMembers={teamMembers}
            releases={releases}
            defaultReleaseId={releaseId || undefined}
          />

          {/* Blockers Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">Blockers</h4>
              <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-status-success/10 text-status-success">
                0
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-muted-foreground/50"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Link Blocking Items
            </Button>
          </div>

          {/* Inherited Context */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Inherited Context
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Program:</span>{' '}
                <span className="text-gold-link font-medium">
                  {parentFeature.program_name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Parent Epic:</span>{' '}
                <span className="font-mono text-xs">{parentFeature.epic_key || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Product:</span>{' '}
                <span>{parentFeature.product_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Department:</span>{' '}
                <span>{parentFeature.department_name || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium">Project</Label>
                <Select 
                  value={parentFeature.project_id || ''} 
                  disabled
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No project assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length > 0 ? (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    ) : parentFeature.project_id && parentFeature.project_name ? (
                      <SelectItem value={parentFeature.project_id}>
                        {parentFeature.project_name}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Project is inherited from the parent feature
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-another"
              checked={createAnother}
              onCheckedChange={(checked) => setCreateAnother(checked === true)}
            />
            <Label htmlFor="create-another" className="text-sm cursor-pointer">
              Create another story
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createStoryMutation.isPending}
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
            >
              {createStoryMutation.isPending ? 'Creating...' : 'Create Story'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
