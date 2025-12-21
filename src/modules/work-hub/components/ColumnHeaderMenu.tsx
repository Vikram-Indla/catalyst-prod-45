import React from 'react';
import { ArrowUp, ArrowDown, X, EyeOff, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ColumnHeaderMenuProps {
  field: string;
  label: string;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onClearSort: () => void;
  onHideField: (field: string) => void;
  className?: string;
}

export function ColumnHeaderMenu({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
  onClearSort,
  onHideField,
  className,
}: ColumnHeaderMenuProps) {
  const isSorted = sortField === field;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <th
          className={cn(
            "px-3 py-2 text-left text-[12px] leading-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted select-none whitespace-nowrap border-b border-r border-border bg-muted/50 last:border-r-0 group",
            className
          )}
        >
          <div className="flex items-center gap-1">
            <span>{label}</span>
            {isSorted && (
              sortDirection === 'asc' 
                ? <ArrowUp className="h-3 w-3" /> 
                : <ArrowDown className="h-3 w-3" />
            )}
            <Plus className="h-3 w-3 opacity-0 group-hover:opacity-50 ml-auto" />
          </div>
        </th>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 bg-popover border border-border shadow-lg rounded-md p-1">
        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted rounded-md"
          onClick={() => onSort(field, 'asc')}
        >
          <ArrowUp className="h-4 w-4 text-muted-foreground" />
          Sort in ascending order
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted rounded-md"
          onClick={() => onSort(field, 'desc')}
        >
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
          Sort in descending order
        </DropdownMenuItem>
        {isSorted && (
          <>
            <DropdownMenuSeparator className="my-1 bg-border" />
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted rounded-md"
              onClick={onClearSort}
            >
              <X className="h-4 w-4 text-muted-foreground" />
              Clear sorting
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="my-1 bg-border" />
        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted rounded-md"
          onClick={() => onHideField(field)}
        >
          <EyeOff className="h-4 w-4 text-muted-foreground" />
          Hide field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
