/**
 * Archive Confirmation Dialog
 * Confirmation dialog for archiving multiple releases
 */

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReleaseItem {
  id: string;
  name: string;
}

interface ArchiveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releases: ReleaseItem[];
  onConfirm: () => Promise<void>;
}

export function ArchiveConfirmationDialog({
  open,
  onOpenChange,
  releases,
  onConfirm,
}: ArchiveConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Archive Releases
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to archive {releases.length} release{releases.length !== 1 ? 's' : ''}?
            This action can be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm font-medium mb-2">The following releases will be archived:</p>
          <ScrollArea className="h-40 rounded-md border p-3">
            <ul className="space-y-1">
              {releases.map((release) => (
                <li key={release.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {release.name}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Archiving...
              </>
            ) : (
              `Archive ${releases.length} Release${releases.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
