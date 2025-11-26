import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ForecastColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_COLUMNS = [
  { id: 'theme', label: 'Theme', enabled: true },
  { id: 'owner', label: 'Owner', enabled: true },
  { id: 'pi_estimate', label: 'Program Increment Estimate', enabled: true },
  { id: 'program_estimate', label: 'Program Estimate', enabled: false },
  { id: 'team_estimate', label: 'Team Estimate', enabled: false },
  { id: 'capacity_needed', label: 'Capacity Needed (%)', enabled: false },
  { id: 'epic', label: 'Epic', enabled: false, tooltip: 'Only for Features view' },
  { id: 'forecasted_spend', label: 'Forecasted Spend', enabled: false, disabled: true, tooltip: 'Not yet implemented' },
  { id: 'driver', label: 'Driver', enabled: false, disabled: true, tooltip: 'Not yet implemented' },
  { id: 'mmf', label: 'MMF', enabled: false, disabled: true, tooltip: 'Not yet implemented' },
  { id: 'in_scope', label: 'In-Scope', enabled: false, disabled: true, tooltip: 'Not yet implemented' },
];

export function ForecastColumnsDialog({ open, onOpenChange }: ForecastColumnsDialogProps) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);

  const toggleColumn = (id: string) => {
    setColumns(prev => prev.map(col =>
      col.id === id ? { ...col, enabled: !col.enabled } : col
    ));
  };

  const handleRestoreDefaults = () => {
    setColumns(DEFAULT_COLUMNS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
          {columns.map(column => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={column.id}
                checked={column.enabled}
                onCheckedChange={() => !column.disabled && toggleColumn(column.id)}
                disabled={column.disabled}
              />
              <Label
                htmlFor={column.id}
                className={`cursor-pointer flex-1 ${column.disabled ? 'text-muted-foreground' : ''}`}
              >
                {column.label}
                {column.tooltip && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({column.tooltip})
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleRestoreDefaults}>
            Restore Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
