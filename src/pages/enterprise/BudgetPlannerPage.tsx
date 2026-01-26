/**
 * Budget Planner Page - V8 Design System
 * Route: /enterprise/budget-planner
 * 
 * Two tabs: Budget | Executive Summary
 */

import { useState, useMemo } from 'react';
import { PageChrome } from '@/components/layout/PageChrome';
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
import { BudgetExecutiveSummaryView } from '@/components/budget/BudgetExecutiveSummaryView';

type BudgetPlannerTab = 'budget' | 'executive';

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'Q1', label: 'Q1' },
  { value: 'H1', label: 'H1' },
  { value: 'Full', label: 'Full Year' },
];

export default function BudgetPlannerPage() {
  const [activeTab, setActiveTab] = useState<BudgetPlannerTab>('budget');
  const [period, setPeriod] = useState<BudgetPeriod>('H1');
  const { data, isLoading, error, refetch } = useBudgetData(period);
  const [currentDept, setCurrentDept] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Derive departments dynamically from budget data
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
    deptList.push({ id: 'External', name: 'External' });
    return deptList;
  }, [data?.departments]);

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
    <PageChrome>
      <div className="budget-module min-h-screen bg-[var(--budget-bg)]">
        <div className="p-6 lg:px-8">
          {/* Header Row */}
          <header className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Title Block */}
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  Enterprise <span className="text-blue-600">• Budget Planner</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Budget Planner</h1>
              </div>
              
              {/* Live Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
                <span className="relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">Live</span>
              </div>
            </div>
            
            {/* Period Toggle + Refresh */}
            <div className="flex items-center gap-3">
              {/* Period Toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                {PERIODS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                      period === p.value
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8"
              >
                <RefreshCw className={cn('w-4 h-4 mr-1', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </header>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('budget')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                activeTab === 'budget'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              )}
            >
              Budget
            </button>
            <button
              onClick={() => setActiveTab('executive')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                activeTab === 'executive'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              )}
            >
              Executive Summary
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[var(--budget-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'budget' ? (
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
                resources={data?.resources || []}
                period={data?.period || 'H1'}
              />

              {/* Info Box */}
              <BudgetInfoBox />

              {/* Assignment Ledger Table */}
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
          ) : (
            <BudgetExecutiveSummaryView 
              data={data}
              currentDept={currentDept}
              onDeptChange={setCurrentDept}
              period={period}
            />
          )}
        </div>
      </div>
    </PageChrome>
  );
}
