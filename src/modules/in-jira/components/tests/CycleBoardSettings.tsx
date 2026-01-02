/**
 * Cycle Board Settings Dialog
 * Configure columns for the test cycle execution board
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardColumn } from '../../hooks/useCycleBoardConfig';

interface CycleBoardSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: BoardColumn[];
  onSave: (columns: BoardColumn[]) => Promise<unknown>;
  isSaving?: boolean;
}

export function CycleBoardSettings({
  open,
  onOpenChange,
  columns,
  onSave,
  isSaving,
}: CycleBoardSettingsProps) {
  const [editedColumns, setEditedColumns] = useState<BoardColumn[]>(columns);

  useEffect(() => {
    setEditedColumns(columns);
  }, [columns]);

  const updateColumn = (index: number, updates: Partial<BoardColumn>) => {
    setEditedColumns(prev =>
      prev.map((col, i) => (i === index ? { ...col, ...updates } : col))
    );
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editedColumns.length) return;

    const updated = [...editedColumns];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((col, i) => (col.order = i));
    setEditedColumns(updated);
  };

  const handleSave = async () => {
    await onSave(editedColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Board Configuration</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3 pr-4">
            {editedColumns.map((col, index) => (
              <div
                key={col.id}
                className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border-default"
              >
                <GripVertical className="h-4 w-4 text-text-quaternary cursor-grab" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={col.title}
                      onChange={e => updateColumn(index, { title: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Column title"
                    />
                    <Badge variant="outline" className="text-xs shrink-0">
                      {col.statusKey}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveColumn(index, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveColumn(index, 'down')}
                        disabled={index === editedColumns.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                    <div
                      className={cn('h-4 w-4 rounded', col.bgColor)}
                      title="Column color"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
