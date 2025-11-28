import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FeatureHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId?: string;
  piId?: string;
}

export function FeatureHistoryDialog({
  open,
  onOpenChange,
}: FeatureHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feature Scheduling History</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground">
          Feature history tracking will be available soon.
        </div>
      </DialogContent>
    </Dialog>
  );
}
