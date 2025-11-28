import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OrphansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  piId: string;
}

export function OrphansDialog({ open, onOpenChange }: OrphansDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Program Orphans</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Orphan features management (TODO: Implementation pending)</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
