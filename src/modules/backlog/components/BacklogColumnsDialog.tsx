import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface BacklogColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnsShown: string[];
  onColumnsChange: (columns: string[]) => void;
}

const AVAILABLE_COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
  { id: 'state', label: 'State' },
  { id: 'processStep', label: 'Process Step' },
  { id: 'owner', label: 'Owner' },
  { id: 'points', label: 'Points' },
  { id: 'estimate', label: 'Estimate' },
  { id: 'mvp', label: 'MVP' },
  { id: 'health', label: 'Health' },
  { id: 'blocked', label: 'Blocked' },
];

export function BacklogColumnsDialog({
  open,
  onOpenChange,
  columnsShown,
  onColumnsChange,
}: BacklogColumnsDialogProps) {
  const handleToggle = (columnId: string) => {
    if (columnsShown.includes(columnId)) {
      onColumnsChange(columnsShown.filter((id) => id !== columnId));
    } else {
      onColumnsChange([...columnsShown, columnId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {AVAILABLE_COLUMNS.map((column) => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={column.id}
                checked={columnsShown.includes(column.id)}
                onCheckedChange={() => handleToggle(column.id)}
              />
              <Label htmlFor={column.id} className="cursor-pointer">
                {column.label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
