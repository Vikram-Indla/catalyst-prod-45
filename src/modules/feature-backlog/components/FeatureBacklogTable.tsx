/**
 * FeatureBacklogTable — Data table for Features
 * Matches EpicBacklogListView structure exactly
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import type { FeatureBacklogItem } from '../types';
import { FEATURE_COLUMNS, OPTIONAL_COLUMNS } from '../types';

interface FeatureBacklogTableProps {
  items: FeatureBacklogItem[];
  visibleColumns: string[];
  selectedItems: string[];
  onItemClick: (id: string) => void;
  onKeyClick?: (id: string, projectId: string | null) => void;
  onItemSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  funnel: { label: 'Funnel', className: 'bg-muted text-muted-foreground border-muted-foreground/30' },
  analyzing: { label: 'Analyzing', className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
  backlog: { label: 'Backlog', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600' },
  implementing: { label: 'In Progress', className: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30' },
  done: { label: 'Done', className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700' },
  medium: { label: 'Medium', className: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-600' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600' },
};

const HEALTH_CONFIG: Record<string, { label: string; className: string }> = {
  green: { label: 'On Track', className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300' },
  yellow: { label: 'At Risk', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300' },
  amber: { label: 'At Risk', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300' },
  red: { label: 'Off Track', className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300' },
};

export function FeatureBacklogTable({
  items,
  visibleColumns,
  selectedItems,
  onItemClick,
  onItemSelect,
  onSelectAll,
  sortField,
  sortDirection,
  onSort,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: FeatureBacklogTableProps) {
  const allColumns = [...FEATURE_COLUMNS, ...OPTIONAL_COLUMNS];
  const displayColumns = allColumns.filter(col => 
    col.pinned || visibleColumns.includes(col.id)
  );

  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const isSomeSelected = selectedItems.length > 0 && selectedItems.length < items.length;

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '–';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {/* Checkbox column */}
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) (el as any).indeterminate = isSomeSelected;
                  }}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              {/* Dynamic columns */}
              {displayColumns.map(col => (
                <TableHead
                  key={col.id}
                  className={cn(col.width, 'cursor-pointer select-none')}
                  onClick={() => onSort(col.id)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {renderSortIcon(col.id)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 1} className="text-center py-12 text-muted-foreground">
                  No features found
                </TableCell>
              </TableRow>
            ) : (
              items.map(item => (
                <TableRow
                  key={item.id}
                  onClick={() => onItemClick(item.id)}
                  data-state={selectedItems.includes(item.id) ? 'selected' : undefined}
                  className="cursor-pointer group"
                >
                  {/* Checkbox */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => onItemSelect(item.id, !!checked)}
                    />
                  </TableCell>

                  {displayColumns.map(col => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        col.id === 'key' && 'cursor-pointer',
                        col.id === 'summary' && 'font-medium hover:underline cursor-pointer',
                        'truncate'
                      )}
                    >
                      {renderCell(item, col.id)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => onPageSizeChange(parseInt(val))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>of {totalItems} features</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderCell(item: FeatureBacklogItem, columnId: string) {
  switch (columnId) {
    case 'key':
      return (
        <span className="font-mono text-sm text-[#2563eb] hover:text-[#1d4ed8] hover:underline whitespace-nowrap">
          {item.key}
        </span>
      );
    case 'summary':
      return (
        <span className="block truncate max-w-[300px]" title={item.summary}>
          {item.summary}
        </span>
      );
    case 'project':
      return (
        <span className="block truncate max-w-[150px]" title={item.project_name || ''}>
          {item.project_name || '–'}
        </span>
      );
    case 'epic':
      return (
        <span className="block truncate max-w-[150px]" title={item.epic_name || ''}>
          {item.epic_name || '–'}
        </span>
      );
    case 'status': {
      const config = STATUS_CONFIG[item.status || 'funnel'] || STATUS_CONFIG.funnel;
      return (
        <Badge variant="outline" className={cn("text-xs font-medium whitespace-nowrap", config.className)}>
          {config.label}
        </Badge>
      );
    }
    case 'priority': {
      const config = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
      return (
        <Badge variant="outline" className={cn("text-xs font-medium whitespace-nowrap", config.className)}>
          {config.label}
        </Badge>
      );
    }
    case 'assignee':
      return (
        <span className="block truncate max-w-[120px]" title={item.assignee_name || ''}>
          {item.assignee_name || '–'}
        </span>
      );
    case 'updated':
      return (
        <span className="whitespace-nowrap text-muted-foreground text-sm">
          {item.updated_at 
            ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })
            : '–'}
        </span>
      );
    case 'created':
      return (
        <span className="whitespace-nowrap text-muted-foreground text-sm">
          {item.created_at
            ? format(new Date(item.created_at), 'MMM d, yyyy')
            : '–'}
        </span>
      );
    case 'owner':
      return (
        <span className="block truncate max-w-[120px]" title={item.owner_name || ''}>
          {item.owner_name || '–'}
        </span>
      );
    case 'health': {
      const config = HEALTH_CONFIG[item.health || 'green'] || HEALTH_CONFIG.green;
      return (
        <Badge variant="outline" className={cn("text-xs font-normal whitespace-nowrap", config.className)}>
          {config.label}
        </Badge>
      );
    }
    case 'progress':
      return (
        <span className="whitespace-nowrap">{item.progress_pct || 0}%</span>
      );
    case 'planned_start':
      return (
        <span className="whitespace-nowrap text-sm">
          {item.planned_start_date
            ? format(new Date(item.planned_start_date), 'MMM d')
            : '–'}
        </span>
      );
    case 'planned_end':
      return (
        <span className="whitespace-nowrap text-sm">
          {item.planned_end_date
            ? format(new Date(item.planned_end_date), 'MMM d')
            : '–'}
        </span>
      );
    case 'change_number':
      return <span className="whitespace-nowrap">{item.change_number || '–'}</span>;
    case 'labels':
      return '–'; // TODO: Implement labels
    default:
      return '–';
  }
}
