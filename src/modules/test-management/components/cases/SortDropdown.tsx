/**
 * Sort Dropdown Component
 * Visual sort selector for test cases list
 */

import { Check, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SortField, SortDirection } from './CasesDataTable';

interface SortOption {
  field: SortField;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'updated_at', label: 'Updated' },
  { field: 'created_at', label: 'Created' },
  { field: 'case_key', label: 'Key' },
  { field: 'title', label: 'Title' },
  { field: 'priority', label: 'Priority' },
  { field: 'status', label: 'Status' },
];

interface SortDropdownProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
}

export function SortDropdown({ sortField, sortDirection, onSortChange }: SortDropdownProps) {
  const currentOption = SORT_OPTIONS.find((opt) => opt.field === sortField);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span>{currentOption?.label || 'Sort'}</span>
          <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.field}
            onClick={() => onSortChange(option.field)}
            className={cn(
              'gap-2',
              sortField === option.field && 'font-medium'
            )}
          >
            {sortField === option.field ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <div className="w-4" />
            )}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
