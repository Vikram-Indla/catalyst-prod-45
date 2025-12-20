import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BulkAction } from '../types';

interface BulkActionsBarProps<T> {
  selectedCount: number;
  bulkActions: BulkAction<T>[];
  selectedRows: T[];
  onAction: (actionId: string) => void;
  onClearSelection: () => void;
  className?: string;
}

export function BulkActionsBar<T>({
  selectedCount,
  bulkActions,
  selectedRows,
  onAction,
  onClearSelection,
  className,
}: BulkActionsBarProps<T>) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2 bg-muted/50 border-b",
      "animate-in slide-in-from-top-2 duration-200",
      className
    )}>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
        
        <div className="flex items-center gap-2">
          {bulkActions.map((action) => {
            const isDisabled = typeof action.disabled === 'function'
              ? action.disabled(selectedRows)
              : action.disabled;
              
            return (
              <Button
                key={action.id}
                variant={action.danger ? "destructive" : "secondary"}
                size="sm"
                onClick={() => onAction(action.id)}
                disabled={isDisabled}
                className={cn(
                  "h-7 text-xs",
                  action.danger && "hover:bg-destructive/90"
                )}
              >
                {action.icon && <span className="mr-1.5">{action.icon}</span>}
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onClearSelection}
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
