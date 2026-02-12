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
import { AlertTriangle, Search, Wallet, BarChart3, GitBranch, Lock, Home, Calendar } from 'lucide-react';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { cn } from '@/lib/utils';
import { useBudgetData, formatCurrency, type BudgetPeriod } from '@/hooks/budget/useBudgetData';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import '@/styles/budget-module.css';

import { BudgetDepartmentTabs } from '@/components/budget/BudgetDepartmentTabs';
import { BudgetSummaryCards } from '@/components/budget/BudgetSummaryCards';
import { BudgetInfoBox } from '@/components/budget/BudgetInfoBox';
import { BudgetLedgerTable } from '@/components/budget/BudgetLedgerTable';
import { BudgetSummaryTab } from '@/components/budget/BudgetSummaryTab';
import { BudgetScenarioTab } from '@/components/budget/BudgetScenarioTab';
import { BudgetDataQualityTab } from '@/components/budget/BudgetDataQualityTab';
import { FileCheck } from 'lucide-react';

type BudgetPlannerTab = 'summary' | 'budget' | 'scenario' | 'quality';

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
  const [period, setPeriod] = useState<BudgetPeriod>('Full');  // V8: Default to Full Year
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, error, refetch } = useBudgetData(period);
  const [currentDept, setCurrentDept] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Cross-tab navigation params (for Fix Data, Scenario presets)
  const [tabParams, setTabParams] = useState<Record<string, string>>({});

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

  // Handler for cross-tab navigation with params
  const handleTabChange = (tab: string, params?: Record<string, string>) => {
    setActiveTab(tab as BudgetPlannerTab);
    setTabParams(params || {});
  };

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
    { 
      id: 'quality', 
      label: 'Data Quality', 
      icon: FileCheck,
      isActive: activeTab === 'quality',
      onClick: () => handleTabChange('quality')
    },
  ];

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

  // Get active tab label for breadcrumb
  const getActiveTabName = () => {
    switch (activeTab) {
      case 'summary': return 'Summary';
      case 'budget': return 'Budget';
      case 'scenario': return 'Scenario Planning';
      case 'quality': return 'Data Quality';
      default: return 'Summary';
    }
  };

  return (
    <PageChrome hideHeader>
      <div className="budget-module flex flex-col h-full bg-[hsl(var(--background))]">
        {/* Header - Matches Capacity Planner 2-Row Structure */}
        <div className="bg-card">
          {/* ROW 1: CommandCenterHeader */}
          <CommandCenterHeader
            title="Budget Planner"
            subtitle={`Financial planning & scenario modeling — ${getPeriodLabel()}`}
          />

          {/* ROW 2: Search + Hero Tabs — floating strip */}
          <div className="px-3 sm:px-6 pt-3" style={{ backgroundColor: 'hsl(var(--muted))', paddingBottom: '4px' }}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-card border border-border rounded-xl shadow-sm">
              {/* Left: Search + Period Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search assignments..."
                    className="w-full h-10 pl-10 pr-3 text-sm rounded-xl bg-slate-100 border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-muted-foreground"
                  />
                </div>

                {/* Period Toggle */}
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
                  {PERIODS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
                        period === p.value
                          ? 'bg-[#2563eb] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero Tab Strip */}
              <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1.5 border border-slate-200 overflow-x-auto w-full lg:w-auto">
                {viewTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={tab.onClick}
                      className={cn(
                        'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap',
                        tab.isActive 
                          ? 'bg-[#2563eb] text-white shadow-md'
                          : 'text-slate-700 hover:bg-white hover:shadow-sm hover:text-slate-900'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto px-3 sm:px-6 lg:px-8 pb-6" style={{ backgroundColor: 'hsl(var(--muted))', paddingTop: '4px' }}>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'budget' ? (
            <>
              {/* Context Badge - Shows period + total */}
              <div className="flex items-center gap-3 px-4 py-2.5 mb-6 bg-card border border-border rounded-xl w-fit">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{getPeriodLabel()}</span>
                  <span className="mx-2 text-muted-foreground/60">•</span>
                  <span className="font-mono font-bold text-primary">
                    {formatCurrency(currentBudget?.total || 0)} SAR
                  </span>
                </span>
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
            </>
          ) : activeTab === 'summary' ? (
            <BudgetSummaryTab 
              data={data}
              period={period}
              onTabChange={handleTabChange}
            />
          ) : activeTab === 'scenario' ? (
            <BudgetScenarioTab
              data={data}
              period={period}
              presetToLoad={tabParams.preset}
              onPeriodChange={setPeriod}
            />
          ) : activeTab === 'quality' ? (
            <BudgetDataQualityTab 
              data={data} 
              period={period}
              totalBudget={data?.departments?.all?.total || 0}
              onRefresh={refetch}
              fixDepartment={tabParams.fixDepartment}
              onPeriodChange={setPeriod}
            />
          ) : null}
        </div>
      </div>
    </PageChrome>
  );
}
