// Stories Column Configuration Dialog
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
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

interface Column {
  id: string;
  label: string;
  enabled: boolean;
}

interface StoriesColumnConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (columns: string[]) => void;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'name', label: 'Story Name', enabled: true },
  { id: 'feature', label: 'Feature', enabled: true },
  { id: 'sprint', label: 'Sprint', enabled: true },
  { id: 'team', label: 'Team', enabled: true },
  { id: 'points', label: 'Story Points', enabled: true },
  { id: 'assignee', label: 'Assignee', enabled: true },
  { id: 'status', label: 'Status', enabled: true },
  { id: 'description', label: 'Description', enabled: false },
  { id: 'acceptance_criteria', label: 'Acceptance Criteria', enabled: false },
  { id: 'created_at', label: 'Created Date', enabled: false },
  { id: 'updated_at', label: 'Updated Date', enabled: false },
];

export function StoriesColumnConfig({ open, onOpenChange, onApply }: StoriesColumnConfigProps) {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);

  const handleToggle = (columnId: string) => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, enabled: !col.enabled } : col
    ));
  };

  const handleApply = () => {
    const enabledColumns = columns.filter(col => col.enabled).map(col => col.id);
    onApply(enabledColumns);
    onOpenChange(false);
  };

  const handleSelectAll = () => {
    setColumns(columns.map(col => ({ ...col, enabled: true })));
  };

  const handleDeselectAll = () => {
    setColumns(columns.map(col => ({ ...col, enabled: false })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={column.enabled}
                  onCheckedChange={() => handleToggle(column.id)}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
