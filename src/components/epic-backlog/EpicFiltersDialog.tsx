import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EpicFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EpicFiltersDialog({ open, onOpenChange }: EpicFiltersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Apply Filters</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>State</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner</Label>
              <Input placeholder="Filter by owner" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>MVP Only</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">MVP Only</SelectItem>
                  <SelectItem value="no">Non-MVP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Min Points</Label>
              <Input type="number" placeholder="Minimum points" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Clear</Button>
            <Button onClick={() => onOpenChange(false)}>Apply Filters</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
