import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FeatureHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureHistoryDialog({ open, onOpenChange }: FeatureHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Program Board Feature History</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Feature scheduling history report (TODO: Implementation pending)</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
