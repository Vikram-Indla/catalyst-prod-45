/**
 * Budget Summary Tab - V8 Design
 * Matches exact reference: Portfolio baseline cards, department budget bars with quarterly timeline,
 * assignment costs table with run rate, and recommendations by department
 */

import { useState, useMemo } from 'react';
import { AlertTriangle, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatFull, type BudgetPeriod, type BudgetResource, type BudgetAssignment, type DepartmentBudget, type BudgetLicense } from '@/hooks/budget/useBudgetData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDate } from '@/lib/budget/utils';

interface BudgetSummaryTabProps {
  data: {
    assignments: BudgetAssignment[];
    departments: Record<string, DepartmentBudget>;
    resources: BudgetResource[];
    licenses: BudgetLicense[];
    dataQualityIssues: { name: string; department: string; issue: string }[];
    licenseBudget: number;
    licenseCount: number;
    monthlyLicenseCost: number;
  } | null;
  period: BudgetPeriod;
  onTabChange?: (tab: string, params?: Record<string, string>) => void;
}

type ModalType = 'insourced' | 'fixed' | 'licenses' | 'department' | 'assignment' | null;

// Department display order
const DEPT_ORDER = ['Delivery', 'Product', 'Operations', 'Tech Support', 'Governance'];

// Abbreviate department names
const deptAbbrev: Record<string, string> = {
  'Delivery': 'Del',
  'Product': 'Prod',
  'Operations': 'Ops',
  'Tech Support': 'Tech',
  'Governance': 'Gov'
};

