/**
 * Assignment Table View - Comprehensive table with inline editing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { TableToolbar } from './TableToolbar';
import { BulkActionsBar } from './BulkActionsBar';
import { AssignmentRow } from './AssignmentRow';
import { ColumnCustomizer } from './ColumnCustomizer';
import { TablePagination } from './TablePagination';
import { useAssignmentTable } from '@/hooks/test-cycles/useAssignmentTable';
import { useInlineEdit } from '@/hooks/test-cycles/useInlineEdit';
import { useBulkActions } from '@/hooks/test-cycles/useBulkActions';
import { DEFAULT_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '@/types/assignment-table.types';
import type { SortDirection, TeamMemberOption, TestPriority, TestStatus } from '@/types/assignment-table.types';

interface AssignmentTableViewProps {
  cycleId: string;
}

// Mock team members
const MOCK_TEAM_MEMBERS: TeamMemberOption[] = [
  { id: 'u1', name: 'Ahmed S.', avatar: null, workload: 18 },
  { id: 'u2', name: 'Sara M.', avatar: null, workload: 12 },
  { id: 'u3', name: 'Omar K.', avatar: null, workload: 15 },
  { id: 'u4', name: 'Fatima R.', avatar: null, workload: 20 },
];

export function AssignmentTableView({ cycleId }: AssignmentTableViewProps) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const stored = localStorage.getItem('assignment-table-columns');
    return stored ? JSON.parse(stored) : [...DEFAULT_VISIBLE_COLUMNS];
  });

  // Save column preferences
  useEffect(() => {
    localStorage.setItem('assignment-table-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Hooks
  const {
    data,
    totalCount,
    filteredCount,
    isLoading,
    filters,
    setFilters,
    filterOptions,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isAllSelected,
  } = useAssignmentTable(cycleId);

  const inlineEdit = useInlineEdit(cycleId);
  const { bulkUpdate, bulkRemove } = useBulkActions(cycleId);

  // Handle column sort
  const handleSort = (columnId: string) => {
    if (!DEFAULT_COLUMNS.find(c => c.id === columnId)?.sortable) return;
    
    if (sort.column === columnId) {
      setSort({
        column: columnId,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSort({ column: columnId, direction: 'asc' });
    }
  };

  // Handle export
  const handleExport = (format: 'csv' | 'xlsx') => {
    toast.success(`Exporting as ${format.toUpperCase()}...`);
    // In real implementation, generate and download file
  };

  // Bulk action handlers
  const handleBulkAssign = (userId: string | null) => {
    bulkUpdate.mutate({
      ids: Array.from(selectedIds),
      updates: { assigneeId: userId },
    });
    clearSelection();
  };

  const handleBulkPriority = (priority: TestPriority) => {
    bulkUpdate.mutate({
      ids: Array.from(selectedIds),
      updates: { priority },
    });
    clearSelection();
  };

  const handleBulkStatus = (status: TestStatus) => {
    bulkUpdate.mutate({
      ids: Array.from(selectedIds),
      updates: { status },
    });
    clearSelection();
  };

  const handleBulkDueDate = (date: Date | null) => {
    bulkUpdate.mutate({
      ids: Array.from(selectedIds),
      updates: { dueDate: date?.toISOString() || null },
    });
    clearSelection();
  };

  const handleBulkRemove = () => {
    bulkRemove.mutate(Array.from(selectedIds));
    clearSelection();
  };

  // Get sort icon for column
  const getSortIcon = (columnId: string) => {
    if (sort.column !== columnId) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50" />;
    }
    return sort.direction === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5" style={{ color: CATALYST_V5.primary }} />
      : <ArrowDown className="h-3.5 w-3.5" style={{ color: CATALYST_V5.primary }} />;
  };

  // Get visible column definitions
  const columns = DEFAULT_COLUMNS.filter(col => visibleColumns.includes(col.id));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <TableToolbar
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        totalCount={totalCount}
        filteredCount={filteredCount}
        onExport={handleExport}
        onColumnsClick={() => setColumnsOpen(true)}
        hasSelection={selectedIds.size > 0}
      />

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          teamMembers={MOCK_TEAM_MEMBERS}
          onAssign={handleBulkAssign}
          onChangePriority={handleBulkPriority}
          onChangeStatus={handleBulkStatus}
          onSetDueDate={handleBulkDueDate}
          onRemove={handleBulkRemove}
          onClearSelection={clearSelection}
        />
      )}

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: CATALYST_V5.slate[50] }}>
              <tr>
                {columns.map(column => (
                  <th
                    key={column.id}
                    className={cn(
                      "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider group",
                      column.sortable && "cursor-pointer hover:bg-slate-100 transition-colors",
                      column.sticky === 'left' && "sticky left-0 z-10",
                      column.sticky === 'right' && "sticky right-0 z-10"
                    )}
                    style={{ 
                      color: CATALYST_V5.slate[500],
                      width: column.width,
                      minWidth: column.width,
                      backgroundColor: column.sticky ? CATALYST_V5.slate[50] : undefined,
                    }}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    {column.id === 'select' ? (
                      <Checkbox 
                        checked={isAllSelected} 
                        onCheckedChange={selectAll}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span>{column.label}</span>
                        {column.sortable && getSortIcon(column.id)}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: CATALYST_V5.slate[100] }}>
              {data.map((assignment, index) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  index={index}
                  isSelected={selectedIds.has(assignment.id)}
                  onSelect={(shiftKey) => toggleSelect(assignment.id, index, shiftKey)}
                  onEdit={(field, value) => {
                    inlineEdit.mutate({ 
                      assignmentId: assignment.id, 
                      field: field as any, 
                      value 
                    });
                  }}
                  onOpenDetails={() => {
                    toast.info(`Opening details for ${assignment.testCaseCode}`);
                  }}
                  teamMembers={MOCK_TEAM_MEMBERS}
                  visibleColumns={visibleColumns}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        {data.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: CATALYST_V5.slate[500] }}>
              No test cases found matching your criteria
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalCount={filteredCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Column Customizer */}
      <ColumnCustomizer
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
      />
    </div>
  );
}
