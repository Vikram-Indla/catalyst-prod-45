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

interface BacklogFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
}

export function BacklogFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: BacklogFiltersDialogProps) {
  const handleApply = () => {
    onOpenChange(false);
  };

  const handleClear = () => {
    onFiltersChange({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Owner</Label>
            <Input placeholder="Filter by owner..." />
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Input placeholder="Filter by state..." />
          </div>

          <div className="space-y-2">
            <Label>Health</Label>
            <Input placeholder="Filter by health..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
