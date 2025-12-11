import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';

interface EpicColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

// Production column list from audit - matches exact Production UI
const AVAILABLE_COLUMNS = [
  { id: 'rank', label: 'Rank', description: 'Display rank/order number' },
  { id: 'name', label: 'Name', description: 'Epic name (always visible)', locked: true },
  { id: 'epic_key', label: 'Epic Key', description: 'Unique epic identifier' },
  { id: 'theme', label: 'Theme', description: 'Strategic theme assignment' },
  { id: 'program', label: 'Program', description: 'Program assignment' },
  { id: 'state', label: 'State', description: 'Current workflow state' },
  { id: 'health', label: 'Health', description: 'RAG health status' },
  { id: 'owner', label: 'Owner', description: 'Epic owner name' },
  { id: 'dates', label: 'Dates', description: 'Start and target dates' },
  { id: 'estimate', label: 'Estimate', description: 'Bottom-up estimate' },
];

const DEFAULT_COLUMNS = ['rank', 'name', 'theme', 'program', 'state', 'health', 'owner', 'dates', 'estimate'];

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
    const column = AVAILABLE_COLUMNS.find(c => c.id === columnId);
    if (column?.locked) return; // Can't toggle locked columns

    setLocalSelection((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleReset = () => {
    setLocalSelection(DEFAULT_COLUMNS);
  };

  const handleApply = () => {
    // Ensure 'name' is always included
    const finalSelection = localSelection.includes('name') 
      ? localSelection 
      : ['name', ...localSelection];
    onColumnsChange(finalSelection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Customize Columns</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select which columns to display in the Epic Backlog list view
          </p>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-1">
            {AVAILABLE_COLUMNS.map((column) => (
              <div 
                key={column.id} 
                className="flex items-start gap-3 py-3 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`col-${column.id}`}
                  checked={localSelection.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                  disabled={column.locked}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label 
                    htmlFor={`col-${column.id}`} 
                    className={`text-sm font-medium cursor-pointer ${column.locked ? 'text-muted-foreground' : ''}`}
                  >
                    {column.label}
                    {column.locked && <span className="text-xs ml-2">(required)</span>}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {column.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {localSelection.length} columns selected
          </p>
        </div>

        <DialogFooter className="flex justify-between items-center gap-2">
          <Button variant="ghost" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
