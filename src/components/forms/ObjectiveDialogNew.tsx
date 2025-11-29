import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateObjective } from '@/hooks/useObjectives';
import { useStrategySnapshots } from '@/hooks/useStrategySnapshots';

interface ObjectiveDialogNewProps {
  open: boolean;
  onClose: () => void;
  snapshotId?: string;
}

export function ObjectiveDialogNew({ open, onClose, snapshotId }: ObjectiveDialogNewProps) {
  const { data: snapshots } = useStrategySnapshots();
  const createMutation = useCreateObjective();
  
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    tier: 'strategic' as 'strategic' | 'portfolio' | 'program' | 'team',
    snapshot_id: snapshotId || '',
    status: 'on_track',
  });

  const handleSubmit = () => {
    createMutation.mutate(
      {
        ...formData,
        snapshot_id: formData.snapshot_id || snapshotId,
        work_progress: 0,
        key_result_progress: 0,
        program_increment_ids: [],
        contributors: [],
        tags: [],
        blocked: false,
      },
      {
        onSuccess: () => {
          onClose();
          setFormData({
            summary: '',
            description: '',
            tier: 'strategic',
            snapshot_id: snapshotId || '',
            status: 'on_track',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Objective</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Enter objective summary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add detailed description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tier *</Label>
              <Select
                value={formData.tier}
                onValueChange={(value: any) => setFormData({ ...formData, tier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategic">Strategic Goals</SelectItem>
                  <SelectItem value="portfolio">Portfolio Objectives</SelectItem>
                  <SelectItem value="program">Program Objectives</SelectItem>
                  <SelectItem value="team">Team Objectives</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="off_track">Off Track</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {snapshots && snapshots.length > 0 && (
            <div className="space-y-2">
              <Label>Strategy Snapshot</Label>
              <Select
                value={formData.snapshot_id}
                onValueChange={(value) => setFormData({ ...formData, snapshot_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select snapshot" />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((snapshot) => (
                    <SelectItem key={snapshot.id} value={snapshot.id}>
                      {snapshot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.summary}>
            Create Objective
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
