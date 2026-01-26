/**
 * Budget Planner Page - V8 Design System
 * Route: /enterprise/budget-planner
 * 
 * Access: Restricted to admin, super_admin, and program_manager (management) roles only
 * 
 * Matches Capacity Planner structure with:
 * - Row 1: Breadcrumb + Title + Live badge | (no CTA on right in Budget tab)
 * - Row 2: Search left | Hero Tab Strip right (Budget | Executive Summary)
 * - Period toggle below header in content area
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageChrome } from '@/components/layout/PageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search, Wallet, BarChart3, GitBranch, Lock, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBudgetData, type BudgetPeriod } from '@/hooks/budget/useBudgetData';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import '@/styles/budget-module.css';

import { BudgetDepartmentTabs } from '@/components/budget/BudgetDepartmentTabs';
import { BudgetSummaryCards } from '@/components/budget/BudgetSummaryCards';
import { BudgetInfoBox } from '@/components/budget/BudgetInfoBox';
import { BudgetLedgerTable } from '@/components/budget/BudgetLedgerTable';
import { BudgetQualityPanel } from '@/components/budget/BudgetQualityPanel';
import { BudgetExecutiveSummaryView } from '@/components/budget/BudgetExecutiveSummaryView';

type BudgetPlannerTab = 'summary' | 'budget' | 'scenario';

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'Q1', label: 'Q1' },
  { value: 'H1', label: 'H1' },
  { value: 'Full', label: 'Full Year' },
];

export default function BudgetPlannerPage() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isProgramManager, isLoading: roleLoading } = useUserRole();
  
  // Access control: Only admin, super_admin, or program_manager can access
  const canAccessBudgetPlanner = isAdmin || isSuperAdmin || isProgramManager;
  
  const [activeTab, setActiveTab] = useState<BudgetPlannerTab>('summary');
  const [period, setPeriod] = useState<BudgetPeriod>('H1');
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, error, refetch } = useBudgetData(period);
  const [currentDept, setCurrentDept] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Show loading while checking role
  if (roleLoading) {
    return (
      <PageChrome hideHeader>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageChrome>
    );
  }

  // Access denied screen for unauthorized users
  if (!canAccessBudgetPlanner) {
    return (
      <PageChrome hideHeader>
        <div className="flex flex-col items-center justify-center h-screen p-8 bg-background">
          <div className="bg-card border rounded-lg p-8 max-w-md text-center space-y-6 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Access Restricted</h2>
              <p className="text-muted-foreground text-sm">
                The Budget Planner module is only accessible to users with Super Admin, Admin, or Management (Program Manager) roles.
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/home')}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </div>
      </PageChrome>
    );
  }

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

  // Get period label for display
  const getPeriodLabel = () => {
    const periodLabels: Record<BudgetPeriod, string> = {
      'Q1': 'Q1 2026 (Jan–Mar)',
      'H1': 'H1 2026 (Jan–Jun)',
      'Full': 'Full Year 2026 (Jan–Dec)',
    };
    return periodLabels[period];
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
    return deptList;
  }, [data?.departments]);

  // Filter assignments by department and search
  const filteredAssignments = useMemo(() => {
    if (!data?.assignments) return [];
    
    let assignments = [...data.assignments];
    
    // Filter by department
    if (currentDept !== 'all') {
      assignments = assignments.filter(a => 
        a.department === currentDept || 
        (a.type === 'Cosourced' && a.department === currentDept)
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assignments = assignments.filter(a => 
        a.name?.toLowerCase().includes(query) ||
        a.department?.toLowerCase().includes(query) ||
        a.vendor?.toLowerCase().includes(query)
      );
    }
    
    return assignments;
  }, [data?.assignments, currentDept, searchQuery]);

  // Sort by budget descending
  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => b.budget - a.budget);
  }, [filteredAssignments]);

  // Current department budget
  const currentBudget = useMemo(() => {
    if (!data?.departments) return null;
    return data.departments[currentDept] || data.departments.all;
  }, [data?.departments, currentDept]);

  // Hero Tab Configuration (matches Capacity Planner style)
  const viewTabs = [
    { 
      id: 'summary', 
      label: 'Summary', 
      icon: BarChart3,
      isActive: activeTab === 'summary',
      onClick: () => setActiveTab('summary')
    },
    { 
      id: 'budget', 
      label: 'Budget', 
      icon: Wallet,
      isActive: activeTab === 'budget',
      onClick: () => setActiveTab('budget')
    },
    { 
      id: 'scenario', 
      label: 'Scenario Planning', 
      icon: GitBranch,
      isActive: activeTab === 'scenario',
      onClick: () => setActiveTab('scenario')
    },
  ];

  if (error) {
    return (
      <PageChrome hideHeader>
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
      <div className="budget-module min-h-screen bg-[var(--budget-bg)]">
        <div className="p-6 lg:px-8">
          {/* Row 1: Title + Live Badge | Tab Navigation */}
          <header className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Title Block */}
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  Enterprise / Budget Planner <span className="text-blue-600">• {activeTab === 'summary' ? 'Summary' : activeTab === 'budget' ? 'Budget' : 'Scenario Planning'}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Budget Planner</h1>
              </div>
              
              {/* Live Badge - Inline with title */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
                <span className="relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">Live</span>
              </div>
            </div>
            
            {/* Tab Navigation - Right Aligned */}
            <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1.5 border border-slate-200">
              {viewTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={tab.onClick}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150',
                      tab.isActive 
                        ? 'bg-[#2563eb] text-white shadow-md'
                        : 'text-slate-700 hover:bg-white hover:shadow-sm hover:text-slate-900'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[var(--budget-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'budget' ? (
            <>
              {/* Period Toggle + Showing Label */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  {PERIODS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-md transition-all',
                        period === p.value
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium">Showing:</span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                    <span className="text-base">📅</span>
                    <span className="font-medium text-slate-900">{getPeriodLabel()}</span>
                  </span>
                </div>
              </div>

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
          ) : activeTab === 'summary' ? (
            <BudgetExecutiveSummaryView 
              data={data}
              currentDept={currentDept}
              onDeptChange={setCurrentDept}
              period={period}
            />
          ) : (
            /* Scenario Planning Tab - Placeholder */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <GitBranch className="w-16 h-16 text-slate-300 mb-4" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">Scenario Planning</h2>
              <p className="text-slate-500 max-w-md">
                Model different budget scenarios, compare outcomes, and plan for various financial situations.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
