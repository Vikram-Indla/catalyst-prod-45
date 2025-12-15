import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { UserPicker } from '@/components/ui/user-picker';
import { useCreateTheme, useStrategicThemes } from '@/hooks/useStrategicBacklog';
import { catalystToast } from '@/lib/catalystToast';

interface StrategicSnapshot {
  id: string;
  name: string;
  status: string;
}

interface CreateThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  snapshotName?: string;
  snapshots?: StrategicSnapshot[];
}

export function CreateThemeDialog({ 
  open, 
  onOpenChange, 
  snapshotId: preselectedSnapshotId,
  snapshotName,
  snapshots = []
}: CreateThemeDialogProps) {
  // Form state
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(preselectedSnapshotId);
  const [name, setName] = useState('');
  const [intent, setIntent] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [state, setState] = useState<'draft' | 'active'>('draft');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [duplicateError, setDuplicateError] = useState(false);

  // Hooks
  const createTheme = useCreateTheme();
  const { data: existingThemes = [] } = useStrategicThemes(selectedSnapshotId);

  // Sync preselected snapshot
  useEffect(() => {
    if (preselectedSnapshotId) {
      setSelectedSnapshotId(preselectedSnapshotId);
    }
  }, [preselectedSnapshotId]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName('');
      setIntent('');
      setOwnerId(null);
      setState('draft');
      setStartDate(undefined);
      setTargetDate(undefined);
      setDuplicateError(false);
      setSelectedSnapshotId(preselectedSnapshotId);
    }
  }, [open, preselectedSnapshotId]);

  // Check for duplicate name
  useEffect(() => {
    if (name.trim()) {
      const isDuplicate = existingThemes.some(
        t => t.name.toLowerCase() === name.trim().toLowerCase()
      );
      setDuplicateError(isDuplicate);
    } else {
      setDuplicateError(false);
    }
  }, [name, existingThemes]);

  const effectiveSnapshotId = selectedSnapshotId || preselectedSnapshotId;
  const hasSnapshot = !!effectiveSnapshotId;
  const isFormValid = hasSnapshot && name.trim() && !duplicateError;

  // Get snapshot name for display
  const displaySnapshotName = snapshotName || 
    snapshots.find(s => s.id === effectiveSnapshotId)?.name || 
    'Selected Snapshot';

  const handleSubmit = async () => {
    if (!isFormValid) return;

    try {
      await createTheme.mutateAsync({
        name: name.trim(),
        description: intent.trim() || undefined,
        owner_id: ownerId || undefined,
        status: state,
        start_date: startDate?.toISOString().split('T')[0],
        end_date: targetDate?.toISOString().split('T')[0],
        snapshot_id: effectiveSnapshotId,
      });

      catalystToast.success(
        'Theme Created',
        `Theme created and linked to ${displaySnapshotName}`
      );
      onOpenChange(false);
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Create Theme
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Context */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Context
            </div>

            {/* Strategic Snapshot */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Strategic Snapshot *</Label>
              {preselectedSnapshotId ? (
                <Badge 
                  variant="secondary" 
                  className="bg-muted border-border text-foreground font-normal px-3 py-1.5"
                >
                  {displaySnapshotName}
                </Badge>
              ) : (
                <Select value={selectedSnapshotId} onValueChange={setSelectedSnapshotId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a snapshot" />
                  </SelectTrigger>
                  <SelectContent className="z-[500]">
                    {snapshots.filter(s => s.status !== 'ARCHIVED').map((snap) => (
                      <SelectItem key={snap.id} value={snap.id}>
                        {snap.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Themes are scoped to a Strategic Snapshot.
              </p>
            </div>

            {/* Time Horizon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Start Date</Label>
                <CatalystDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Target Completion</Label>
                <CatalystDatePicker
                  value={targetDate}
                  onChange={setTargetDate}
                  placeholder="Select target"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Theme Definition */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground pt-2">
              Theme Definition
            </div>

            {/* Theme Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Theme Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter theme name"
                className={duplicateError ? 'border-destructive focus-visible:ring-destructive' : ''}
                autoFocus
              />
              {duplicateError && (
                <p className="text-xs text-destructive">
                  A theme with this name already exists in this snapshot.
                </p>
              )}
            </div>

            {/* Strategic Intent */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Strategic Intent
                <span className="ml-1 text-muted-foreground font-normal">(recommended)</span>
              </Label>
              <Textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="In one sentence, what outcome are we trying to enable? What will be different when this succeeds?"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Owner & State */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Owner
                  <span className="ml-1 text-muted-foreground font-normal">(recommended)</span>
                </Label>
                <UserPicker
                  value={ownerId}
                  onChange={(value) => setOwnerId(value as string | null)}
                  placeholder="Select owner"
                  multiSelect={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">State *</Label>
                <Select value={state} onValueChange={(v) => setState(v as 'draft' | 'active')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[500]">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || createTheme.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {createTheme.isPending ? 'Creating...' : 'Create Theme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