export function BudgetSummaryTab({ data, period, onTabChange }: BudgetSummaryTabProps) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<BudgetAssignment | null>(null);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading budget data...
      </div>
    );
  }

  const months = period === 'Q1' ? 3 : period === 'H1' ? 6 : 12;
  const budget = data.departments.all;
  
  // Calculate fixed contracts (Cosourced + Outsourced)
  const fixedTotal = budget.cosourced + budget.outsourced;
  
  // Get insourced resources (Variable + Freelance only)
  const insourcedResources = data.resources.filter(r => 
    r.resourceType === 'Variable' || r.resourceType === 'Freelance'
  );

  // Get ordered departments
  const departments = DEPT_ORDER.filter(d => data.departments[d]);

  // Missing CTC by department
  const missingCTCByDept = useMemo(() => {
    const byDept: Record<string, number> = {};
    data.resources.forEach(r => {
      if (!r.ctc || r.ctc === 0) {
        byDept[r.department] = (byDept[r.department] || 0) + 1;
      }
    });
    return byDept;
  }, [data.resources]);

  // Critical resources expiring soon (within 180 days / Q1-Q2)
  const criticalResources = useMemo(() => {
    const now = new Date();
    return data.resources.filter(r => {
      if (!r.contractEnd || !r.ctc) return false;
      const endDate = new Date(r.contractEnd);
      const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 180 && daysUntilEnd > 0;
    }).sort((a, b) => {
      const aDate = new Date(a.contractEnd!);
      const bDate = new Date(b.contractEnd!);
      return aDate.getTime() - bDate.getTime();
    });
  }, [data.resources]);

  // Unpaid outsourced assignments
  const unpaidAssignments = data.assignments.filter(a => 
    a.type === 'Outsourced' && a.paymentStatus === 'unpaid'
  );
  const unpaidTotal = unpaidAssignments.reduce((sum, a) => sum + a.budget, 0);

  // Calculate max department budget for bar scaling
  const maxDeptBudget = Math.max(
    ...departments.map(d => data.departments[d]?.total || 0),
    1 // Prevent division by 0
  );

  // Extension cost (3 months)
  const extensionCost = criticalResources.reduce((sum, r) => sum + (r.ctc || 0) * 3, 0);

  // Get resources for selected department
  const deptResources = selectedDept 
    ? data.resources.filter(r => r.department === selectedDept)
    : [];

  // Get resources for selected assignment
  const assignmentResources = selectedAssignment
    ? data.resources.filter(r => r.aid === selectedAssignment.aid)
    : [];

  // Calculate quarterly cumulative values for a department
  const getQuarterlyValues = (monthlyRate: number) => {
    if (monthlyRate === 0) return { q1: 0, q2: 0, q3: 0, q4: 0 };
    return {
      q1: monthlyRate * 3,
      q2: monthlyRate * 6,
      q3: monthlyRate * 9,
      q4: monthlyRate * 12
    };
  };

  // Navigate to Data Quality tab with department filter
  const navigateToFixData = (department: string) => {
    if (onTabChange) {
      onTabChange('quality', { fixDepartment: department });
    }
  };

  // Navigate to Scenario Planning tab with preset
  const navigateToScenario = (preset: string) => {
    if (onTabChange) {
      onTabChange('scenario', { preset });
    }
  };

  // Open department modal or navigate to fix data
  const handleDeptClick = (deptName: string) => {
    const dept = data.departments[deptName];
    if (!dept) return;
    
    const missingCount = missingCTCByDept[deptName] || 0;
    const hasBudget = dept.total > 0;
    
    if (!hasBudget && missingCount > 0) {
      // Navigate to Data Quality + open fix modal
      navigateToFixData(deptName);
    } else {
      // Open department detail modal
      setSelectedDept(deptName);
      setActiveModal('department');
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Portfolio Baseline Cards */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Portfolio Baseline
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {/* Total Budget - NOT clickable */}
          <div className="bg-card rounded-xl border border-border p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-400 to-slate-500" />
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Total Budget
            </div>
            <div className="font-mono text-[22px] font-bold text-slate-700 dark:text-slate-300 mb-2">
              {formatCurrency(budget.total)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              SAR · {period === 'Q1' ? 'Q1' : period === 'H1' ? 'H1' : 'Full Year'} 2026
            </div>
          </div>

          {/* Insourced - Clickable */}
          <div 
            className="bg-card rounded-xl border border-border p-5 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveModal('insourced')}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2563eb] to-[#3b82f6]" />
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Insourced
            </div>
            <div className="font-mono text-[22px] font-bold text-[#2563eb] mb-2">
              {formatCurrency(budget.insourced)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {insourcedResources.length} resources · Click for details
            </div>
          </div>

          {/* Fixed Contracts - Clickable */}
          <div 
            className="bg-card rounded-xl border border-border p-5 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveModal('fixed')}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#d97706] to-[#f59e0b]" />
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Fixed Contracts
            </div>
            <div className="font-mono text-[22px] font-bold text-[#d97706] mb-2">
              {formatCurrency(fixedTotal)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Cosourced + Outsourced · Click for details
            </div>
          </div>

          {/* Licenses - Clickable */}
          <div 
            className="bg-card rounded-xl border border-border p-5 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveModal('licenses')}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]" />
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Licenses
            </div>
            <div className="font-mono text-[22px] font-bold text-[#7c3aed] mb-2">
              {formatCurrency(budget.licenses)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {data.licenseCount} active · Click for details
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Department Budgets with Quarterly Timeline */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Department Budgets
          </h2>
          <button 
            className="text-sm text-[#2563eb] hover:underline font-medium flex items-center gap-1"
            onClick={() => onTabChange?.('budget')}
          >
            View Breakdown <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-card rounded-xl border border-border">
          {departments.map((deptName, idx) => {
            const dept = data.departments[deptName];
            if (!dept) return null;
            
            const hasBudget = dept.total > 0;
            const monthlyRate = hasBudget ? dept.insourced / 12 : 0; // Always calculate for full year
            const barWidth = maxDeptBudget > 0 ? (dept.total / maxDeptBudget * 100) : 0;
            const missingCount = missingCTCByDept[deptName] || 0;
            const quarterly = getQuarterlyValues(monthlyRate);
            
            return (
              <div 
                key={deptName}
                className={cn(
                  "px-6 py-5 cursor-pointer hover:bg-muted/30 transition-colors",
                  idx !== departments.length - 1 && "border-b border-border"
                )}
                onClick={() => handleDeptClick(deptName)}
              >
                <div className="flex items-start gap-6">
                  {/* Department name */}
                  <div className="w-28 shrink-0 pt-1">
                    <span className="font-medium text-foreground">{deptName}</span>
                  </div>
                  
                  {/* Timeline bar area */}
                  <div className="flex-1">
                    {/* Quarter labels above bar */}
                    <div className="grid grid-cols-4 mb-1 text-[9px] text-muted-foreground font-semibold">
                      <span className="text-right pr-1">Q1</span>
                      <span className="text-right pr-1">Q2</span>
                      <span className="text-right pr-1">Q3</span>
                      <span className="text-right pr-1">Q4</span>
                    </div>
                    
                    {/* Bar container with quarter markers */}
                    <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                      {/* Quarter dividers */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        <div className="w-1/4 border-r-2 border-dashed border-border/50" />
                        <div className="w-1/4 border-r-2 border-dashed border-border/50" />
                        <div className="w-1/4 border-r-2 border-dashed border-border/50" />
                        <div className="w-1/4" />
                      </div>
                      {/* Actual budget bar */}
                      {hasBudget && (
                        <div 
                          className="absolute top-0 left-0 h-full bg-[#2563eb] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(barWidth, 100)}%` }}
                        />
                      )}
                    </div>
                    
                    {/* Quarterly cumulative values below bar */}
                    <div className="grid grid-cols-4 mt-1.5 text-[10px] font-mono font-semibold text-muted-foreground">
                      <span className="text-right pr-1">
                        {hasBudget ? formatCurrency(quarterly.q1) : '—'}
                      </span>
                      <span className="text-right pr-1">
                        {hasBudget ? formatCurrency(quarterly.q2) : '—'}
                      </span>
                      <span className="text-right pr-1">
                        {hasBudget ? formatCurrency(quarterly.q3) : '—'}
                      </span>
                      <span className="text-right pr-1">
                        {hasBudget ? formatCurrency(quarterly.q4) : '—'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Budget value and run rate OR missing CTC warning */}
                  <div className="w-36 text-right shrink-0">
                    {hasBudget ? (
                      <>
                        <div className="font-mono font-bold text-foreground">
                          {formatCurrency(dept.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Run rate: <strong>{formatCurrency(monthlyRate)}</strong>/mo
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5 text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">Δ{missingCount} missing CTC</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Assignment Costs Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Assignment Costs
          </h2>
          <button 
            className="text-sm text-[#2563eb] hover:underline font-medium flex items-center gap-1"
            onClick={() => navigate('/admin/resource-assignments')}
          >
            View All {data.assignments.length} Assignments <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-muted-foreground">Assignment</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-muted-foreground">Dept</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-muted-foreground">Type</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-muted-foreground">Period</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-muted-foreground">Res</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-muted-foreground">Budget (SAR)</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.assignments
                .sort((a, b) => b.budget - a.budget)
                .slice(0, 8)
                .map(a => {
                  const isUnpaid = a.paymentStatus === 'unpaid';
                  const durationMonths = a.startDate && a.endDate 
                    ? Math.max(1, Math.ceil((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
                    : months;
                  
                  const formatPeriod = (start: string | null, end: string | null) => {
                    if (!start || !end) return '—';
                    const s = new Date(start);
                    const e = new Date(end);
                    const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
                    const sYear = s.getFullYear().toString().slice(-2);
                    const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
                    const eYear = e.getFullYear().toString().slice(-2);
                    return `${sMonth}'${sYear}–${eMonth}'${eYear}`;
                  };
                  
                  return (
                    <tr 
                      key={a.id} 
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedAssignment(a);
                        setActiveModal('assignment');
                      }}
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-foreground">{a.name}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {deptAbbrev[a.department] || a.department}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          a.type === 'Insourced' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                          a.type === 'Cosourced' && "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
                          a.type === 'Outsourced' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                        )}>
                          {a.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground font-mono text-xs">
                        {formatPeriod(a.startDate, a.endDate)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                        {a.type === 'Outsourced' ? '—' : a.resourceCount || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "font-mono font-semibold",
                          isUnpaid ? "text-red-600" : "text-[#2563eb]"
                        )}>
                          {formatFull(a.budget)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.type === 'Insourced' ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : isUnpaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            UNPAID
                          </span>
                        ) : a.paymentStatus === 'on_track' || a.paymentStatus === 'paid' ? (
                          <span className="text-sm text-emerald-600 font-medium">✓ On Track</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Recommendations by Department */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Recommendations by Department
        </h2>
        
        <div className="space-y-3">
          {/* Critical Resources Expiring */}
          {criticalResources.length > 0 && (
            <div className="bg-card rounded-xl border border-border border-l-4 border-l-red-500 p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase text-red-600 mb-1">
                    Delivery Department
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {criticalResources.length} Critical Resources Expiring Q1-Q2
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {criticalResources.slice(0, 5).map((r, i) => {
                      const month = r.contractEnd 
                        ? new Date(r.contractEnd).toLocaleDateString('en-US', { month: 'short' })
                        : '';
                      return `${r.name} (${month})`;
                    }).join(', ')}
                    {criticalResources.length > 5 && ` and ${criticalResources.length - 5} more`}
                    {' need extension decisions.'}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-6">
                  <div className="text-xs text-muted-foreground mb-1">Extension Cost (+3mo)</div>
                  <div className="font-mono font-bold text-red-600 mb-2">
                    +{formatCurrency(extensionCost)} SAR
                  </div>
                  <button 
                    className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToScenario('critical3mo');
                    }}
                  >
                    Extend <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Outstanding Payments */}
          {unpaidAssignments.length > 0 && (
            <div className="bg-card rounded-xl border border-border border-l-4 border-l-amber-500 p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase text-amber-600 mb-1">
                    Delivery Department
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {unpaidAssignments.length} Outsourced Contracts Unpaid
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {unpaidAssignments.map(a => `${a.name} (${a.vendor} vendor)`).join(' and ')} completed but unpaid.
                  </p>
                </div>
                <div className="text-right shrink-0 ml-6">
                  <div className="text-xs text-muted-foreground mb-1">Total Outstanding</div>
                  <div className="font-mono font-bold text-amber-600 mb-2">
                    {formatCurrency(unpaidTotal)} SAR
                  </div>
                  <button 
                    className="px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModal('fixed');
                    }}
                  >
                    View Details <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Missing CTC Data - show departments with missing data */}
          {Object.entries(missingCTCByDept)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([dept, count]) => (
              <div key={dept} className="bg-card rounded-xl border border-border border-l-4 border-l-[#2563eb] p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase text-[#2563eb] mb-1">
                      {dept} Department
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {count} Resources Missing Compensation Data
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Cannot calculate budget for {dept} team. All CTC data needs to be entered.
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-6">
                    <div className="text-xs text-muted-foreground mb-1">Action Required</div>
                    <button 
                      className="px-3 py-1.5 rounded-md bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8] transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToFixData(dept);
                      }}
                    >
                      Fix Data <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          }

          {/* Empty state */}
          {criticalResources.length === 0 && unpaidAssignments.length === 0 && Object.keys(missingCTCByDept).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <span className="text-sm">No critical recommendations at this time.</span>
            </div>
          )}
        </div>
      </section>

      {/* ========== MODALS ========== */}

      {/* Insourced Resources Modal */}
      <Dialog open={activeModal === 'insourced'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Insourced Resources Breakdown</span>
              <span className="text-sm font-normal text-muted-foreground">
                {insourcedResources.length} resources · Total: {formatCurrency(budget.insourced)} SAR
              </span>
            </DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm mt-4">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Resource</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">RID</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Dept</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Contract End</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Monthly CTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {insourcedResources
                .filter(r => r.ctc && r.ctc > 0)
                .sort((a, b) => (b.ctc || 0) - (a.ctc || 0))
                .map(r => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.rid || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{deptAbbrev[r.department] || r.department}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
                      r.resourceType === 'Variable' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : 
                      "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", 
                        r.resourceType === 'Variable' ? "bg-blue-500" : "bg-violet-500"
                      )} />
                      {r.resourceType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">
                    {r.contractEnd ? formatDate(r.contractEnd) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                    {formatFull(r.ctc || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>

      {/* Fixed Contracts Modal */}
      <Dialog open={activeModal === 'fixed'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fixed Contracts Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Cosourced */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-teal-700 dark:text-teal-400">COSOURCED</h4>
                <span className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                  Total: {formatCurrency(budget.cosourced)}
                </span>
              </div>
              <div className="space-y-2">
                {data.assignments.filter(a => a.type === 'Cosourced').map(a => (
                  <div key={a.id} className="flex justify-between items-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                    <div>
                      <div className="font-medium text-foreground">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.vendor}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                        {formatFull(a.budget)}
                      </span>
                      <span className="text-sm text-emerald-600 font-medium">✓ On Track</span>
                    </div>
                  </div>
                ))}
                {data.assignments.filter(a => a.type === 'Cosourced').length === 0 && (
                  <div className="text-sm text-muted-foreground p-3">No cosourced assignments</div>
                )}
              </div>
            </div>
            {/* Outsourced */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">OUTSOURCED</h4>
                <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                  Total: {formatCurrency(budget.outsourced)}
                </span>
              </div>
              <div className="space-y-2">
                {data.assignments.filter(a => a.type === 'Outsourced').map(a => (
                  <div key={a.id} className={cn(
                    "flex justify-between items-center p-3 rounded-lg border",
                    a.paymentStatus === 'unpaid' 
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" 
                      : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  )}>
                    <div>
                      <div className="font-medium text-foreground">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.vendor}</div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <span className={cn(
                        "font-mono font-semibold",
                        a.paymentStatus === 'unpaid' ? "text-red-600" : "text-amber-700 dark:text-amber-400"
                      )}>
                        {formatFull(a.budget)}
                      </span>
                      {a.paymentStatus === 'unpaid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          UNPAID
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {data.assignments.filter(a => a.type === 'Outsourced').length === 0 && (
                  <div className="text-sm text-muted-foreground p-3">No outsourced assignments</div>
                )}
              </div>
            </div>
            
            {/* Warning banner */}
            {unpaidAssignments.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">
                  {unpaidAssignments.length} contracts with outstanding payments totaling {formatCurrency(unpaidTotal)} SAR
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Licenses Modal */}
      <Dialog open={activeModal === 'licenses'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Software Licenses</span>
              <div className="text-sm font-normal text-muted-foreground">
                Monthly: {formatCurrency(data.monthlyLicenseCost)} · Annual: {formatCurrency(budget.licenses)}
              </div>
            </DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm mt-4">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">License</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Seats</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Monthly</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Annual</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.licenses.map(l => {
                const isRenewingSoon = l.renewalDate && (() => {
                  const renewal = new Date(l.renewalDate);
                  const now = new Date();
                  const days = (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                  return days <= 60 && days > 0;
                })();
                
                return (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium text-foreground">{l.name}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{l.userCount || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatFull(l.monthlyCost)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-[#7c3aed]">{formatFull(l.annualCost)}</td>
                    <td className={cn(
                      "px-3 py-2 text-center text-sm",
                      isRenewingSoon ? "text-amber-600 font-medium" : "text-muted-foreground"
                    )}>
                      {l.renewalDate ? new Date(l.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-violet-50 dark:bg-violet-900/20 border-t-2 border-violet-200 dark:border-violet-800">
              <tr>
                <td className="px-3 py-3 font-bold text-[#7c3aed]">Total</td>
                <td></td>
                <td className="px-3 py-3 text-right font-mono font-bold text-[#7c3aed]">{formatFull(data.monthlyLicenseCost)}</td>
                <td className="px-3 py-3 text-right font-mono font-bold text-[#7c3aed]">{formatFull(budget.licenses)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          
          {/* Next renewal notice */}
          {data.licenses.some(l => l.renewalDate) && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>⏰</span>
              <span>
                Next renewal: {data.licenses
                  .filter(l => l.renewalDate)
                  .sort((a, b) => new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime())[0]?.renewalDate 
                    ? new Date(data.licenses.filter(l => l.renewalDate).sort((a, b) => new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime())[0].renewalDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'
                }
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Department Detail Modal */}
      <Dialog open={activeModal === 'department' && !!selectedDept} onOpenChange={() => { setActiveModal(null); setSelectedDept(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedDept} Department — Budget Breakdown</DialogTitle>
          </DialogHeader>
          {selectedDept && data.departments[selectedDept] && (
            <div className="mt-4 space-y-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {deptResources.length} resources · {deptResources.filter(r => r.ctc && r.ctc > 0).length} with CTC data
                </span>
                <span>
                  Annual Budget: <strong className="text-foreground">{formatCurrency(data.departments[selectedDept].total)}</strong> · 
                  Run Rate: <strong className="text-foreground">{formatCurrency(data.departments[selectedDept].insourced / 12)}/mo</strong>
                </span>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">By Assignment</h4>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Assignment</th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Resources</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Monthly CTC</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Annual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.assignments
                      .filter(a => a.department === selectedDept)
                      .sort((a, b) => b.budget - a.budget)
                      .map(a => {
                        const assignmentRes = data.resources.filter(r => r.aid === a.aid);
                        const monthlyCTC = assignmentRes.reduce((sum, r) => sum + (r.ctc || 0), 0);
                        return (
                          <tr key={a.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium text-foreground">{a.name}</td>
                            <td className="px-3 py-2 text-center text-muted-foreground">{assignmentRes.length}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatFull(monthlyCTC)}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">{formatCurrency(a.budget)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              
              {(missingCTCByDept[selectedDept] || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {missingCTCByDept[selectedDept]} resources missing CTC data
                    </span>
                  </div>
                  <button 
                    className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-1"
                    onClick={() => {
                      setActiveModal(null);
                      setSelectedDept(null);
                      navigateToFixData(selectedDept);
                    }}
                  >
                    Fix Data <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assignment Detail Modal */}
      <Dialog open={activeModal === 'assignment' && !!selectedAssignment} onOpenChange={() => { setActiveModal(null); setSelectedAssignment(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.name} — Assignment Details</DialogTitle>
          </DialogHeader>
          {selectedAssignment && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded text-xs font-medium ml-1",
                    selectedAssignment.type === 'Insourced' && "bg-blue-100 text-blue-700",
                    selectedAssignment.type === 'Cosourced' && "bg-teal-100 text-teal-700",
                    selectedAssignment.type === 'Outsourced' && "bg-amber-100 text-amber-700",
                  )}>
                    {selectedAssignment.type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="font-medium text-foreground">{selectedAssignment.status === 'in_progress' ? 'In Progress' : selectedAssignment.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Period:</span>{' '}
                  <span className="font-medium text-foreground">
                    {selectedAssignment.startDate && selectedAssignment.endDate 
                      ? `${formatDate(selectedAssignment.startDate)} — ${formatDate(selectedAssignment.endDate)}`
                      : '—'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Budget:</span>{' '}
                  <span className="font-mono font-semibold text-[#2563eb]">{formatFull(selectedAssignment.budget)} SAR</span>
                  {selectedAssignment.type === 'Insourced' && (
                    <span className="text-xs text-muted-foreground ml-1">(calculated from {assignmentResources.length} resources)</span>
                  )}
                </div>
              </div>
              
              {selectedAssignment.type === 'Insourced' && assignmentResources.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Resources</h4>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Role</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">CTC</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Contract End</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {assignmentResources.map(r => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.role}</td>
                          <td className="px-3 py-2 text-right font-mono text-foreground">
                            {r.ctc ? formatFull(r.ctc) : <span className="text-red-500">Missing</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.contractEnd ? formatDate(r.contractEnd) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {selectedAssignment.type !== 'Insourced' && selectedAssignment.vendor && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Vendor</div>
                  <div className="font-medium text-foreground">{selectedAssignment.vendor}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
