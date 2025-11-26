import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface EpicColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_COLUMNS = [
  'Strategic Driver',
  'Dependency',
  'Acceptance Criteria',
  'Age',
  'Blocked',
  'Budget',
  'Capitalized',
  'Child Count',
  'Customers',
  'Investment Type',
  'MVP',
  'Owner',
  'Points',
  'Process Step',
  'Score',
  'Story Point Progress',
  'Story Points',
  'Tag',
  'T-Shirt Size',
  'Type',
  'Value',
  'Weeks WSJF',
  'Objectives',
];

export function EpicColumnsDialog({ open, onOpenChange }: EpicColumnsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Columns Shown</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Main View (Max 5 columns)</h4>
            <div className="grid grid-cols-2 gap-4">
              {AVAILABLE_COLUMNS.slice(0, 12).map((col) => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox id={`main-${col}`} />
                  <Label htmlFor={`main-${col}`} className="text-sm">{col}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Small View / Unassigned (Max 2 columns)</h4>
            <div className="grid grid-cols-2 gap-4">
              {AVAILABLE_COLUMNS.slice(0, 8).map((col) => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox id={`small-${col}`} />
                  <Label htmlFor={`small-${col}`} className="text-sm">{col}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onOpenChange(false)}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
