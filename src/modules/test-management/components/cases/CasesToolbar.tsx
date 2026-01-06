/**
 * Cases Toolbar Component
 * Search, filters, view toggle, and bulk actions
 */

import React from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  LayoutList,
  Plus,
  ChevronDown,
  Copy,
  FolderInput,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CaseStatus } from '../../api/types';

export interface CasesFilters {
  status: CaseStatus[];
  priorityIds: string[];
  typeIds: string[];
  search: string;
}

interface CasesToolbarProps {
  filters: CasesFilters;
  onFiltersChange: (filters: CasesFilters) => void;
  viewMode: 'table' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;
  selectedCount: number;
  onCreateCase: () => void;
  onBulkCopy: () => void;
  onBulkMove: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  onClearSelection: () => void;
  onImport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  priorities?: { id: string; name: string; color: string }[];
  caseTypes?: { id: string; name: string }[];
}

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_update', label: 'Needs Update' },
  { value: 'deprecated', label: 'Deprecated' },
];

export function CasesToolbar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  onCreateCase,
  onBulkCopy,
  onBulkMove,
  onBulkDelete,
  onBulkExport,
  onClearSelection,
  onImport,
  onRefresh,
  isRefreshing = false,
  priorities = [],
  caseTypes = [],
}: CasesToolbarProps) {
  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.priorityIds.length > 0 ||
    filters.typeIds.length > 0;

  const toggleStatus = (status: CaseStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const togglePriority = (priorityId: string) => {
    const newPriorities = filters.priorityIds.includes(priorityId)
      ? filters.priorityIds.filter((p) => p !== priorityId)
      : [...filters.priorityIds, priorityId];
    onFiltersChange({ ...filters, priorityIds: newPriorities });
  };

  const toggleType = (typeId: string) => {
    const newTypes = filters.typeIds.includes(typeId)
      ? filters.typeIds.filter((t) => t !== typeId)
      : [...filters.typeIds, typeId];
    onFiltersChange({ ...filters, typeIds: newTypes });
  };

  const clearFilters = () => {
    onFiltersChange({ ...filters, status: [], priorityIds: [], typeIds: [] });
  };

  return (
    <div
      className="flex items-center gap-3 px-3 bg-surface-0"
      style={{
        height: '52px',
        borderBottom: '1px solid var(--divider, hsl(var(--border)))',
      }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search test cases..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.status.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status.includes(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Priority
            {filters.priorityIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.priorityIds.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {priorities.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority.id}
              checked={filters.priorityIds.includes(priority.id)}
              onCheckedChange={() => togglePriority(priority.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: priority.color }}
                />
                {priority.name}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Type
            {filters.typeIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.typeIds.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {caseTypes.map((type) => (
            <DropdownMenuCheckboxItem
              key={type.id}
              checked={filters.typeIds.includes(type.id)}
              onCheckedChange={() => toggleType(type.id)}
            >
              {type.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      <div className="flex-1" />

      {/* Bulk Actions (when items selected) */}
      {selectedCount > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-7 px-2">
              {selectedCount} selected
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Bulk Actions
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onBulkCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBulkMove}>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onBulkDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* View Toggle */}
      <div className="flex items-center border border-border rounded-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('table')}
          className={cn(
            'h-8 px-2 rounded-r-none',
            viewMode === 'table' && 'bg-accent'
          )}
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('card')}
          className={cn(
            'h-8 px-2 rounded-l-none',
            viewMode === 'card' && 'bg-accent'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      {/* Refresh Button */}
      {onRefresh && (
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      )}

      {/* Import Button */}
      {onImport && (
        <Button variant="outline" size="sm" onClick={onImport}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      )}

      {/* New Case Button */}
      <Button onClick={onCreateCase} className="gap-2">
        <Plus className="h-4 w-4" />
        New Case
      </Button>
    </div>
  );
}

export default CasesToolbar;
