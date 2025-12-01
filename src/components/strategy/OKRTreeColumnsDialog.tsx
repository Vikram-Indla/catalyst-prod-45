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

interface OKRTreeColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: ColumnConfig;
  onColumnsChange: (columns: ColumnConfig) => void;
}

export interface ColumnConfig {
  objective: boolean;
  keyResultsProgress: boolean;
  score: boolean;
  owner: boolean;
}

const COLUMN_OPTIONS = [
  { id: 'objective' as const, label: 'Objective', description: 'Objective name and hierarchy', required: true },
  { id: 'keyResultsProgress' as const, label: 'Key Results Progress', description: 'Visual progress bar of key results completion' },
  { id: 'score' as const, label: 'Score', description: 'Numerical score (0.0 - 1.0)' },
  { id: 'owner' as const, label: 'Owner', description: 'Assigned owner avatar and name' },
];

export function OKRTreeColumnsDialog({
  open,
  onOpenChange,
  visibleColumns,
  onColumnsChange,
}: OKRTreeColumnsDialogProps) {
  const [localColumns, setLocalColumns] = useState(visibleColumns);

  const handleColumnToggle = (columnId: keyof ColumnConfig) => {
    if (COLUMN_OPTIONS.find(opt => opt.id === columnId)?.required) {
      return; // Don't allow disabling required columns
    }
    setLocalColumns(prev => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const handleSave = () => {
    onColumnsChange(localColumns);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalColumns(visibleColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
          <DialogDescription>
            Select which columns to display in the OKR Tree. You can show up to 4 columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {COLUMN_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-start space-x-3">
              <Checkbox
                id={option.id}
                checked={localColumns[option.id]}
                onCheckedChange={() => handleColumnToggle(option.id)}
                disabled={option.required}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={option.id}
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                    option.required ? 'text-muted-foreground' : 'cursor-pointer'
                  }`}
                >
                  {option.label}
                  {option.required && <span className="ml-2 text-xs">(Required)</span>}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
