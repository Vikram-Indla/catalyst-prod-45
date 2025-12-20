/**
 * Manage Columns Dialog - Admin UI for configuring Kanban columns
 */

import { useState } from 'react';
import { GripVertical, Plus, Trash2, RotateCcw, AlertCircle, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { STATUS_CONFIG, REQUIRED_COLUMNS, FORBIDDEN_COLUMNS } from '../types';
import type { IncidentStatus } from '@/types/incident';

interface ManageColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: IncidentStatus[];
  onReorder: (statuses: IncidentStatus[]) => { success: boolean; error?: string };
  onAdd: (status: IncidentStatus) => { success: boolean; error?: string };
  onRemove: (status: IncidentStatus) => { success: boolean; error?: string };
  onReset: () => void;
  getAddableStatuses: () => IncidentStatus[];
  canRemove: (status: IncidentStatus) => boolean;
}

export function ManageColumnsDialog({
  open,
  onOpenChange,
  statuses,
  onReorder,
  onAdd,
  onRemove,
  onReset,
  getAddableStatuses,
  canRemove,
}: ManageColumnsDialogProps) {
  const [localStatuses, setLocalStatuses] = useState<IncidentStatus[]>(statuses);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [addStatus, setAddStatus] = useState<string>('');

  const addableStatuses = getAddableStatuses();

  // Sync local state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalStatuses(statuses);
      setAddStatus('');
    }
    onOpenChange(isOpen);
  };

  // Drag handlers for reordering
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;

    const newStatuses = [...localStatuses];
    const [dragged] = newStatuses.splice(draggedIdx, 1);
    newStatuses.splice(idx, 0, dragged);
    setLocalStatuses(newStatuses);
    setDraggedIdx(idx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  // Add column
  const handleAddColumn = () => {
    if (!addStatus) return;
    const result = onAdd(addStatus as IncidentStatus);
    if (result.success) {
      setLocalStatuses(prev => [...prev, addStatus as IncidentStatus]);
      setAddStatus('');
      toast.success(`Added "${STATUS_CONFIG[addStatus as IncidentStatus]?.label || addStatus}" column`);
    } else {
      toast.error(result.error || 'Failed to add column');
    }
  };

  // Remove column
  const handleRemoveColumn = (status: IncidentStatus) => {
    const result = onRemove(status);
    if (result.success) {
      setLocalStatuses(prev => prev.filter(s => s !== status));
      toast.success(`Removed "${STATUS_CONFIG[status]?.label || status}" column`);
    } else {
      toast.error(result.error || 'Failed to remove column');
    }
  };

  // Save changes
  const handleSave = () => {
    const result = onReorder(localStatuses);
    if (result.success) {
      toast.success('Column order saved');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Failed to save column order');
    }
  };

  // Reset to defaults
  const handleReset = () => {
    onReset();
    setLocalStatuses([...REQUIRED_COLUMNS]);
    toast.success('Columns reset to defaults');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
          <DialogDescription>
            Configure which workflow statuses appear as columns and their order.
            Drag to reorder. Required columns cannot be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Column List */}
          <div className="space-y-1">
            {localStatuses.map((status, idx) => {
              const config = STATUS_CONFIG[status];
              const isRequired = REQUIRED_COLUMNS.includes(status);
              const removable = canRemove(status);

              return (
                <div
                  key={status}
                  draggable
                  onDragStart={handleDragStart(idx)}
                  onDragOver={handleDragOver(idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md border border-border",
                    "bg-muted/20 hover:bg-muted/40 transition-colors cursor-grab",
                    draggedIdx === idx && "opacity-50 border-primary"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config?.color }}
                  />
                  <span className="text-sm font-medium flex-1">
                    {config?.label || status}
                  </span>
                  {isRequired && (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {!removable ? (
                    <span className="text-[10px] text-muted-foreground">Required</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveColumn(status)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Column */}
          {addableStatuses.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Select value={addStatus} onValueChange={setAddStatus}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Add a column..." />
                </SelectTrigger>
                <SelectContent>
                  {addableStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {STATUS_CONFIG[status]?.label || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={!addStatus}
                onClick={handleAddColumn}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          {/* Info about Committee */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/30 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Note:</strong> "Committee" is a governance attribute, not a workflow status.
              It appears as a card indicator only.
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManageColumnsDialog;
