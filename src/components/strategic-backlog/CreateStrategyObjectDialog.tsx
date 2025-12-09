import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Target, Eye, Heart } from 'lucide-react';
import { useCreateMission, useCreateVision, useCreateValue, useUpsertSnapshotLinks, useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';

type ObjectType = 'mission' | 'vision' | 'value';

interface CreateStrategyObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ObjectType;
  snapshotId: string;
}

export function CreateStrategyObjectDialog({ open, onOpenChange, type, snapshotId }: CreateStrategyObjectDialogProps) {
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');

  const createMission = useCreateMission();
  const createVision = useCreateVision();
  const createValue = useCreateValue();
  const upsertLinks = useUpsertSnapshotLinks();
  const { data: links } = useSnapshotStrategyLinks(snapshotId);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    let newId: string | undefined;

    if (type === 'mission') {
      const result = await createMission.mutateAsync({ title, statement });
      newId = result.id;
      // Auto-link to snapshot
      await upsertLinks.mutateAsync({
        snapshot_id: snapshotId,
        mission_ids: [...(links?.mission_ids || []), newId],
        vision_ids: links?.vision_ids || [],
        value_ids: links?.value_ids || [],
        goal_ids: links?.goal_ids || [],
        theme_ids: links?.theme_ids || [],
      });
    } else if (type === 'vision') {
      const result = await createVision.mutateAsync({ title, statement });
      newId = result.id;
      await upsertLinks.mutateAsync({
        snapshot_id: snapshotId,
        mission_ids: links?.mission_ids || [],
        vision_ids: [...(links?.vision_ids || []), newId],
        value_ids: links?.value_ids || [],
        goal_ids: links?.goal_ids || [],
        theme_ids: links?.theme_ids || [],
      });
    } else {
      const result = await createValue.mutateAsync({ title, statement });
      newId = result.id;
      await upsertLinks.mutateAsync({
        snapshot_id: snapshotId,
        mission_ids: links?.mission_ids || [],
        vision_ids: links?.vision_ids || [],
        value_ids: [...(links?.value_ids || []), newId],
        goal_ids: links?.goal_ids || [],
        theme_ids: links?.theme_ids || [],
      });
    }

    setTitle('');
    setStatement('');
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (type) {
      case 'mission': return <Target className="h-5 w-5 text-blue-600" />;
      case 'vision': return <Eye className="h-5 w-5 text-purple-600" />;
      case 'value': return <Heart className="h-5 w-5 text-pink-600" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'mission': return 'Create Mission';
      case 'vision': return 'Create Vision';
      case 'value': return 'Create Value';
    }
  };

  const isLoading = createMission.isPending || createVision.isPending || createValue.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle>{getTitle()}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${type} title`}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Statement</Label>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder={`Enter ${type} statement (optional)`}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isLoading}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
