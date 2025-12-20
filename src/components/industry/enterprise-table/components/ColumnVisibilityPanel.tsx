// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — COLUMN VISIBILITY PANEL
// Dropdown panel for showing/hiding columns with drag reorder
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Eye, EyeOff, GripVertical, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CatalystColumn } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ColumnVisibilityPanelProps<T> {
  columns: CatalystColumn<T>[];
  visibility: Record<string, boolean>;
  order: string[];
  onVisibilityChange: (visibility: Record<string, boolean>) => void;
  onOrderChange: (order: string[]) => void;
  onReset?: () => void;
  trigger?: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ColumnVisibilityPanel<T>({
  columns,
  visibility,
  order,
  onVisibilityChange,
  onOrderChange,
  onReset,
  trigger,
}: ColumnVisibilityPanelProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Get columns in current order
  const orderedColumns = React.useMemo(() => {
    const columnMap = new Map(columns.map(c => [c.id, c]));
    return order
      .map(id => columnMap.get(id))
      .filter((c): c is CatalystColumn<T> => c !== undefined);
  }, [columns, order]);

  // Count visible columns
  const visibleCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = columns.length;

  // Toggle single column
  const toggleColumn = (columnId: string) => {
    onVisibilityChange({
      ...visibility,
      [columnId]: !visibility[columnId],
    });
  };

  // Show all columns
  const showAll = () => {
    const next: Record<string, boolean> = {};
    columns.forEach(c => { next[c.id] = true; });
    onVisibilityChange(next);
  };

  // Hide all columns
  const hideAll = () => {
    const next: Record<string, boolean> = {};
    columns.forEach(c => { next[c.id] = false; });
    onVisibilityChange(next);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (columnId !== draggedId) {
      setDragOverId(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...order];
    const fromIndex = newOrder.indexOf(draggedId);
    const toIndex = newOrder.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedId);
      onOrderChange(newOrder);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const getColumnLabel = (column: CatalystColumn<T>): string => {
    if (typeof column.header === 'string') return column.header;
    return column.id;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Columns
            <span className="text-xs text-muted-foreground">
              ({visibleCount}/{totalCount})
            </span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-medium text-foreground">
            Manage Columns
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={showAll}
              className="h-7 px-2 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={hideAll}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              None
            </Button>
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Column list */}
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-0.5">
            {orderedColumns.map(column => {
              const isVisible = visibility[column.id] !== false;
              const isDragging = draggedId === column.id;
              const isDragOver = dragOverId === column.id;
              const isHidable = column.hidable !== false;

              return (
                <div
                  key={column.id}
                  draggable={column.reorderable !== false}
                  onDragStart={e => handleDragStart(e, column.id)}
                  onDragOver={e => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, column.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-move',
                    'transition-all duration-150',
                    isDragging && 'opacity-50 bg-muted',
                    isDragOver && 'bg-primary/10 border-t-2 border-primary',
                    !isDragging && !isDragOver && 'hover:bg-muted/50'
                  )}
                >
                  {/* Drag handle */}
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                  {/* Checkbox */}
                  <Checkbox
                    id={`col-${column.id}`}
                    checked={isVisible}
                    disabled={!isHidable}
                    onCheckedChange={() => toggleColumn(column.id)}
                    className="shrink-0"
                  />

                  {/* Label */}
                  <label
                    htmlFor={`col-${column.id}`}
                    className={cn(
                      'flex-1 text-sm cursor-pointer truncate',
                      isVisible ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {getColumnLabel(column)}
                  </label>

                  {/* Visibility indicator */}
                  {isVisible ? (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <p className="text-xs text-muted-foreground text-center">
            Drag to reorder • Click to toggle
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
