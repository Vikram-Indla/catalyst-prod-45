/**
 * Cases Data Table Component
 * Sortable data table with dynamic columns, multi-select and pagination
 */

import React from 'react';
import {
  FileText,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  PlayCircle,
  Sparkles,
  Folder,
  Tag,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TestCase, CaseStatus } from '../../api/types';
import { formatTimestamp } from '@/lib/formatTimestamp';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';
import { TEST_CASE_COLUMNS, ColumnConfig } from '../../config/columnConfig';
import { TraceabilityCell, LinkedItem } from './TraceabilityCell';

export type SortField = 'case_key' | 'title' | 'status' | 'priority' | 'updated_at' | 'created_at';
export type SortDirection = 'asc' | 'desc';

interface CasesDataTableProps {
  cases: TestCase[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRowClick: (testCase: TestCase) => void;
  onEdit: (testCase: TestCase) => void;
  onDuplicate: (testCase: TestCase) => void;
  onDelete: (testCase: TestCase) => void;
  onAddToCycle: (testCase: TestCase) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ready: { label: 'Ready', className: 'bg-info/10 text-info border-info/20' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success border-success/20' },
  needs_update: { label: 'Needs Update', className: 'bg-warning/10 text-warning border-warning/20' },
  deprecated: { label: 'Deprecated', className: 'bg-danger/10 text-danger border-danger/20' },
};

function SortableHeader({
  field,
  label,
  currentField,
  direction,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <TableHead className={cn('cursor-pointer select-none', className)} onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {isActive &&
          (direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ))}
      </div>
    </TableHead>
  );
}

export function CasesDataTable({
  cases,
  isLoading,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onEdit,
  onDuplicate,
  onDelete,
  onAddToCycle,
  sortField,
  sortDirection,
  onSortChange,
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: CasesDataTableProps) {
  const { isColumnVisible } = useColumnPreferences();
  const allSelected = cases.length > 0 && cases.every((c) => selectedIds.has(c.id));
  const someSelected = cases.some((c) => selectedIds.has(c.id));

  // Get visible columns in order
  const visibleColumns = TEST_CASE_COLUMNS.filter(col => isColumnVisible(col.key));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(cases.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  // Render a header cell based on column config
  const renderHeader = (col: ColumnConfig) => {
    if (col.key === 'checkbox') {
      return (
        <TableHead key={col.key} className={col.width}>
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all"
            className={cn(someSelected && !allSelected && 'data-[state=checked]:bg-primary/50')}
          />
        </TableHead>
      );
    }

    if (col.sortable && col.sortField) {
      return (
        <SortableHeader
          key={col.key}
          field={col.sortField as SortField}
          label={col.label}
          currentField={sortField}
          direction={sortDirection}
          onSort={onSortChange}
          className={col.width}
        />
      );
    }

    return (
      <TableHead key={col.key} className={col.width}>
        {col.label}
      </TableHead>
    );
  };

  // Render a cell based on column key
  const renderCell = (col: ColumnConfig, testCase: TestCase) => {
    const statusConfig = STATUS_CONFIG[testCase.status] || STATUS_CONFIG.draft;
    const isSelected = selectedIds.has(testCase.id);

    switch (col.key) {
      case 'checkbox':
        return (
          <TableCell key={col.key} onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleOne(testCase.id)}
              aria-label={`Select ${testCase.case_key}`}
            />
          </TableCell>
        );

      case 'key':
        return (
          <TableCell key={col.key} className="font-mono text-sm text-primary">
            {testCase.case_key}
          </TableCell>
        );

      case 'title':
        return (
          <TableCell key={col.key} className="font-medium">
            <div className="flex items-center gap-2">
              {testCase.is_ai_generated ? (
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{testCase.title}</span>
              {testCase._stepCount !== undefined && testCase._stepCount > 0 && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {testCase._stepCount} steps
                </Badge>
              )}
            </div>
          </TableCell>
        );

      case 'folder':
        return (
          <TableCell key={col.key} className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 opacity-60" />
              <span className="truncate max-w-[100px]">
                {testCase.folder?.name || 'Root'}
              </span>
            </div>
          </TableCell>
        );

      case 'status':
        return (
          <TableCell key={col.key}>
            <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </TableCell>
        );

      case 'priority':
        return (
          <TableCell key={col.key}>
            {testCase.priority ? (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: testCase.priority.color || '#888' }}
                />
                <span className="text-sm">{testCase.priority.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );

      case 'type':
        return (
          <TableCell key={col.key} className="text-sm text-muted-foreground">
            {testCase.case_type?.name || '—'}
          </TableCell>
        );

      case 'assigned_to':
        return (
          <TableCell key={col.key} className="text-sm">
            {(testCase as any).assigned_user ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={(testCase as any).assigned_user.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(testCase as any).assigned_user.full_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[80px]">
                  {(testCase as any).assigned_user.full_name?.split(' ')[0]}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </TableCell>
        );

      case 'traceability':
        return (
          <TableCell key={col.key}>
            <TraceabilityCell 
              linkedItems={(testCase as any).linked_items || []} 
              onItemClick={(item) => {
                // TODO: Navigate to linked item
                console.log('Navigate to:', item);
              }}
            />
          </TableCell>
        );

      case 'created_at':
        return (
          <TableCell key={col.key} className="text-sm text-muted-foreground whitespace-nowrap">
            {formatTimestamp(testCase.created_at)}
          </TableCell>
        );

      case 'updated_at':
        return (
          <TableCell key={col.key} className="text-sm text-muted-foreground whitespace-nowrap">
            {formatTimestamp(testCase.updated_at)}
          </TableCell>
        );

      case 'created_by':
        return (
          <TableCell key={col.key} className="text-sm">
            {(testCase as any).created_by_user ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={(testCase as any).created_by_user.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(testCase as any).created_by_user.full_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[80px]">
                  {(testCase as any).created_by_user.full_name}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );

      case 'tags':
        return (
          <TableCell key={col.key}>
            {(testCase as any).tags?.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {(testCase as any).tags.slice(0, 2).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
                {(testCase as any).tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{(testCase as any).tags.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );

      case 'steps_count':
        return (
          <TableCell key={col.key} className="text-sm text-muted-foreground">
            {testCase._stepCount !== undefined ? `${testCase._stepCount} steps` : '—'}
          </TableCell>
        );

      default:
        return <TableCell key={col.key}>—</TableCell>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2">
              {visibleColumns.map((col) => (
                <TableHead key={col.key} className={col.width}>
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {visibleColumns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-full max-w-[100px]" />
                  </TableCell>
                ))}
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-surface-2 z-10">
            <TableRow className="hover:bg-surface-2">
              {visibleColumns.map(renderHeader)}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
            <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-50" />
                    <p>No test cases found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              cases.map((testCase) => {
                const isSelected = selectedIds.has(testCase.id);

                return (
                  <TableRow
                    key={testCase.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected && 'bg-primary/5'
                    )}
                    onClick={() => onRowClick(testCase)}
                  >
                    {visibleColumns.map((col) => renderCell(col, testCase))}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(testCase)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicate(testCase)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAddToCycle(testCase)}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Add to Cycle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(testCase)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-3 border-t border-border-subtle bg-surface-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalItems} items)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CasesDataTable;
