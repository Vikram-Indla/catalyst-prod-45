import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { StrategicSnapshot, useArchiveSnapshot } from '@/hooks/useStrategicSnapshots';

interface ArchiveSnapshotModalProps {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot;
}

export function ArchiveSnapshotModal({ open, onClose, snapshot }: ArchiveSnapshotModalProps) {
  const archiveSnapshot = useArchiveSnapshot();
  const [archiving, setArchiving] = useState(false);

  const isActive = snapshot.status === 'ACTIVE';

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await archiveSnapshot.mutateAsync(snapshot.id);
      onClose();
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Archive snapshot?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Archived snapshots are read-only and can't be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isActive && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">This is the active snapshot</p>
                <p className="text-amber-700 mt-1">
                  Archiving will leave no active snapshot. You'll need to activate another snapshot to continue working.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            You're about to archive <span className="font-medium text-foreground">"{snapshot.name}"</span>. 
            This action will:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Make all linked items read-only</li>
            <li>Prevent any further edits</li>
            <li>Keep the snapshot visible for reference</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleArchive} 
            disabled={archiving}
          >
            {archiving ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
