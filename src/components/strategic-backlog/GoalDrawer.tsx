import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfluenceEditor } from '@/components/knowledge-hub/editor/ConfluenceEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, Flag } from 'lucide-react';
import type { StrategicGoal } from '@/types/strategicBacklog';
import { useUpdateGoal, useDeleteGoal } from '@/hooks/useStrategicBacklog';
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

interface GoalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: StrategicGoal | null;
  isArchived: boolean;
  snapshotId: string;
}

export function GoalDrawer({ open, onOpenChange, goal, isArchived }: GoalDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [healthStatus, setHealthStatus] = useState<'GREEN' | 'AMBER' | 'RED'>('GREEN');
  const [completePercent, setCompletePercent] = useState(0);
  const [status, setStatus] = useState('active');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setHealthStatus((goal.health_status as 'GREEN' | 'AMBER' | 'RED') || 'GREEN');
      setCompletePercent(goal.complete_percent || 0);
      setStatus(goal.status || 'active');
    }
  }, [goal]);

  const handleSave = async () => {
    if (!goal?.id || isArchived) return;

    await updateGoal.mutateAsync({
      id: goal.id,
      title,
      description,
      health_status: healthStatus,
      complete_percent: completePercent,
      status,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!goal?.id || isArchived) return;
    await deleteGoal.mutateAsync(goal.id);
    setDeleteOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent width="wide" className="overflow-hidden flex flex-col">
          <SheetHeader className="pb-4 border-b border-border px-6">
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-green-600" />
              <SheetTitle className="text-lg">Goal Details</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-6 px-6 space-y-5">
            <div className="space-y-2">
              <Label>Goal Name *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isArchived}
                placeholder="Enter goal name"
              />
            </div>

            <div className="space-y-2 overflow-hidden">
              <Label>Description</Label>
              <div className="overflow-x-auto">
                <ConfluenceEditor
                  content={description}
                  onChange={setDescription}
                  editable={!isArchived}
                  placeholder="Enter goal description"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Health Status</Label>
              <Select value={healthStatus} onValueChange={(v) => setHealthStatus(v as any)} disabled={isArchived}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GREEN">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      On Track
                    </div>
                  </SelectItem>
                  <SelectItem value="AMBER">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      At Risk
                    </div>
                  </SelectItem>
                  <SelectItem value="RED">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      Off Track
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Progress</Label>
                <span className="text-sm font-medium">{Math.round(completePercent)}%</span>
              </div>
              <Slider
                value={[completePercent]}
                onValueChange={([v]) => setCompletePercent(v)}
                max={100}
                step={1}
                disabled={isArchived}
                className="[&_[role=slider]]:bg-brand-gold"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isArchived}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {goal && (
              <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                <p>Created: {new Date(goal.created_at).toLocaleDateString()}</p>
                <p>Updated: {new Date(goal.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border px-6 pb-4 mt-auto shrink-0">
            {!isArchived && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {!isArchived && (
                <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold/90">
                  Save
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this strategic goal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
