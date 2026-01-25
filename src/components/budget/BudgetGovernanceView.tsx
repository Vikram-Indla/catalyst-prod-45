/**
 * Budget Governance View - Embedded view for Capacity Planner tab
 * V8 Design System compliant
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, BarChart3, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBudgetData } from '@/hooks/budget/useBudgetData';
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
  { id: 'External', name: 'External' },
  { id: 'Product', name: 'Product' },
  { id: 'Operations', name: 'Operations' },
  { id: 'Technical Support', name: 'Tech Support' },
  { id: 'Governance', name: 'Governance' }
];

export function BudgetGovernanceView() {
  const { data, isLoading, error, refetch } = useBudgetData();
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
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-lg font-semibold mb-2">Failed to load budget data</h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={handleRefresh}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="budget-module min-h-[calc(100vh-200px)]">
      <div className="px-6 lg:px-8 py-4">
        {/* Action Toolbar - Executive Summary only */}
        <div className="flex items-center justify-end mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setExecModalOpen(true)}
            className="gap-1.5"
          >
            <BarChart3 className="w-4 h-4" />
            Executive Summary
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

            {/* Summary Cards */}
            <BudgetSummaryCards
              budget={currentBudget}
              assignments={data?.assignments || []}
              currentDept={currentDept}
            />

            {/* Info Box */}
            <BudgetInfoBox />

            {/* Assignment Ledger Table */}
            <BudgetLedgerTable
              assignments={sortedAssignments}
              currentDept={currentDept}
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
  );
}
