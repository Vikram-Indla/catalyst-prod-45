/**
 * Budget Governance View - Embedded view for Capacity Planner tab
 * V8 Design System compliant
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBudgetData, type BudgetPeriod } from '@/hooks/budget/useBudgetData';
import '@/styles/budget-module.css';

import { BudgetDepartmentTabs } from '@/components/budget/BudgetDepartmentTabs';
import { BudgetSummaryCards } from '@/components/budget/BudgetSummaryCards';
import { BudgetInfoBox } from '@/components/budget/BudgetInfoBox';
import { BudgetLedgerTable } from '@/components/budget/BudgetLedgerTable';
import { BudgetQualityPanel } from '@/components/budget/BudgetQualityPanel';
import { BudgetExecutiveModal } from '@/components/budget/BudgetExecutiveModal';

interface BudgetGovernanceViewProps {
  execModalOpen?: boolean;
  onExecModalClose?: () => void;
}

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'Q1', label: 'Q1' },
  { value: 'H1', label: 'H1' },
  { value: 'full_year', label: 'Full Year' },
];

export function BudgetGovernanceView({ execModalOpen: externalOpen, onExecModalClose }: BudgetGovernanceViewProps = {}) {
  const [period, setPeriod] = useState<BudgetPeriod>('H1');
  const { data, isLoading, error, refetch } = useBudgetData(period);
  const [currentDept, setCurrentDept] = useState('all');
  const [internalOpen, setInternalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const execModalOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const handleClose = onExecModalClose || (() => setInternalOpen(false));

  // Derive departments dynamically from budget data + External for outsourced
  const departments = useMemo(() => {
    if (!data?.departments) return [{ id: 'all', name: 'All Departments' }];
    
    const deptList = [{ id: 'all', name: 'All Departments' }];
    Object.keys(data.departments).forEach(key => {
      if (key !== 'all') {
        deptList.push({ 
          id: key, 
          name: key === 'Technical Support' ? 'Tech Support' : key 
        });
      }
    });
    // Add External department for Outsourced assignments
    deptList.push({ id: 'External', name: 'External' });
    return deptList;
  }, [data?.departments]);

  // Keyboard navigation for department tabs in modal
  const navigateDept = useCallback((direction: 'next' | 'prev') => {
    const currentIdx = departments.findIndex(d => d.id === currentDept);
    if (direction === 'next' && currentIdx < departments.length - 1) {
      setCurrentDept(departments[currentIdx + 1].id);
    } else if (direction === 'prev' && currentIdx > 0) {
      setCurrentDept(departments[currentIdx - 1].id);
    }
  }, [currentDept, departments]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (execModalOpen) {
        if (e.key === 'Escape') {
          handleClose();
        } else if (e.key === 'ArrowRight') {
          navigateDept('next');
        } else if (e.key === 'ArrowLeft') {
          navigateDept('prev');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [execModalOpen, handleClose, navigateDept]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Filter assignments by department
  const filteredAssignments = useMemo(() => {
    if (!data?.assignments) return [];
    
    if (currentDept === 'all') return [...data.assignments];
    // External shows outsourced assignments only
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
    // External department shows outsourced total
    if (currentDept === 'External') {
      const outsourcedTotal = data.assignments.filter(a => a.type === 'Outsourced').reduce((s, a) => s + a.budget, 0);
      return {
        insourced: 0,
        cosourced: 0,
        outsourced: outsourcedTotal,
        licenses: 0,
        total: outsourcedTotal,
        resources: 0,
        dataIssues: 0
      };
    }
    return data.departments[currentDept] || data.departments.all;
  }, [data?.departments, data?.assignments, currentDept]);

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
      <div className="px-6 lg:px-8 pt-4 pb-4">
        {/* Period Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="period-toggle">
            {PERIODS.map(p => (
              <button
                key={p.value}
                className={cn('period-btn', period === p.value && 'active')}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-[var(--budget-text-muted)]">
            Showing: <strong className="text-[var(--budget-text-primary)]">
              {period === 'Q1' ? 'Jan–Mar 2026' : period === 'H1' ? 'Jan–Jun 2026' : 'Full Year 2026'}
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Department Filter Tabs */}
            <BudgetDepartmentTabs
              departments={departments}
              currentDept={currentDept}
              budgets={data?.departments || {}}
              onSelect={setCurrentDept}
            />
            {/* Summary Cards */}
            <BudgetSummaryCards
              budget={currentBudget}
              assignments={data?.assignments || []}
              currentDept={currentDept}
              licenses={data?.licenses || []}
              licenseCount={data?.licenseCount || 0}
              monthlyLicenseCost={data?.monthlyLicenseCost || 0}
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
        onClose={handleClose}
        data={data}
        onNavigateDept={navigateDept}
        currentDept={currentDept}
        onDeptChange={setCurrentDept}
      />
    </div>
  );
}