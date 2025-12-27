/**
 * SubtaskEditDrawer — Slide-in drawer for editing subtasks
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
import { Trash2, Palette, Server, Plug, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

import { ChangeNumberSelect } from '@/components/common/ChangeNumberSelect';
import { updateSubtask, deleteSubtask } from '@/services/subtaskService';
import type { Subtask, SubtaskType, SubtaskStatus } from '@/types/subtask';
import { SUBTASK_TYPE_CONFIG, SUBTASK_STATUS_CONFIG } from '@/types/subtask';

interface ParentStory {
  id: string;
  key: string;
  title: string;
  feature_id: string;
  feature_key: string;
}

interface SubtaskEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subtask: Subtask | null;
  parentStory: ParentStory;
  teamMembers?: Array<{ id: string; full_name: string; avatar_url?: string }>;
  releases?: Array<{ id: string; name: string }>;
}

const TYPE_ICONS: Record<SubtaskType, React.ElementType> = {
  frontend: Palette,
  backend: Server,
  integration: Plug,
  technical: Settings,
};

const TYPE_OPTIONS: SubtaskType[] = ['frontend', 'backend', 'integration', 'technical'];
const STATUS_OPTIONS: SubtaskStatus[] = ['todo', 'in_progress', 'done'];

export function SubtaskEditDrawer({
  isOpen,
  onClose,
  subtask,
  parentStory,
  teamMembers = [],
  releases = [],
}: SubtaskEditDrawerProps) {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<SubtaskType>('technical');
  const [status, setStatus] = useState<SubtaskStatus>('todo');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [changeNumberId, setChangeNumberId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  // Reset form when subtask changes
  useEffect(() => {
    if (subtask) {
      setName(subtask.name);
      setType(subtask.type);
      setStatus(subtask.status);
      setAssigneeId(subtask.assignee_id);
      setReleaseId(subtask.release_id);
      setChangeNumberId(subtask.change_number_id);
      setDescription(subtask.description || '');
    }
  }, [subtask]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!subtask) throw new Error('No subtask');
      return updateSubtask(subtask.id, {
        name,
        type,
        status,
        assignee_id: assigneeId,
        release_id: releaseId,
        change_number_id: changeNumberId,
        description: description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentStory.id] });
      toast.success('Subtask updated');
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to update subtask', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!subtask) throw new Error('No subtask');
      return deleteSubtask(subtask.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentStory.id] });
      toast.success('Subtask deleted');
      setShowDeleteDialog(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to delete subtask', { description: error.message });
    },
  });

  if (!subtask) return null;

  const typeConfig = SUBTASK_TYPE_CONFIG[type];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[400px] sm:w-[500px] flex flex-col">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              {/* Type Badge */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
              >
                {(() => {
                  const Icon = TYPE_ICONS[type];
                  return <Icon className="h-3 w-3" />;
                })()}
                <span>{typeConfig.label}</span>
              </div>
              <SheetTitle className="text-lg">Edit Subtask</SheetTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Parent:{' '}
              <span className="text-[#2563eb] dark:text-[#60a5fa] font-mono font-medium">{parentStory.key}</span>
              {' '}{parentStory.title}
            </p>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Subtask title..."
              />
            </div>

            {/* Type Selection (2x2 Grid) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((t) => {
                  const config = SUBTASK_TYPE_CONFIG[t];
                  const Icon = TYPE_ICONS[t];
                  const isSelected = t === type;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors",
                        isSelected
                          ? "border-2"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                      style={isSelected ? { 
                        borderColor: config.color, 
                        backgroundColor: config.bgColor 
                      } : undefined}
                    >
                      <Icon className="h-4 w-4" style={{ color: config.color }} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assignee</Label>
              <Select value={assigneeId || ''} onValueChange={(v) => setAssigneeId(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
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

            {/* Release */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Release Version</Label>
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
            />

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SubtaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => {
                    const config = SUBTASK_STATUS_CONFIG[s];
                    return (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                rows={4}
              />
            </div>

            {/* Hierarchy Info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Hierarchy
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Feature:</span>{' '}
                  <span className="text-[#2563eb] dark:text-[#60a5fa] font-mono font-medium">
                    {parentStory.feature_key}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Story:</span>{' '}
                  <span className="text-[#2563eb] dark:text-[#60a5fa] font-mono font-medium">
                    {parentStory.key}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={!name.trim() || updateMutation.isPending}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the subtask.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
