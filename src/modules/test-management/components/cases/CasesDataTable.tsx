/**
 * Cases Data Table Component
 * Sortable data table with multi-select and pagination
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
} from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';

export type SortField = 'case_key' | 'title' | 'status' | 'priority' | 'updated_at';
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
  const allSelected = cases.length > 0 && cases.every((c) => selectedIds.has(c.id));
  const someSelected = cases.some((c) => selectedIds.has(c.id));

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

  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2">
              <TableHead className="w-10" />
              <TableHead className="w-[100px]">Key</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[120px]">Updated</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  className={cn(someSelected && !allSelected && 'data-[state=checked]:bg-primary/50')}
                />
              </TableHead>
              <SortableHeader
                field="case_key"
                label="Key"
                currentField={sortField}
                direction={sortDirection}
                onSort={onSortChange}
                className="w-[100px]"
              />
              <SortableHeader
                field="title"
                label="Title"
                currentField={sortField}
                direction={sortDirection}
                onSort={onSortChange}
              />
              <SortableHeader
                field="status"
                label="Status"
                currentField={sortField}
                direction={sortDirection}
                onSort={onSortChange}
                className="w-[110px]"
              />
              <SortableHeader
                field="priority"
                label="Priority"
                currentField={sortField}
                direction={sortDirection}
                onSort={onSortChange}
                className="w-[100px]"
              />
              <TableHead className="w-[100px]">Type</TableHead>
              <SortableHeader
                field="updated_at"
                label="Updated"
                currentField={sortField}
                direction={sortDirection}
                onSort={onSortChange}
                className="w-[120px]"
              />
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-50" />
                    <p>No test cases found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              cases.map((testCase) => {
                const statusConfig = STATUS_CONFIG[testCase.status];
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(testCase.id)}
                        aria-label={`Select ${testCase.case_key}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-primary">
                      {testCase.case_key}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{testCase.title}</span>
                        {testCase._stepCount !== undefined && testCase._stepCount > 0 && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {testCase._stepCount} steps
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {testCase.case_type?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(testCase.updated_at), { addSuffix: true })}
                    </TableCell>
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
