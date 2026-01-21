import React, { useState, useCallback } from 'react';
import { Settings2, GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Can't be hidden
}

interface ColumnChooserProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  storageKey?: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'key', label: 'Key', visible: true, locked: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'title', label: 'Summary', visible: true, locked: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'storyPoints', label: 'Story Points', visible: true },
  { id: 'createdAt', label: 'Created', visible: false },
  { id: 'updatedAt', label: 'Updated', visible: false },
  { id: 'parentKey', label: 'Parent', visible: false },
  { id: 'labels', label: 'Labels', visible: false },
  { id: 'sprint', label: 'Sprint', visible: false },
];

export const ColumnChooser: React.FC<ColumnChooserProps> = ({
  columns,
  onChange,
  storageKey = 'spaces_backlog_columns',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleToggleColumn = useCallback((columnId: string) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.id === columnId && !col.locked
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setLocalColumns(prev => {
      const newColumns = [...prev];
      const [draggedColumn] = newColumns.splice(draggedIndex, 1);
      newColumns.splice(index, 0, draggedColumn);
      return newColumns;
    });
    setDraggedIndex(index);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleReset = useCallback(() => {
    setLocalColumns(DEFAULT_COLUMNS);
  }, []);

  const handleApply = useCallback(() => {
    onChange(localColumns);
    localStorage.setItem(storageKey, JSON.stringify(localColumns));
    setIsOpen(false);
  }, [localColumns, onChange, storageKey]);

  const handleCancel = useCallback(() => {
    setLocalColumns(columns);
    setIsOpen(false);
  }, [columns]);

  const visibleCount = localColumns.filter(c => c.visible).length;
  const totalCount = localColumns.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Columns
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
          <DialogDescription>
            Choose which columns to display and drag to reorder.
            {visibleCount} of {totalCount} columns visible.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-1">
            {localColumns.map((column, index) => (
              <div
                key={column.id}
                draggable={!column.locked}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  "hover:bg-muted/50",
                  draggedIndex === index && "bg-muted opacity-50",
                  column.locked && "opacity-60"
                )}
              >
                <div className={cn(
                  "cursor-grab active:cursor-grabbing",
                  column.locked && "cursor-not-allowed opacity-30"
                )}>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex-1 flex items-center gap-2">
                  {column.visible ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                  )}
                  <span className={cn(
                    "text-sm",
                    !column.visible && "text-muted-foreground"
                  )}>
                    {column.label}
                  </span>
                  {column.locked && (
                    <span className="text-xs text-muted-foreground">(required)</span>
                  )}
                </div>

                <Switch
                  checked={column.visible}
                  onCheckedChange={() => handleToggleColumn(column.id)}
                  disabled={column.locked}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const getDefaultColumns = (): ColumnConfig[] => DEFAULT_COLUMNS;

export const loadColumnsFromStorage = (storageKey: string): ColumnConfig[] => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_COLUMNS;
};
