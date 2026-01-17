/**
 * Capacity Analytics View V7
 * Monthly/Quarterly grid showing resource allocations
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, SortAsc, SortDesc, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalyticsData } from './useAnalyticsData';
import { AnalyticsSummaryBar } from './AnalyticsSummaryBar';
import { AnalyticsResourceRow } from './AnalyticsResourceRow';
import { MONTH_LABELS, type ViewScope } from './types';

interface CapacityAnalyticsViewProps {
  departmentFilter?: string;
  onDepartmentChange?: (dept: string) => void;
  onResourceClick?: (resourceId: string) => void;
}

export function CapacityAnalyticsView({ 
  departmentFilter = 'all',
  onDepartmentChange,
  onResourceClick,
}: CapacityAnalyticsViewProps) {
  const [viewScope, setViewScope] = useState<ViewScope>('h1');
  const [sortField, setSortField] = useState<'name' | 'allocation'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const year = 2026;

  const { rows, summary, months, isLoading, isError, error } = useAnalyticsData({
    departmentFilter,
    viewScope,
    year,
  });

  // Sort rows
  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortField === 'name') {
        return sortDir === 'asc' 
          ? a.resource.name.localeCompare(b.resource.name)
          : b.resource.name.localeCompare(a.resource.name);
      }
      // Sort by first month allocation
      const aAlloc = a.months[0]?.totalPercent || 0;
      const bAlloc = b.months[0]?.totalPercent || 0;
      return sortDir === 'asc' ? aAlloc - bAlloc : bAlloc - aAlloc;
    });
    return sorted;
  }, [rows, sortField, sortDir]);

  // Toggle sort
  const toggleSort = (field: 'name' | 'allocation') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Quarter headers
  const quarters = useMemo(() => {
    const qs: { label: string; months: number[] }[] = [];
    if (viewScope === 'q1' || viewScope === 'h1' || viewScope === 'full') {
      qs.push({ label: `Q1 ${year}`, months: [1, 2, 3] });
    }
    if (viewScope === 'h1' || viewScope === 'full') {
      qs.push({ label: `Q2 ${year}`, months: [4, 5, 6] });
    }
    if (viewScope === 'full') {
      qs.push({ label: `Q3 ${year}`, months: [7, 8, 9] });
      qs.push({ label: `Q4 ${year}`, months: [10, 11, 12] });
    }
    return qs;
  }, [viewScope, year]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
        <p className="text-lg font-medium">Failed to load analytics data</p>
        <p className="text-sm">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Summary Bar */}
      <AnalyticsSummaryBar
        summary={summary}
        departmentFilter={departmentFilter}
        onDepartmentChange={onDepartmentChange || (() => {})}
      />

      {/* View Scope Toggle */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        <span className="text-xs text-muted-foreground mr-2">View:</span>
        {(['q1', 'h1', 'full'] as ViewScope[]).map((scope) => (
          <Button
            key={scope}
            variant={viewScope === scope ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => setViewScope(scope)}
          >
            {scope === 'q1' ? 'Q1' : scope === 'h1' ? 'H1' : 'Full Year'}
          </Button>
        ))}
        
        <div className="flex-1" />
        
        {/* Sort Controls */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => toggleSort('name')}
        >
          {sortField === 'name' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
          Name
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => toggleSort('allocation')}
        >
          {sortField === 'allocation' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
          Allocation
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm">
              {/* Quarter Headers */}
              <tr className="border-b border-border">
                <th className="sticky left-0 z-30 bg-muted/80 p-0 min-w-[260px]">
                  {/* Sort icons placeholder */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    <SortAsc className="w-4 h-4 text-muted-foreground" />
                    <SortDesc className="w-4 h-4 text-muted-foreground" />
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                </th>
                {quarters.map((q, idx) => (
                  <th 
                    key={q.label}
                    colSpan={q.months.filter(m => months.some(mc => mc.month === m)).length}
                    className={cn(
                      'text-center py-2 px-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400',
                      idx > 0 && 'border-l-2 border-border'
                    )}
                  >
                    {q.label}
                  </th>
                ))}
              </tr>
              {/* Month Headers */}
              <tr className="border-b border-border">
                <th className="sticky left-0 z-30 bg-muted/80 min-w-[260px]" />
                {months.map((m, idx) => {
                  // Check if this is the first month of a quarter
                  const isQuarterStart = m.month === 4 || m.month === 7 || m.month === 10;
                  return (
                    <th 
                      key={`${m.year}-${m.month}`}
                      className={cn(
                        'text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[80px]',
                        isQuarterStart && 'border-l-2 border-border'
                      )}
                    >
                      {MONTH_LABELS[m.month - 1]}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={months.length + 1} className="text-center py-16 text-muted-foreground">
                    No resources found
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <AnalyticsResourceRow 
                    key={row.resource.id} 
                    row={row}
                    onResourceClick={onResourceClick}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
