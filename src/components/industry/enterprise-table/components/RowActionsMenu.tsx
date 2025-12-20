import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RowAction } from '../types';

interface RowActionsMenuProps<T> {
  row: T;
  actions: RowAction<T>[];
  onAction?: (actionId: string, row: T) => void;
}

export function RowActionsMenu<T>({
  row,
  actions,
  onAction,
}: RowActionsMenuProps<T>) {
  // Filter hidden actions
  const visibleActions = actions.filter(action => {
    if (typeof action.hidden === 'function') {
      return !action.hidden(row);
    }
    return !action.hidden;
  });

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {visibleActions.map((action, index) => {
          const isDisabled = typeof action.disabled === 'function'
            ? action.disabled(row)
            : action.disabled;

          return (
            <React.Fragment key={action.id}>
              {action.divider && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(row);
                  onAction?.(action.id, row);
                }}
                disabled={isDisabled}
                className={cn(
                  action.danger && "text-destructive focus:text-destructive focus:bg-destructive/10"
                )}
              >
                {action.icon && (
                  <span className="mr-2">{action.icon}</span>
                )}
                {action.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple edit-only menu for legacy support
export function SimpleRowActionsMenu({ 
  onEdit 
}: { 
  onEdit: () => void 
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          Edit Row
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
