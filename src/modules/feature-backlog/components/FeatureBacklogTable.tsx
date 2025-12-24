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
  funnel: { label: 'Funnel', className: 'bg-muted text-muted-foreground' },
  analyzing: { label: 'Analyzing', className: 'bg-blue-500/10 text-blue-600' },
  backlog: { label: 'Backlog', className: 'bg-slate-500/10 text-slate-600' },
  implementing: { label: 'In Progress', className: 'bg-brand-primary/10 text-brand-primary' },
  done: { label: 'Done', className: 'bg-status-success/10 text-status-success' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-status-danger/10 text-status-danger' },
  high: { label: 'High', className: 'bg-status-warning/10 text-status-warning' },
  medium: { label: 'Medium', className: 'bg-muted text-muted-foreground' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
};

const HEALTH_CONFIG: Record<string, { label: string; className: string }> = {
  green: { label: 'On Track', className: 'bg-status-success/10 text-status-success' },
  yellow: { label: 'At Risk', className: 'bg-status-warning/10 text-status-warning' },
  amber: { label: 'At Risk', className: 'bg-status-warning/10 text-status-warning' },
  red: { label: 'Off Track', className: 'bg-status-danger/10 text-status-danger' },
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
                      onClick={() => col.id === 'key' || col.id === 'summary' ? onItemClick(item.id) : undefined}
                      className={cn(
                        col.id === 'summary' && 'font-medium hover:underline cursor-pointer'
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
        <span className="font-mono text-sm text-gold-link hover:text-gold-link-hover">
          {item.key}
        </span>
      );
    case 'summary':
      return item.summary;
    case 'project':
      return item.project_name || '–';
    case 'epic':
      return item.epic_name || '–';
    case 'status': {
      const config = STATUS_CONFIG[item.status || 'funnel'] || STATUS_CONFIG.funnel;
      return (
        <Badge variant="secondary" className={cn("text-xs font-normal", config.className)}>
          {config.label}
        </Badge>
      );
    }
    case 'priority': {
      const config = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
      return (
        <Badge variant="secondary" className={cn("text-xs font-normal", config.className)}>
          {config.label}
        </Badge>
      );
    }
    case 'assignee':
      return item.assignee_name || '–';
    case 'updated':
      return item.updated_at 
        ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })
        : '–';
    case 'created':
      return item.created_at
        ? format(new Date(item.created_at), 'MMM d, yyyy')
        : '–';
    case 'owner':
      return item.owner_name || '–';
    case 'health': {
      const config = HEALTH_CONFIG[item.health || 'green'] || HEALTH_CONFIG.green;
      return (
        <Badge variant="outline" className={cn("text-xs font-normal", config.className)}>
          {config.label}
        </Badge>
      );
    }
    case 'progress':
      return `${item.progress_pct || 0}%`;
    case 'planned_start':
      return item.planned_start_date
        ? format(new Date(item.planned_start_date), 'MMM d')
        : '–';
    case 'planned_end':
      return item.planned_end_date
        ? format(new Date(item.planned_end_date), 'MMM d')
        : '–';
    case 'change_number':
      return item.change_number || '–';
    case 'labels':
      return '–'; // TODO: Implement labels
    default:
      return '–';
  }
}
