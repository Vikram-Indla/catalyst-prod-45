// Columns Dialog - Configure visible columns in risks grid
// Source: Implementation Spec Section 5

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Column {
  id: string;
  label: string;
  required?: boolean;
}

const AVAILABLE_COLUMNS: Column[] = [
  { id: 'id', label: 'ID', required: true },
  { id: 'roam', label: 'ROAM Status', required: true },
  { id: 'title', label: 'Title', required: true },
  { id: 'pi', label: 'Program Increment' },
  { id: 'occurrence', label: 'Risk of Occurrence' },
  { id: 'impact', label: 'Impact of Occurrence' },
  { id: 'critical_path', label: 'Critical Path' },
  { id: 'status', label: 'Status' },
];

interface ColumnsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function ColumnsDialog({
  isOpen,
  onClose,
  visibleColumns,
  onColumnsChange,
}: ColumnsDialogProps) {
  const handleToggle = (columnId: string, required?: boolean) => {
    if (required) return; // Cannot toggle required columns

    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const handleSelectAll = () => {
    onColumnsChange(AVAILABLE_COLUMNS.map(col => col.id));
  };

  const handleReset = () => {
    onColumnsChange(['roam', 'title', 'pi', 'occurrence', 'impact', 'critical_path', 'status']);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Columns Shown</DialogTitle>
          <DialogDescription>
            Select which columns to display in the risks grid.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {AVAILABLE_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => handleToggle(column.id, column.required)}
                  disabled={column.required}
                />
                <Label
                  htmlFor={column.id}
                  className={`text-sm ${column.required ? 'text-text-muted' : 'text-text-primary'} cursor-pointer`}
                >
                  {column.label}
                  {column.required && ' (required)'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
