/**
 * Capacity Analytics View V7
 * Monthly grid with department tabs, location column, grouped sections
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalyticsData } from './useAnalyticsData';
import { AnalyticsDepartmentTabs } from './AnalyticsDepartmentTabs';
import { AnalyticsResourceRow, DepartmentGroupHeader } from './AnalyticsResourceRow';
import { MONTH_LABELS, type ViewScope, type CapacityRow } from './types';

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
  const [viewScope, setViewScope] = useState<ViewScope>('q1');
  const year = 2026;

  const { rows, months, isLoading, isError, error } = useAnalyticsData({
    departmentFilter,
    viewScope,
    year,
  });

  // Define the desired department order
  const DEPARTMENT_ORDER = ['Product', 'Delivery', 'Operations', 'Technical Support', 'Governance'];

  // Build department tabs with counts in specified order
  const departmentTabs = useMemo(() => {
    const deptCounts = new Map<string, number>();
    let total = 0;
    
    rows.forEach(row => {
      const dept = row.resource.department?.name || 'Other';
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
      total++;
    });

    const tabs = [{ id: 'all', name: 'All', count: total }];
    
    // Add departments in the specified order
    DEPARTMENT_ORDER.forEach(deptName => {
      const count = deptCounts.get(deptName);
      if (count !== undefined) {
        tabs.push({ id: deptName.toLowerCase(), name: deptName, count });
      }
    });

    // Add any remaining departments not in the specified order
    deptCounts.forEach((count, name) => {
      if (!DEPARTMENT_ORDER.includes(name)) {
        tabs.push({ id: name.toLowerCase(), name, count });
      }
    });

    return tabs;
  }, [rows]);

  // Filter rows by active tab
  const filteredRows = useMemo(() => {
    if (departmentFilter === 'all') return rows;
    return rows.filter(r => 
      r.resource.department?.name?.toLowerCase() === departmentFilter.toLowerCase()
    );
  }, [rows, departmentFilter]);

  // Group rows by department
  const groupedRows = useMemo(() => {
    const groups = new Map<string, CapacityRow[]>();
    
    filteredRows.forEach(row => {
      const dept = row.resource.department?.name || 'Other';
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept)!.push(row);
    });

    // Sort groups by department name
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRows]);

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
      {/* Header: Department Tabs + View Scope Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* Department Tabs */}
        <AnalyticsDepartmentTabs
          tabs={departmentTabs}
          activeTab={departmentFilter}
          onTabChange={onDepartmentChange || (() => {})}
        />

        {/* View Scope Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['q1', 'h1', 'full'] as ViewScope[]).map((scope) => (
            <Button
              key={scope}
              variant={viewScope === scope ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 px-4 text-sm font-medium',
                viewScope === scope 
                  ? 'bg-[#2563eb] text-white shadow-sm' 
                  : 'text-foreground hover:bg-background'
              )}
              onClick={() => setViewScope(scope)}
            >
              {scope === 'q1' ? 'Q1' : scope === 'h1' ? 'H1' : 'Full'}
            </Button>
          ))}
        </div>
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
            <thead className="sticky top-0 z-20 bg-card">
              {/* Column Headers */}
              <tr className="border-b border-border">
                <th className="sticky left-0 z-30 bg-card text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider min-w-[180px]">
                  Resource
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-foreground uppercase tracking-wider min-w-[100px]">
                  Location
                </th>
                {months.map((m) => (
                  <th 
                    key={`${m.year}-${m.month}`}
                    className="text-center py-3 px-2 text-xs font-semibold text-foreground uppercase tracking-wider min-w-[120px]"
                  >
                    {MONTH_LABELS[m.month - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={months.length + 2} className="text-center py-16 text-muted-foreground">
                    No resources found
                  </td>
                </tr>
              ) : (
                groupedRows.map(([deptName, deptRows]) => (
                  <>
                    {/* Department Group Header */}
                    <DepartmentGroupHeader key={`header-${deptName}`} name={deptName} />
                    {/* Department Resources */}
                    {deptRows.map((row) => (
                      <AnalyticsResourceRow 
                        key={row.resource.id} 
                        row={row}
                        onResourceClick={onResourceClick}
                      />
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
