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
            "px-3 py-2 text-left text-[12px] leading-4 font-medium text-slate-500 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 last:border-r-0 group",
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
      <DropdownMenuContent align="start" className="w-52 bg-white border border-[#DFE1E6] shadow-lg rounded-[3px] p-1">
        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#172B4D] cursor-pointer hover:bg-[#F4F5F7] rounded-[3px]"
          onClick={() => onSort(field, 'asc')}
        >
          <ArrowUp className="h-4 w-4 text-[#6B778C]" />
          Sort in ascending order
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#172B4D] cursor-pointer hover:bg-[#F4F5F7] rounded-[3px]"
          onClick={() => onSort(field, 'desc')}
        >
          <ArrowDown className="h-4 w-4 text-[#6B778C]" />
          Sort in descending order
        </DropdownMenuItem>
        {isSorted && (
          <>
            <DropdownMenuSeparator className="my-1 bg-[#DFE1E6]" />
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#172B4D] cursor-pointer hover:bg-[#F4F5F7] rounded-[3px]"
              onClick={onClearSort}
            >
              <X className="h-4 w-4 text-[#6B778C]" />
              Clear sorting
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="my-1 bg-[#DFE1E6]" />
        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#172B4D] cursor-pointer hover:bg-[#F4F5F7] rounded-[3px]"
          onClick={() => onHideField(field)}
        >
          <EyeOff className="h-4 w-4 text-[#6B778C]" />
          Hide field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
