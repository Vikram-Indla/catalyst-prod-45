/**
 * Capacity Analytics View V7
 * Monthly grid with department tabs, location column, grouped sections
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalyticsData } from './useAnalyticsData';
import { useRunRateData } from './useRunRateData';
import { AnalyticsDepartmentTabs } from './AnalyticsDepartmentTabs';
import { AnalyticsResourceRow, DepartmentGroupHeader } from './AnalyticsResourceRow';
import { MONTH_LABELS, type ViewScope, type CapacityRow } from './types';
import { LicensesRunRateWidget } from '@/components/users/LicensesRunRateWidget';

interface CapacityAnalyticsViewProps {
  departmentFilter?: string;
  onDepartmentChange?: (dept: string) => void;
  onResourceClick?: (resourceId: string) => void;
  searchQuery?: string;
}

export function CapacityAnalyticsView({ 
  departmentFilter = 'all',
  onDepartmentChange,
  onResourceClick,
  searchQuery = '',
}: CapacityAnalyticsViewProps) {
  const [viewScope, setViewScope] = useState<ViewScope>('q1');
  const year = 2026;

  const { rows, months, isLoading, isError, error } = useAnalyticsData({
    departmentFilter,
    viewScope,
    year,
  });

  // Fetch run rate data for department widgets
  const { data: runRateResources = [] } = useRunRateData();

  // Define the desired department order - Delivery before Product
  const DEPARTMENT_ORDER = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];

  // Calculate run rates by department
  const runRates = useMemo(() => {
    return DEPARTMENT_ORDER.map(dept => {
      // Filter Variable resources
      const variableResources = runRateResources.filter(r => {
        const deptMatch = r.department_name === dept;
        return deptMatch && r.resource_type?.toLowerCase() === 'variable';
      });
      
      // Filter Freelance resources
      const freelanceResources = runRateResources.filter(r => {
        const deptMatch = r.department_name === dept;
        return deptMatch && r.resource_type?.toLowerCase() === 'freelance';
      });
      
      const allInsourced = [...variableResources, ...freelanceResources];
      const missingCtcCount = allInsourced.filter(r => !r.ctc || r.ctc === 0).length;
      
      return {
        department: dept,
        monthlyRunRate: allInsourced.reduce((sum, r) => sum + (r.ctc || 0), 0),
        variableCount: variableResources.length,
        freelanceCount: freelanceResources.length,
        totalCount: allInsourced.length,
        missingCtcCount
      };
    });
  }, [runRateResources]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000).toLocaleString()}K`;
    }
    return value.toLocaleString();
  };

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

  // Filter rows by active tab and search query
  const filteredRows = useMemo(() => {
    let result = rows;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.resource.name?.toLowerCase().includes(query) ||
        r.resource.role_name?.toLowerCase().includes(query)
      );
    }
    
    // Filter by department
    if (departmentFilter !== 'all') {
      result = result.filter(r => 
        r.resource.department?.name?.toLowerCase() === departmentFilter.toLowerCase()
      );
    }
    
    return result;
  }, [rows, departmentFilter, searchQuery]);

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
    <div className="flex flex-col h-full">
      {/* Department Run Rate Widgets */}
      <section className="ct-runrate-section mb-6">
        <div className="ct-runrate-header">
          <span className="ct-runrate-title">Department Monthly Run Rates</span>
          <span className="ct-runrate-badge">
            <Users size={12} />
            Insourced
          </span>
        </div>
        
        <div className="ct-runrate-grid">
          {runRates.map(({ department, monthlyRunRate, variableCount, freelanceCount, totalCount, missingCtcCount }) => (
            <div 
              key={department} 
              className={`ct-runrate-card ${departmentFilter.toLowerCase() === department.toLowerCase() ? 'active' : ''}`}
              onClick={() => onDepartmentChange?.(department.toLowerCase())}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onDepartmentChange?.(department.toLowerCase())}
            >
              <div className="ct-runrate-dept">{department}</div>
              <div className="ct-runrate-value">
                <span className="ct-runrate-currency">ریال</span>
                <span>{formatCurrency(monthlyRunRate)}</span>
              </div>
              <div className="ct-runrate-headcount">
                <Users size={14} />
                <span>{totalCount} resources</span>
                <span className="ct-runrate-split">
                  ({variableCount} Variable{freelanceCount > 0 ? ` • ${freelanceCount} Freelance` : ''})
                </span>
              </div>
              <div className="ct-runrate-footer">
                <div className="ct-runrate-yearly">
                  <span className="ct-runrate-yearly-label">Yearly</span>
                  <span className="ct-runrate-yearly-value">
                    <span className="ct-runrate-currency">ریال</span> {formatCurrency(monthlyRunRate * 12)}
                  </span>
                </div>
                {missingCtcCount > 0 && (
                  <div className="ct-runrate-missing">
                    <AlertTriangle size={12} />
                    {missingCtcCount} missing CTC
                  </div>
                )}
              </div>
            </div>
          ))}
          <LicensesRunRateWidget />
        </div>
      </section>

      {/* Analytics Table */}
      <div className="flex flex-col flex-1 bg-card rounded-lg border border-border overflow-hidden">
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
                <th className="text-center py-3 px-3 text-xs font-semibold text-foreground uppercase tracking-wider min-w-[80px]">
                  Utilization
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
                  <td colSpan={months.length + 3} className="text-center py-16 text-muted-foreground">
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
    </div>
  );
}
