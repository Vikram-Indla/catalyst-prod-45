import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChangeDefectStatusG25 } from '@/hooks/useDefectsG25';
import { Loader2 } from 'lucide-react';

const STATUSES = [
  { value: 'new', label: 'New' }, { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' }, { value: 'fixed', label: 'Fixed' },
  { value: 'resolved', label: 'Resolved' }, { value: 'verified', label: 'Verified' },
  { value: 'closed', label: 'Closed' }, { value: 'reopened', label: 'Reopened' },
  { value: 'deferred', label: 'Deferred' },
];

const RESOLUTIONS = [
  { value: 'fixed', label: 'Fixed' }, { value: 'wont_fix', label: "Won't Fix" },
  { value: 'duplicate', label: 'Duplicate' }, { value: 'cannot_reproduce', label: 'Cannot Reproduce' },
  { value: 'by_design', label: 'By Design' }, { value: 'deferred', label: 'Deferred' },
];

interface Props { open: boolean; onClose: () => void; defectId: string; currentStatus: string; }

export function StatusChangeModal({ open, onClose, defectId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [resolution, setResolution] = useState('');
  const changeStatus = useChangeDefectStatusG25();
  const showResolution = ['resolved', 'fixed', 'closed', 'deferred'].includes(status);

  const handleSubmit = async () => {
    await changeStatus.mutateAsync({ defectId, status, resolution: showResolution && resolution ? resolution : undefined });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {showResolution && (
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger><SelectValue placeholder="Select resolution..." /></SelectTrigger>
                <SelectContent>{RESOLUTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={changeStatus.isPending}>
              {changeStatus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
