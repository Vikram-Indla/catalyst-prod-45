import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ThemeColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (columns: string[]) => void;
  selectedColumns: string[];
  isUnassigned?: boolean;
}

const MAIN_VIEW_COLUMNS = [
  { id: 'rank', label: 'Rank' },
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
  { id: 'state', label: 'State' },
  { id: 'pis', label: 'Program Increments' },
];

const UNASSIGNED_COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
];

export function ThemeColumnsDialog({
  open,
  onOpenChange,
  onSave,
  selectedColumns,
  isUnassigned = false,
}: ThemeColumnsDialogProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedColumns);
  const columns = isUnassigned ? UNASSIGNED_COLUMNS : MAIN_VIEW_COLUMNS;
  const maxColumns = isUnassigned ? 2 : 5;

  const handleToggle = (columnId: string) => {
    if (tempSelected.includes(columnId)) {
      setTempSelected(tempSelected.filter(id => id !== columnId));
    } else if (tempSelected.length < maxColumns) {
      setTempSelected([...tempSelected, columnId]);
    }
  };

  const handleSave = () => {
    onSave(tempSelected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
          <DialogDescription>
            Select up to {maxColumns} columns to display {isUnassigned ? 'in unassigned backlog' : 'in main view'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {columns.map(column => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={column.id}
                checked={tempSelected.includes(column.id)}
                onCheckedChange={() => handleToggle(column.id)}
                disabled={!tempSelected.includes(column.id) && tempSelected.length >= maxColumns}
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
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
