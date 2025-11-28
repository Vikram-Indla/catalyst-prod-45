import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface Column {
  key: string;
  label: string;
  enabled: boolean;
}

interface OKRColumnsDialogProps {
  open: boolean;
  onClose: () => void;
  columns: Column[];
  onSave: (columns: Column[]) => void;
}

export function OKRColumnsDialog({
  open,
  onClose,
  columns,
  onSave,
}: OKRColumnsDialogProps) {
  const [localColumns, setLocalColumns] = useState<Column[]>(columns);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns, open]);

  const handleToggle = (key: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(
      columns.map((col) => ({ ...col, enabled: true }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select which columns to display in the objectives table
          </p>

          <div className="space-y-3">
            {localColumns.map((column) => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={column.enabled}
                  onCheckedChange={() => handleToggle(column.key)}
                />
                <Label
                  htmlFor={column.key}
                  className="text-sm font-normal cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
