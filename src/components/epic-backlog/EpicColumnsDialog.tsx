import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';

interface EpicColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const AVAILABLE_COLUMNS = [
  { id: 'id', label: 'ID', group: 'Basic' },
  { id: 'epic_key', label: 'Epic Key', group: 'Basic' },
  { id: 'name', label: 'Name', group: 'Basic' },
  { id: 'state', label: 'State', group: 'Basic' },
  { id: 'status', label: 'Status', group: 'Basic' },
  { id: 'health', label: 'Health', group: 'Basic' },
  { id: 'labels', label: 'Labels', group: 'Basic' },
  { id: 'points_estimate', label: 'Points', group: 'Estimates' },
  { id: 'estimate', label: 'Estimate', group: 'Estimates' },
  { id: 'mvp', label: 'MVP', group: 'Planning' },
  { id: 'process_step', label: 'Process Step', group: 'Planning' },
  { id: 'primary_program', label: 'Program', group: 'Organization' },
  { id: 'portfolio', label: 'Portfolio', group: 'Organization' },
  { id: 'theme', label: 'Theme', group: 'Strategy' },
  { id: 'owner', label: 'Owner', group: 'People' },
  { id: 'start_date', label: 'Start Date', group: 'Dates' },
  { id: 'end_date', label: 'End Date', group: 'Dates' },
  { id: 'created_at', label: 'Created', group: 'Dates' },
  { id: 'updated_at', label: 'Updated', group: 'Dates' },
];

const DEFAULT_COLUMNS = ['id', 'name', 'state', 'labels', 'points_estimate', 'mvp', 'process_step'];

export function EpicColumnsDialog({
  open,
  onOpenChange,
  selectedColumns,
  onColumnsChange,
}: EpicColumnsDialogProps) {
  const [localSelection, setLocalSelection] = useState<string[]>(selectedColumns);

  useEffect(() => {
    setLocalSelection(selectedColumns);
  }, [selectedColumns, open]);

  const toggleColumn = (columnId: string) => {
    setLocalSelection((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSelectAll = () => {
    setLocalSelection(AVAILABLE_COLUMNS.map((col) => col.id));
  };

  const handleDeselectAll = () => {
    setLocalSelection([]);
  };

  const handleReset = () => {
    setLocalSelection(DEFAULT_COLUMNS);
  };

  const handleApply = () => {
    onColumnsChange(localSelection);
    onOpenChange(false);
  };

  const groupedColumns = AVAILABLE_COLUMNS.reduce((acc, col) => {
    if (!acc[col.group]) {
      acc[col.group] = [];
    }
    acc[col.group].push(col);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_COLUMNS>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            {localSelection.length} of {AVAILABLE_COLUMNS.length} columns selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset to Default
            </Button>
          </div>
        </div>

        <Separator />

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedColumns).map(([group, columns]) => (
              <div key={group}>
                <h4 className="text-sm font-semibold mb-3 text-foreground">{group}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {columns.map((column) => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.id}
                        checked={localSelection.includes(column.id)}
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
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply ({localSelection.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
