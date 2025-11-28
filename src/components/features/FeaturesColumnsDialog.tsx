import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface FeaturesColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const AVAILABLE_COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Feature' },
  { id: 'epic', label: 'Epic' },
  { id: 'program', label: 'Program' },
  { id: 'pi', label: 'Program Increment' },
  { id: 'iteration', label: 'Iteration' },
  { id: 'status', label: 'Status' },
  { id: 'health', label: 'Health' },
  { id: 'progress', label: 'Progress' },
  { id: 'estimate_points', label: 'Estimate Points' },
  { id: 'wsjf', label: 'WSJF Score' },
  { id: 'owner', label: 'Owner' },
  { id: 'target_completion', label: 'Target Completion' },
];

export function FeaturesColumnsDialog({
  open,
  onOpenChange,
  visibleColumns,
  onColumnsChange,
}: FeaturesColumnsDialogProps) {
  const toggleColumn = (columnId: string) => {
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const handleSelectAll = () => {
    onColumnsChange(AVAILABLE_COLUMNS.map(col => col.id));
  };

  const handleDeselectAll = () => {
    onColumnsChange(['id', 'name']); // Keep essential columns
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {AVAILABLE_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                />
                <Label
                  htmlFor={column.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
