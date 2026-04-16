/**
 * Budget Governance Page - V8 Design System
 * Route: /enterprise/capacity-planner/budget
 */

import { useState, useMemo } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { PageChrome } from '@/components/layout/PageChrome';
import { Button } from '@/components/ui/button';
import { Info, Download, RefreshCw, BarChart3, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBudgetData, formatCurrency, formatFull } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment, BudgetResource, DepartmentBudget } from '@/hooks/budget/useBudgetData';
import '@/styles/budget-module.css';

import { BudgetDepartmentTabs } from '@/components/budget/BudgetDepartmentTabs';
import { BudgetSummaryCards } from '@/components/budget/BudgetSummaryCards';
import { BudgetInfoBox } from '@/components/budget/BudgetInfoBox';
import { BudgetLedgerTable } from '@/components/budget/BudgetLedgerTable';
import { BudgetQualityPanel } from '@/components/budget/BudgetQualityPanel';
import { BudgetExecutiveModal } from '@/components/budget/BudgetExecutiveModal';

const DEPARTMENTS = [
  { id: 'all', name: 'All Departments' },
  { id: 'Delivery', name: 'Delivery' },
  { id: 'Product', name: 'Product' },
  { id: 'Operations', name: 'Operations' },
  { id: 'Technical Support', name: 'Tech Support' },
  { id: 'Governance', name: 'Governance' }
];

export default function BudgetGovernancePage() {
  const { data, isLoading, error, refetch } = useBudgetData('H1');
  const [currentDept, setCurrentDept] = useState('all');
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Filter assignments by department
  const filteredAssignments = useMemo(() => {
    if (!data?.assignments) return [];
    
    if (currentDept === 'all') return [...data.assignments];
    if (currentDept === 'External') return data.assignments.filter(a => a.type === 'Outsourced');
    return data.assignments.filter(a => 
      a.department === currentDept || 
      (a.type === 'Cosourced' && a.department === currentDept)
    );
  }, [data?.assignments, currentDept]);

  // Sort by budget descending
  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => b.budget - a.budget);
  }, [filteredAssignments]);

  // Current department budget
  const currentBudget = useMemo(() => {
    if (!data?.departments) return null;
    return data.departments[currentDept] || data.departments.all;
  }, [data?.departments, currentDept]);

  if (error) {
    return (
      <PageChrome>
        <div className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to load budget data</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome hideHeader>
      <div className="budget-module flex flex-col h-full bg-[hsl(var(--background))]">
        {/* Header - Matches Capacity Planner 2-Row Structure */}
        <div className="bg-card border-b border-border">
          {/* ROW 1: Title + Live Badge (inline) */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-border/40">
            {/* Left: Title + Live Badge Inline */}
            <div className="flex items-center gap-4">
              <CatalystPageHeader title="Budget Governance" />
              
              {/* Live Badge - Inline with title */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
                <span className="relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">Live</span>
              </div>
            </div>

            {/* Right: Executive Summary CTA */}
            <Button 
              onClick={() => setExecModalOpen(true)}
              size="sm"
              className="h-10 px-6 text-sm gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md font-semibold"
            >
              <BarChart3 className="w-4 h-4" />
              Executive Summary
            </Button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto p-6 lg:px-8" style={{ backgroundColor: 'var(--bg)' }}>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[var(--budget-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Department Filter Tabs */}
              <BudgetDepartmentTabs
                departments={DEPARTMENTS}
                currentDept={currentDept}
                budgets={data?.departments || {}}
                onSelect={setCurrentDept}
              />

              {/* Summary Cards with expandable panels */}
              <BudgetSummaryCards
                budget={currentBudget}
                assignments={data?.assignments || []}
                currentDept={currentDept}
                licenses={data?.licenses || []}
                licenseCount={data?.licenseCount || 0}
                monthlyLicenseCost={data?.monthlyLicenseCost || 0}
                resources={data?.resources || []}
                period={data?.period || 'H1'}
              />

              {/* Info Box */}
              <BudgetInfoBox />

              {/* Assignment Ledger Table with expandable rows */}
              <BudgetLedgerTable
                assignments={sortedAssignments}
                currentDept={currentDept}
                resources={data?.resources || []}
              />

              {/* Data Quality Panel */}
              {data?.dataQualityIssues && data.dataQualityIssues.length > 0 && (
                <BudgetQualityPanel issues={data.dataQualityIssues} />
              )}
            </>
          )}
        </div>

        {/* Executive Summary Modal */}
        <BudgetExecutiveModal
          open={execModalOpen}
          onClose={() => setExecModalOpen(false)}
          data={data}
        />
      </div>
    </PageChrome>
  );
}
