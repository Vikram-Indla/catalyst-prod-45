/**
 * Capacity Analytics View V7
 * Monthly grid with department tabs, location column, grouped sections
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Users, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalyticsData } from './useAnalyticsData';
import { useRunRateData, type RunRateResource } from './useRunRateData';
import { AnalyticsDepartmentTabs } from './AnalyticsDepartmentTabs';
import { AnalyticsResourceRow, DepartmentGroupHeader } from './AnalyticsResourceRow';
import { MONTH_LABELS, type ViewScope, type CapacityRow } from './types';
import { LicensesRunRateWidget } from '@/components/users/LicensesRunRateWidget';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMonths, parseISO } from 'date-fns';

type CategoryFilter = 'insourced' | 'cosourced' | 'outsourced' | 'licenses' | null;

interface CapacityAnalyticsViewProps {
  departmentFilter?: string;
  onDepartmentChange?: (dept: string) => void;
  onResourceClick?: (resourceId: string) => void;
  searchQuery?: string;
  hideWidgets?: boolean;
}

export function CapacityAnalyticsView({ 
  departmentFilter = 'all',
  onDepartmentChange,
  onResourceClick,
  searchQuery = '',
  hideWidgets = false,
}: CapacityAnalyticsViewProps) {
  const [viewScope, setViewScope] = useState<ViewScope>('full');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('insourced');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const year = 2026;

  const { rows, months, isLoading, isError, error } = useAnalyticsData({
    departmentFilter,
    viewScope,
    year,
  });

  // Fetch run rate data for department widgets
  const { data: runRateResources = [] } = useRunRateData();

  // Fetch assignments for category totals
  const { data: assignments = [] } = useQuery({
    queryKey: ['capacity-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('id, name, assignment_type, budget, payment_status, resource_vendors(name)')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch licenses for totals
  const { data: licenses = [] } = useQuery({
    queryKey: ['capacity-licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('software_licenses')
        .select('id, annual_cost');
      if (error) throw error;
      return data || [];
    },
  });

  // Define the desired department order
  const DEPARTMENT_ORDER = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];

  // Get period months for calculation
  const periodMonths = viewScope === 'q1' ? 3 : viewScope === 'h1' ? 6 : 12;
  const periodLabel = viewScope === 'q1' ? 'Q1' : viewScope === 'h1' ? 'H1' : 'Full Year';

  // Calculate period total for a resource based on CTC and contract end date
  const calculatePeriodTotal = (resource: RunRateResource): number => {
    if (!resource.ctc) return 0;
    
    const startDate = new Date(year, 0, 1); // Jan 1, 2026
    const periodEndDate = new Date(year, periodMonths - 1, 31); // End of period
    
    if (resource.contract_end_date) {
      const contractEnd = parseISO(resource.contract_end_date);
      // Calculate months remaining in the period
      const effectiveEnd = contractEnd < periodEndDate ? contractEnd : periodEndDate;
      const monthsRemaining = Math.max(0, differenceInMonths(effectiveEnd, startDate) + 1);
      const effectiveMonths = Math.min(monthsRemaining, periodMonths);
      return resource.ctc * effectiveMonths;
    }
    
    // No contract end date - assume full period
    return resource.ctc * periodMonths;
  };

  // Get insourced resources for breakdown - filtered by department when selected
  const insourcedResources = useMemo(() => {
    let filtered = runRateResources.filter(r => 
      r.resource_type?.toLowerCase() === 'variable' || r.resource_type?.toLowerCase() === 'freelance'
    );
    
    // Apply department filter when not 'all'
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(r => 
        r.department_name?.toLowerCase() === departmentFilter.toLowerCase()
      );
    }
    
    return filtered;
  }, [runRateResources, departmentFilter]);

  // Calculate category totals
  const categoryTotals = useMemo(() => {
    const insourcedTotal = insourcedResources.reduce((sum, r) => sum + calculatePeriodTotal(r), 0);
    const insourcedCount = insourcedResources.length;
    const missingCtc = insourcedResources.filter(r => !r.ctc || r.ctc === 0).length;

    const cosourcedAssignments = assignments.filter(a => a.assignment_type?.toLowerCase().includes('cosourced'));
    const cosourcedTotal = cosourcedAssignments.reduce((sum, a) => sum + (a.budget || 0), 0);

    const outsourcedAssignments = assignments.filter(a => a.assignment_type?.toLowerCase().includes('outsourced'));
    const outsourcedTotal = outsourcedAssignments.reduce((sum, a) => sum + (a.budget || 0), 0);
    
    // Calculate paid vs unpaid for outsourced
    const outsourcedPaid = outsourcedAssignments.filter(a => a.payment_status?.toLowerCase() === 'paid');
    const outsourcedUnpaid = outsourcedAssignments.filter(a => a.payment_status?.toLowerCase() !== 'paid');
    const outsourcedPaidTotal = outsourcedPaid.reduce((sum, a) => sum + (a.budget || 0), 0);
    const outsourcedUnpaidTotal = outsourcedUnpaid.reduce((sum, a) => sum + (a.budget || 0), 0);

    const licensesTotal = licenses.reduce((sum, l) => sum + (l.annual_cost || 0), 0);
    const licensesMonthly = licensesTotal / 12;
    const licensesPeriodTotal = licensesMonthly * periodMonths;

    return {
      insourced: { total: insourcedTotal, count: insourcedCount, missing: missingCtc },
      cosourced: { total: cosourcedTotal, count: cosourcedAssignments.length },
      outsourced: { 
        total: outsourcedTotal, 
        count: outsourcedAssignments.length, 
        assignments: outsourcedAssignments,
        paidTotal: outsourcedPaidTotal,
        unpaidTotal: outsourcedUnpaidTotal,
        paidCount: outsourcedPaid.length,
        unpaidCount: outsourcedUnpaid.length,
      },
      licenses: { total: licensesPeriodTotal, count: licenses.length, monthly: licensesMonthly },
    };
  }, [insourcedResources, assignments, licenses, periodMonths]);

  // Calculate run rates by department (using period totals)
  const runRates = useMemo(() => {
    return DEPARTMENT_ORDER.map(dept => {
      const deptResources = insourcedResources.filter(r => r.department_name === dept);
      const periodTotal = deptResources.reduce((sum, r) => sum + calculatePeriodTotal(r), 0);
      const missingCtcCount = deptResources.filter(r => !r.ctc || r.ctc === 0).length;
      
      return {
        department: dept,
        periodTotal,
        totalCount: deptResources.length,
        missingCtcCount
      };
    });
  }, [insourcedResources, periodMonths]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
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

    const tabs = [{ id: 'all', name: 'All Departments', count: total }];
    
    DEPARTMENT_ORDER.forEach(deptName => {
      const count = deptCounts.get(deptName);
      if (count !== undefined) {
        tabs.push({ id: deptName.toLowerCase(), name: deptName, count });
      }
    });

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
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.resource.name?.toLowerCase().includes(query) ||
        r.resource.role_name?.toLowerCase().includes(query)
      );
    }
    
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
      {/* TOP ROW: Category Widgets (Insourced, Cosourced, Outsourced, Licenses) - Hidden in Utilization view */}
      {!hideWidgets && (
      <section className="ct-category-section mb-4">
        <div className="ct-category-grid">
          {/* Insourced Card */}
          <div 
            className={cn("ct-category-card insourced", activeCategory === 'insourced' && "active")}
            onClick={() => {
              if (activeCategory === 'insourced') {
                setActiveCategory(null);
                setShowBreakdown(false);
              } else {
                setActiveCategory('insourced');
                setShowBreakdown(true);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="ct-category-header">
              <span className="ct-category-title">INSOURCED</span>
              <span className="ct-category-badge blue">{categoryTotals.insourced.count} Resources</span>
              {activeCategory === 'insourced' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            <div className="ct-category-value blue">{formatCurrency(categoryTotals.insourced.total)}</div>
            <div className="ct-category-sub">SAR • CTC × Duration to Contract End</div>
            <div className="ct-category-detail">Variable & Freelance contracts • {categoryTotals.insourced.count} resources</div>
          </div>

          {/* Cosourced Card */}
          <div 
            className={cn("ct-category-card cosourced", activeCategory === 'cosourced' && "active")}
            onClick={() => {
              setActiveCategory(activeCategory === 'cosourced' ? null : 'cosourced');
              setShowBreakdown(false);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="ct-category-header">
              <span className="ct-category-title">COSOURCED</span>
              <span className="ct-category-badge violet">{categoryTotals.cosourced.count} Assignment{categoryTotals.cosourced.count !== 1 ? 's' : ''}</span>
              <ChevronDown size={16} />
            </div>
            <div className="ct-category-value violet">{formatCurrency(categoryTotals.cosourced.total)}</div>
            <div className="ct-category-sub">SAR • Fixed Vendor Budget</div>
          </div>

          {/* Outsourced Card */}
          <div 
            className={cn("ct-category-card outsourced", activeCategory === 'outsourced' && "active")}
            onClick={() => {
              setActiveCategory(activeCategory === 'outsourced' ? null : 'outsourced');
              setShowBreakdown(false);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="ct-category-header">
              <span className="ct-category-title">OUTSOURCED</span>
              <span className="ct-category-badge teal">{categoryTotals.outsourced.count} Assignments</span>
              {activeCategory === 'outsourced' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            <div className="ct-category-value teal">{formatCurrency(categoryTotals.outsourced.total)}</div>
            <div className="ct-category-sub">SAR • Fixed Contract</div>
            {/* Paid/Unpaid breakdown */}
            <div className="ct-category-detail flex items-center gap-3 mt-1">
              {categoryTotals.outsourced.paidCount > 0 && (
                <span className="text-emerald-600">
                  Paid: {formatCurrency(categoryTotals.outsourced.paidTotal)} ({categoryTotals.outsourced.paidCount})
                </span>
              )}
              {categoryTotals.outsourced.unpaidCount > 0 && (
                <span className="text-amber-600">
                  Unpaid: {formatCurrency(categoryTotals.outsourced.unpaidTotal)} ({categoryTotals.outsourced.unpaidCount})
                </span>
              )}
            </div>
          </div>

          {/* Licenses Card */}
          <div 
            className={cn("ct-category-card licenses", activeCategory === 'licenses' && "active")}
            onClick={() => {
              setActiveCategory(activeCategory === 'licenses' ? null : 'licenses');
              setShowBreakdown(false);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="ct-category-header">
              <span className="ct-category-title">LICENSES</span>
              <span className="ct-category-badge orange">{categoryTotals.licenses.count} Active</span>
              <ChevronDown size={16} />
            </div>
            <div className="ct-category-value orange">{formatCurrency(categoryTotals.licenses.monthly)}</div>
            <div className="ct-category-sub">SAR • Software Subscriptions</div>
            <div className="ct-category-detail">Monthly: {formatCurrency(categoryTotals.licenses.monthly)}</div>
          </div>
        </div>
      </section>
      )}

      {/* Insourced Breakdown Panel - Also hidden when hideWidgets is true */}
      {!hideWidgets && activeCategory === 'insourced' && showBreakdown && (
        <div className="ct-breakdown-panel">
          <div className="ct-breakdown-header">
            <span className="ct-breakdown-title">Insourced Breakdown</span>
            <button 
              className="ct-breakdown-close"
              onClick={() => setShowBreakdown(false)}
            >
              <X size={18} />
            </button>
          </div>
          <table className="ct-breakdown-table">
            <thead>
              <tr>
                <th>Resource Name</th>
                <th>Monthly CTC</th>
                <th>Department</th>
                <th>Assignment</th>
                <th>Contract End Date</th>
              </tr>
            </thead>
            <tbody>
              {insourcedResources.map((resource) => (
                <tr key={resource.id}>
                  <td>{resource.name || '—'}</td>
                  <td>
                    {resource.ctc 
                      ? formatCurrency(resource.ctc)
                      : <span className="ct-ctc-missing">Missing</span>}
                  </td>
                  <td>{resource.department_name || '—'}</td>
                  <td>{resource.assignment_name || '—'}</td>
                  <td>
                    {resource.contract_end_date 
                      ? format(parseISO(resource.contract_end_date), 'MMM dd, yyyy')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ct-breakdown-footer">
            <div className="ct-breakdown-total">
              <span className="ct-breakdown-total-label">Monthly CTC</span>
              <span className="ct-breakdown-total-value">
                {formatCurrency(insourcedResources.reduce((sum, r) => sum + (r.ctc || 0), 0))}
              </span>
            </div>
            <div className="ct-breakdown-total">
              <span className="ct-breakdown-total-label">{periodLabel} Total</span>
              <span className="ct-breakdown-total-value">
                {formatCurrency(categoryTotals.insourced.total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ROW: Department Widgets - Only visible when Insourced is active and hideWidgets is false */}
      {!hideWidgets && activeCategory === 'insourced' && (
        <section className="ct-runrate-section mb-6">
          <div className="ct-runrate-header">
            <span className="ct-runrate-title">Filter by Department</span>
            <span className="ct-runrate-badge">
              <Users size={12} />
              Insourced
            </span>
          </div>
          
          <div className="ct-runrate-grid">
            {/* All Departments Card */}
            <div 
              className={cn("ct-runrate-card", departmentFilter === 'all' && "active")}
              onClick={() => onDepartmentChange?.('all')}
              role="button"
              tabIndex={0}
            >
              <div className="ct-runrate-dept">All Departments</div>
              <div className="ct-runrate-value">
                <span>{formatCurrency(categoryTotals.insourced.total)}</span>
              </div>
              <div className="ct-runrate-headcount">
                <Users size={14} />
                <span>{categoryTotals.insourced.count} resources</span>
                {categoryTotals.insourced.missing > 0 && (
                  <span className="ct-runrate-missing inline-flex">
                    <AlertTriangle size={12} />
                    {categoryTotals.insourced.missing}
                  </span>
                )}
              </div>
            </div>

            {runRates.map(({ department, periodTotal, totalCount, missingCtcCount }) => (
              <div 
                key={department} 
                className={cn("ct-runrate-card", departmentFilter.toLowerCase() === department.toLowerCase() && "active")}
                onClick={() => onDepartmentChange?.(department.toLowerCase())}
                role="button"
                tabIndex={0}
              >
                <div className="ct-runrate-dept">{department}</div>
                <div className="ct-runrate-value">
                  <span>{formatCurrency(periodTotal)}</span>
                </div>
                <div className="ct-runrate-headcount">
                  <Users size={14} />
                  <span>{totalCount} resources</span>
                  {missingCtcCount > 0 && (
                    <span className="ct-runrate-missing inline-flex">
                      <AlertTriangle size={12} />
                      {missingCtcCount}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* External Card */}
            <div className="ct-runrate-card external">
              <div className="ct-runrate-dept">External</div>
              <div className="ct-runrate-value">
                <span>{formatCurrency(categoryTotals.outsourced.total)}</span>
              </div>
              <div className="ct-runrate-headcount">
                <span>Outsourced vendors</span>
              </div>
            </div>
          </div>
        </section>
      )}

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
