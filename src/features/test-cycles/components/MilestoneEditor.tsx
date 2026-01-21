// ============================================================================
// MilestoneEditor - Create/edit/toggle milestones
// ============================================================================

import { memo, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Flag, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import type { CycleMilestone } from '../types/cycle-config';
import { useCycleMilestones } from '../hooks/useCycleMilestones';

interface MilestoneEditorProps {
  cycleId: string;
  milestones: CycleMilestone[];
  className?: string;
}

export const MilestoneEditor = memo(function MilestoneEditor({
  cycleId,
  milestones,
  className,
}: MilestoneEditorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    target_date: '',
    description: '',
  });

  const { createMilestone, deleteMilestone, toggleMilestone, isLoading } =
    useCycleMilestones(cycleId);

  const handleCreate = () => {
    if (!newMilestone.name || !newMilestone.target_date) return;

    createMilestone.mutate(
      {
        name: newMilestone.name,
        target_date: newMilestone.target_date,
        description: newMilestone.description || undefined,
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setNewMilestone({ name: '', target_date: '', description: '' });
        },
      }
    );
  };

  const handleToggle = (milestone: CycleMilestone) => {
    toggleMilestone.mutate({
      milestoneId: milestone.id,
      isCompleted: !milestone.is_completed,
    });
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteMilestone.mutate(deleteConfirm, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
  );

  return (
    <div className={cn('bg-card rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Flag className="h-4 w-4" />
          Milestones
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {sortedMilestones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No milestones defined</p>
          <p className="text-xs">Add milestones to track progress checkpoints</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMilestones.map((milestone) => {
            const isOverdue =
              !milestone.is_completed && new Date(milestone.target_date) < new Date();

            return (
              <div
                key={milestone.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                  milestone.is_completed
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : isOverdue
                    ? 'bg-destructive/5 border-destructive/20'
                    : 'bg-muted/50 border-border'
                )}
              >
                <button
                  onClick={() => handleToggle(milestone)}
                  disabled={isLoading}
                  className="mt-0.5 flex-shrink-0"
                >
                  {milestone.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-medium text-sm',
                      milestone.is_completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {milestone.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span
                      className={cn(
                        'text-xs',
                        isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  </div>
                  {milestone.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {milestone.description}
                    </p>
                  )}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => setDeleteConfirm(milestone.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Milestone Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Test Cases Ready"
                value={newMilestone.name}
                onChange={(e) =>
                  setNewMilestone((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Date</label>
              <Input
                type="date"
                value={newMilestone.target_date}
                onChange={(e) =>
                  setNewMilestone((prev) => ({ ...prev, target_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="Describe this milestone..."
                value={newMilestone.description}
                onChange={(e) =>
                  setNewMilestone((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newMilestone.name || !newMilestone.target_date || createMilestone.isPending}
            >
              {createMilestone.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The milestone will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
