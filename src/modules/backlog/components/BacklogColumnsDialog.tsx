import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  { id: 'id', label: 'ID', default: true },
  { id: 'name', label: 'Name', default: true },
  { id: 'state', label: 'State', default: true },
  { id: 'processStep', label: 'Process Step', default: false },
  { id: 'owner', label: 'Owner', default: true },
  { id: 'points', label: 'Points', default: true },
  { id: 'estimate', label: 'Estimate', default: false },
  { id: 'mvp', label: 'MVP', default: true },
  { id: 'health', label: 'Health', default: true },
  { id: 'blocked', label: 'Blocked', default: false },
  { id: 'program', label: 'Program', default: false },
  { id: 'portfolio', label: 'Portfolio', default: false },
];

const DEFAULT_COLUMNS = AVAILABLE_COLUMNS.filter((col) => col.default).map((col) => col.id);

export function BacklogColumnsDialog({
  open,
  onOpenChange,
  columnsShown,
  onColumnsChange,
}: BacklogColumnsDialogProps) {
  const [localColumns, setLocalColumns] = useState(columnsShown);

  useEffect(() => {
    if (open) {
      setLocalColumns(columnsShown);
    }
  }, [open, columnsShown]);

  const handleToggle = (columnId: string) => {
    if (localColumns.includes(columnId)) {
      // Keep at least one column selected
      if (localColumns.length > 1) {
        setLocalColumns(localColumns.filter((id) => id !== columnId));
      }
    } else {
      setLocalColumns([...localColumns, columnId]);
    }
  };

  const handleSelectAll = () => {
    setLocalColumns(AVAILABLE_COLUMNS.map((col) => col.id));
  };

  const handleReset = () => {
    setLocalColumns(DEFAULT_COLUMNS);
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
          <DialogDescription>
            Select which columns to display in the backlog view
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {AVAILABLE_COLUMNS.map((column) => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={column.id}
                checked={localColumns.includes(column.id)}
                onCheckedChange={() => handleToggle(column.id)}
              />
              <Label
                htmlFor={column.id}
                className="cursor-pointer flex-1 text-sm font-normal"
              >
                {column.label}
                {column.default && (
                  <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                )}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="text-xs text-muted-foreground ml-auto">
            {localColumns.length} of {AVAILABLE_COLUMNS.length} selected
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
