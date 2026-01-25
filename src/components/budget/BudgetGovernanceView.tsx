/**
 * Budget Governance View - Embedded view for Capacity Planner tab
 * STAGE 3: Full functionality wiring - refresh, export, period toggle, department filter
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBudgetData, type BudgetPeriod } from '@/hooks/budget/useBudgetData';
import { toast } from 'sonner';
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
  { value: 'Full', label: 'Full Year' },
];

export function BudgetGovernanceView({ execModalOpen: externalOpen, onExecModalClose }: BudgetGovernanceViewProps = {}) {
  const [period, setPeriod] = useState<BudgetPeriod>('H1');
  const budgetResult = useBudgetData(period);
  const { data, isLoading, error } = budgetResult;
  const refetch = budgetResult.refetch;
  const [currentDept, setCurrentDept] = useState('all');
  const [internalOpen, setInternalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hideCTC, setHideCTC] = useState(false);
  
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

  // Keyboard navigation for department tabs
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

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Budget data refreshed');
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export full budget to CSV
  const handleExport = () => {
    if (!data) return;

    const headers = ['Category', 'Name', 'Type', 'Status', 'Department', 'Vendor', 'Resources', 'Budget (SAR)', 'Payment'];
    const rows: (string | number)[][] = [];

    // Add assignments
    data.assignments.forEach(a => {
      rows.push([
        'Assignment',
        a.name,
        a.type,
        a.status,
        a.department,
        a.vendor || '—',
        a.type === 'Outsourced' ? '—' : (a.resourceCount || 0),
        a.budget,
        a.paymentStatus
      ]);
    });

    // Add licenses
    data.licenses.forEach(l => {
      rows.push([
        'License',
        l.name,
        l.licenseType,
        'Active',
        '—',
        '—',
        l.userCount || '—',
        l.annualCost,
        '—'
      ]);
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-governance-${period.toLowerCase()}-2026.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Budget data exported to CSV');
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
        {/* Period Toggle + Actions */}
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
          <div className="flex items-center gap-4">
            <div className="text-sm text-[var(--budget-text-muted)]">
              Showing: <strong className="text-[var(--budget-text-primary)]">
                {period === 'Q1' ? 'Jan–Mar 2026' : period === 'H1' ? 'Jan–Jun 2026' : 'Full Year 2026'}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                disabled={!data}
                className="gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-1.5"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
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
            {/* Summary Cards with expandable panels */}
            <BudgetSummaryCards
              budget={currentBudget}
              assignments={data?.assignments || []}
              currentDept={currentDept}
              licenses={data?.licenses || []}
              licenseCount={data?.licenseCount || 0}
              monthlyLicenseCost={data?.monthlyLicenseCost || 0}
              resources={data?.resources || []}
              period={period}
            />

            {/* Info Box */}
            <BudgetInfoBox />

            {/* Assignment Ledger Table with expandable rows */}
            <BudgetLedgerTable
              assignments={sortedAssignments}
              currentDept={currentDept}
              resources={data?.resources || []}
              hideCTC={hideCTC}
              onHideCTCChange={setHideCTC}
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
