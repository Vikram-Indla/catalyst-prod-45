/**
 * Test Case Table - Phase 1 Spec Compliant
 * Sticky header, sortable columns, row selection
 * Status/Priority badges with proper colors
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  Edit,
  MoreHorizontal,
  Copy,
  Trash2,
  ArrowRight,
  ListPlus,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { TMTestCaseWithMeta, TMSortState, TestCaseStatus, TestCasePriority, TestCaseType } from '../types';

// Status colors - Spec compliant
const statusStyles: Record<TestCaseStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-[var(--bg-2)]', text: 'text-[var(--text-3)]', dot: 'bg-[var(--text-4)]' },
  ready: { bg: 'bg-[rgba(13,148,136,0.1)]', text: 'text-[#0d9488]', dot: 'bg-[#0d9488]' },
  approved: { bg: 'bg-[rgba(5,150,105,0.1)]', text: 'text-[#059669]', dot: 'bg-[#059669]' },
  deprecated: { bg: 'bg-[rgba(217,119,6,0.1)]', text: 'text-[#d97706]', dot: 'bg-[#d97706]' },
};

// Priority colors - Spec compliant
const priorityStyles: Record<TestCasePriority, { bg: string; text: string }> = {
  P1: { bg: 'bg-[rgba(220,38,38,0.1)]', text: 'text-[#dc2626]' },
  P2: { bg: 'bg-[rgba(217,119,6,0.1)]', text: 'text-[#d97706]' },
  P3: { bg: 'bg-[rgba(37,99,235,0.1)]', text: 'text-[#2563eb]' },
  P4: { bg: 'bg-[var(--bg-2)]', text: 'text-[var(--text-3)]' },
};

// Type badge colors
const typeStyles: Record<TestCaseType, { bg: string; text: string }> = {
  functional: { bg: 'bg-[rgba(37,99,235,0.1)]', text: 'text-[#2563eb]' },
  negative: { bg: 'bg-[rgba(220,38,38,0.1)]', text: 'text-[#dc2626]' },
  security: { bg: 'bg-[rgba(124,58,237,0.1)]', text: 'text-[#7c3aed]' },
  edge: { bg: 'bg-[rgba(217,119,6,0.1)]', text: 'text-[#d97706]' },
  integration: { bg: 'bg-[rgba(13,148,136,0.1)]', text: 'text-[#0d9488]' },
  api: { bg: 'bg-[rgba(6,182,212,0.1)]', text: 'text-[#06b6d4]' },
  performance: { bg: 'bg-[rgba(245,158,11,0.1)]', text: 'text-[#f59e0b]' },
  accessibility: { bg: 'bg-[rgba(16,185,129,0.1)]', text: 'text-[#10b981]' },
};

interface TestCaseTableProps {
  testCases: TMTestCaseWithMeta[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  sort: TMSortState;
  onSortChange: (column: string) => void;
  onRowClick: (testCase: TMTestCaseWithMeta) => void;
  onEdit: (testCase: TMTestCaseWithMeta) => void;
  onDuplicate: (testCase: TMTestCaseWithMeta) => void;
  onDelete: (testCase: TMTestCaseWithMeta) => void;
  onMove: (testCase: TMTestCaseWithMeta) => void;
}

interface SortableHeaderProps {
  column: string;
  label: string;
  sort: TMSortState;
  onSort: (column: string) => void;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

function SortableHeader({ column, label, sort, onSort, width, align = 'left' }: SortableHeaderProps) {
  const isActive = sort.column === column;

  return (
    <th
      className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--stroke-1)] cursor-pointer select-none group"
      style={{
        width,
        padding: '14px 16px',
        textAlign: align,
      }}
      onClick={() => onSort(column)}
    >
      <div className={cn('flex items-center gap-1', align === 'center' && 'justify-center')}>
        <span
          className="uppercase tracking-wide"
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: isActive ? 'var(--text-1)' : 'var(--text-3)',
          }}
        >
          {label}
        </span>
        {isActive && (
          sort.direction === 'asc' ? (
            <ChevronUp style={{ width: '14px', height: '14px' }} />
          ) : (
            <ChevronDown style={{ width: '14px', height: '14px' }} />
          )
        )}
      </div>
    </th>
  );
}

export function TestCaseTable({
  testCases,
  isLoading,
  selectedIds,
  onSelectionChange,
  sort,
  onSortChange,
  onRowClick,
  onEdit,
  onDuplicate,
  onDelete,
  onMove,
}: TestCaseTableProps) {
  const allSelected = testCases.length > 0 && selectedIds.size === testCases.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < testCases.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(testCases.map((tc) => tc.id)));
    }
  };

  const handleSelectRow = (id: string) => {
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
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (testCases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div
          className="rounded-full p-4 mb-4"
          style={{ background: 'var(--bg-2)' }}
        >
          <ListPlus className="h-8 w-8 text-[var(--text-4)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--text-1)] mb-1">No test cases</h3>
        <p className="text-sm text-[var(--text-3)] max-w-sm">
          Create your first test case or use AI to generate them from requirements.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
        <thead>
          <tr>
            {/* Checkbox */}
            <th
              className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--stroke-1)]"
              style={{ width: '48px', padding: '14px 12px' }}
            >
              <Checkbox
                checked={allSelected}
                // @ts-ignore - indeterminate is valid
                data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                onCheckedChange={handleSelectAll}
              />
            </th>
            <SortableHeader column="key" label="ID" sort={sort} onSort={onSortChange} width="100px" />
            <SortableHeader column="title" label="Title" sort={sort} onSort={onSortChange} />
            <SortableHeader column="status" label="Status" sort={sort} onSort={onSortChange} width="110px" />
            <SortableHeader column="priority" label="Priority" sort={sort} onSort={onSortChange} width="80px" />
            <SortableHeader column="type" label="Type" sort={sort} onSort={onSortChange} width="110px" />
            <th
              className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--stroke-1)]"
              style={{ width: '70px', padding: '14px 16px', textAlign: 'center' }}
            >
              <span className="uppercase tracking-wide text-[var(--text-3)]" style={{ fontSize: '11px', fontWeight: 600 }}>
                Steps
              </span>
            </th>
            <th
              className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--stroke-1)]"
              style={{ width: '100px', padding: '14px 16px', textAlign: 'center' }}
            >
              <span className="uppercase tracking-wide text-[var(--text-3)]" style={{ fontSize: '11px', fontWeight: 600 }}>
                Last Run
              </span>
            </th>
            <th
              className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--stroke-1)]"
              style={{ width: '80px', padding: '14px 16px' }}
            />
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc) => {
            const isSelected = selectedIds.has(tc.id);
            const status = statusStyles[tc.status];
            const priority = priorityStyles[tc.priority];
            const type = typeStyles[tc.type];

            return (
              <tr
                key={tc.id}
                className={cn(
                  'border-b border-[var(--stroke-1)] transition-colors group cursor-pointer',
                  isSelected
                    ? 'bg-[rgba(37,99,235,0.06)]'
                    : 'hover:bg-[var(--row-hover)]'
                )}
                onClick={() => onRowClick(tc)}
              >
                {/* Checkbox */}
                <td style={{ padding: '14px 12px' }} onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectRow(tc.id)}
                  />
                </td>

                {/* Key - Monospace, blue bg */}
                <td style={{ padding: '14px 16px' }}>
                  <span
                    className="font-mono text-xs px-2 py-1 rounded"
                    style={{
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: '#2563eb',
                    }}
                  >
                    {tc.key}
                  </span>
                </td>

                {/* Title with step count & assignee */}
                <td style={{ padding: '14px 16px' }}>
                  <div>
                    <div className="font-medium text-[var(--text-1)] truncate max-w-md">
                      {tc.title}
                    </div>
                    <div className="text-xs text-[var(--text-4)] mt-0.5">
                      {tc.stepCount} steps
                      {tc.assignee && ` • ${tc.assignee.fullName}`}
                    </div>
                  </div>
                </td>

                {/* Status Badge */}
                <td style={{ padding: '14px 16px' }}>
                  <Badge
                    className={cn(
                      'font-medium capitalize',
                      status.bg,
                      status.text
                    )}
                    style={{ borderRadius: '4px' }}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', status.dot)} />
                    {tc.status}
                  </Badge>
                </td>

                {/* Priority */}
                <td style={{ padding: '14px 16px' }}>
                  <Badge
                    className={cn('font-medium', priority.bg, priority.text)}
                    style={{ borderRadius: '4px' }}
                  >
                    {tc.priority}
                  </Badge>
                </td>

                {/* Type */}
                <td style={{ padding: '14px 16px' }}>
                  <Badge
                    className={cn('font-medium uppercase text-[10px]', type.bg, type.text)}
                    style={{ borderRadius: '4px' }}
                  >
                    {tc.type}
                  </Badge>
                </td>

                {/* Steps */}
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span className="text-[var(--text-2)]">{tc.stepCount}</span>
                </td>

                {/* Last Run */}
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  {tc.lastRunResult ? (
                    <Badge
                      className={cn(
                        'font-medium capitalize',
                        tc.lastRunResult === 'passed' && 'bg-[rgba(5,150,105,0.1)] text-[#059669]',
                        tc.lastRunResult === 'failed' && 'bg-[rgba(220,38,38,0.1)] text-[#dc2626]',
                        tc.lastRunResult === 'blocked' && 'bg-[rgba(217,119,6,0.1)] text-[#d97706]',
                        tc.lastRunResult === 'skipped' && 'bg-[var(--bg-2)] text-[var(--text-3)]'
                      )}
                      style={{ borderRadius: '4px' }}
                    >
                      {tc.lastRunResult}
                    </Badge>
                  ) : (
                    <span className="text-[var(--text-4)]">—</span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(tc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onDuplicate(tc)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMove(tc)}>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Move to Folder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(tc)}
                          className="text-[#dc2626] focus:text-[#dc2626]"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TestCaseTable;
