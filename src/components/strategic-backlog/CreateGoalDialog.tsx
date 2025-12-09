import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag } from 'lucide-react';
import { useCreateGoal, useUpsertSnapshotLinks, useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
}

export function CreateGoalDialog({ open, onOpenChange, snapshotId }: CreateGoalDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [healthStatus, setHealthStatus] = useState<'GREEN' | 'AMBER' | 'RED'>('GREEN');

  const createGoal = useCreateGoal();
  const upsertLinks = useUpsertSnapshotLinks();
  const { data: links } = useSnapshotStrategyLinks(snapshotId);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    const result = await createGoal.mutateAsync({
      title,
      description,
      health_status: healthStatus,
      snapshot_id: snapshotId,
    });

    // Auto-link to snapshot
    await upsertLinks.mutateAsync({
      snapshot_id: snapshotId,
      mission_ids: links?.mission_ids || [],
      vision_ids: links?.vision_ids || [],
      value_ids: links?.value_ids || [],
      goal_ids: [...(links?.goal_ids || []), result.id],
      theme_ids: links?.theme_ids || [],
    });

    setTitle('');
    setDescription('');
    setHealthStatus('GREEN');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Flag className="h-5 w-5 text-green-600" />
            <DialogTitle>Create Strategic Goal</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Goal Name *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter goal name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter goal description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Initial Health Status</Label>
            <Select value={healthStatus} onValueChange={(v) => setHealthStatus(v as any)}>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createGoal.isPending}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {createGoal.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
