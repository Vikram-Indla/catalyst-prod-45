/**
 * FeatureBacklogColumnsDialog — Column visibility (persisted to Supabase)
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FEATURE_COLUMNS, OPTIONAL_COLUMNS } from '../types';

interface FeatureBacklogColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function FeatureBacklogColumnsDialog({
  open,
  onOpenChange,
  visibleColumns,
  onColumnsChange,
}: FeatureBacklogColumnsDialogProps) {
  const handleToggle = (columnId: string, checked: boolean) => {
    if (checked) {
      onColumnsChange([...visibleColumns, columnId]);
    } else {
      onColumnsChange(visibleColumns.filter(c => c !== columnId));
    }
  };

  const handleReset = () => {
    // Reset to default columns
    onColumnsChange(['key', 'summary', 'project', 'epic', 'status', 'priority', 'assignee', 'updated']);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Locked columns */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Always Visible (Pinned)
            </h4>
            <div className="space-y-2">
              {FEATURE_COLUMNS.filter(c => c.pinned).map(col => (
                <div key={col.id} className="flex items-center gap-2">
                  <Checkbox checked disabled />
                  <Label className="text-muted-foreground">{col.label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Default columns */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Default Columns
            </h4>
            <div className="space-y-2">
              {FEATURE_COLUMNS.filter(c => !c.pinned).map(col => (
                <div key={col.id} className="flex items-center gap-2">
                  <Checkbox
                    id={col.id}
                    checked={visibleColumns.includes(col.id)}
                    onCheckedChange={(checked) => handleToggle(col.id, !!checked)}
                  />
                  <Label htmlFor={col.id}>{col.label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Optional columns */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Optional Columns
            </h4>
            <div className="space-y-2">
              {OPTIONAL_COLUMNS.map(col => (
                <div key={col.id} className="flex items-center gap-2">
                  <Checkbox
                    id={col.id}
                    checked={visibleColumns.includes(col.id)}
                    onCheckedChange={(checked) => handleToggle(col.id, !!checked)}
                  />
                  <Label htmlFor={col.id}>{col.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
