import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ExtraConfigsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showUnassigned: boolean;
  onShowUnassignedChange: (value: boolean) => void;
}

export function ExtraConfigsDialog({ 
  open, 
  onOpenChange, 
  showUnassigned, 
  onShowUnassignedChange 
}: ExtraConfigsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extra Configs</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-unassigned">Show Unassigned Features</Label>
            <Switch
              id="show-unassigned"
              checked={showUnassigned}
              onCheckedChange={onShowUnassignedChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
