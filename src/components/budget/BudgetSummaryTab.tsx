/**
 * Budget Summary Tab - V8 Design
 * Matches exact reference: Portfolio baseline cards, department budget bars with quarterly timeline,
 * assignment costs table with run rate, and recommendations by department
 */

import { useState, useMemo } from 'react';
import { ChevronRight, AlertTriangle, Users, FileText, TrendingUp, Building2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatFull, type BudgetPeriod, type BudgetResource, type BudgetAssignment, type DepartmentBudget, type BudgetLicense } from '@/hooks/budget/useBudgetData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

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
}

type ModalType = 'insourced' | 'fixed' | 'licenses' | 'department' | null;

const cardColors = {
  total: 'from-emerald-500 to-emerald-600',
  insourced: 'from-[#2563eb] to-[#3b82f6]',
  fixed: 'from-[#d97706] to-[#f59e0b]',
  licenses: 'from-[#7c3aed] to-[#a78bfa]',
};

// Department display order
const DEPT_ORDER = ['Delivery', 'Product', 'Operations', 'Tech Support', 'Governance'];

export function BudgetSummaryTab({ data, period }: BudgetSummaryTabProps) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
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

  // Fixed contracts count (Cosourced + Outsourced assignments)
  const fixedContractsCount = data.assignments.filter(a => 
    a.type === 'Cosourced' || a.type === 'Outsourced'
  ).length;

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

  // Critical resources expiring soon (Q1-Q2)
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
    ...departments.map(d => data.departments[d]?.total || 0)
  );

  // Extension cost (3 months)
  const extensionCost = criticalResources.reduce((sum, r) => sum + (r.ctc || 0) * 3, 0);

  return (
    <div className="space-y-8">
      {/* Section 1: Portfolio Baseline Cards */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Portfolio Baseline
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {/* Total Budget */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden">
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.total)} />
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Total Budget
            </div>
            <div className="font-mono text-4xl font-bold text-emerald-600 mb-2">
              {formatCurrency(budget.total)}
            </div>
            <div className="text-sm text-slate-500">
              SAR · {period === 'Q1' ? 'Q1' : period === 'H1' ? 'H1' : 'Full Year'} 2026
            </div>
          </div>

          {/* Insourced */}
          <div 
            className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveModal('insourced')}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.insourced)} />
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Insourced
            </div>
            <div className="font-mono text-4xl font-bold text-[#2563eb] mb-2">
              {formatCurrency(budget.insourced)}
            </div>
            <div className="text-sm text-slate-500">
              {insourcedResources.length} resources · Click for details
            </div>
          </div>

          {/* Fixed Contracts */}
          <div 
            className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveModal('fixed')}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.fixed)} />
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Fixed Contracts
            </div>
            <div className="font-mono text-4xl font-bold text-[#d97706] mb-2">
              {formatCurrency(fixedTotal)}
            </div>
            <div className="text-sm text-slate-500">
              Cosourced + Outsourced · Click for details
            </div>
          </div>

          {/* Licenses */}
          <div 
            className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveModal('licenses')}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.licenses)} />
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Licenses
            </div>
            <div className="font-mono text-4xl font-bold text-[#7c3aed] mb-2">
              {formatCurrency(budget.licenses)}
            </div>
            <div className="text-sm text-slate-500">
              {data.licenseCount} active · Click for details
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Department Budgets with Timeline Bars */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Department Budgets
          </h2>
          <button 
            className="text-sm text-[#2563eb] hover:underline font-medium"
            onClick={() => navigate('/enterprise/budget-planner?tab=budget')}
          >
            View Breakdown
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200">
          {departments.map((deptName, idx) => {
            const dept = data.departments[deptName];
            if (!dept) return null;
            
            const hasBudget = dept.total > 0;
            const monthlyRate = hasBudget ? dept.insourced / months : 0;
            const barWidth = maxDeptBudget > 0 ? (dept.total / maxDeptBudget * 100) : 0;
            const missingCount = missingCTCByDept[deptName] || 0;
            
            return (
              <div 
                key={deptName}
                className={cn(
                  "px-6 py-4",
                  idx !== departments.length - 1 && "border-b border-slate-100"
                )}
              >
                <div className="flex items-center gap-6">
                  {/* Department name */}
                  <div className="w-28 shrink-0">
                    <span className="font-medium text-slate-800">{deptName}</span>
                  </div>
                  
                  {/* Timeline bar area */}
                  <div className="flex-1">
                    {/* Quarter labels */}
                    <div className="flex justify-between mb-1 text-[10px] text-slate-400 font-medium">
                      <span>Q1</span>
                      <span>Q2</span>
                      <span>Q3</span>
                      <span>Q4</span>
                    </div>
                    {/* Bar container with quarter markers */}
                    <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden">
                      {/* Quarter dividers */}
                      <div className="absolute inset-0 flex">
                        <div className="w-1/4 border-r border-slate-200" />
                        <div className="w-1/4 border-r border-slate-200" />
                        <div className="w-1/4 border-r border-slate-200" />
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
                  </div>
                  
                  {/* Budget value and run rate OR missing CTC warning */}
                  <div className="w-32 text-right shrink-0">
                    {hasBudget ? (
                      <>
                        <div className="font-mono font-bold text-slate-800">
                          {formatCurrency(dept.total)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Run rate: {formatCurrency(monthlyRate)}/mo
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5 text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">{missingCount} missing CTC</span>
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Assignment Costs
          </h2>
          <button 
            className="text-sm text-[#2563eb] hover:underline font-medium"
            onClick={() => navigate('/admin/resource-assignments')}
          >
            View All {data.assignments.length} Assignments
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">Assignment</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">Department</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">Type</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">Duration</th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase text-slate-500">Resources</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-500">Budget (SAR)</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-500">Run Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.assignments
                .sort((a, b) => b.budget - a.budget)
                .slice(0, 6)
                .map(a => {
                  const isUnpaid = a.paymentStatus === 'unpaid';
                  const durationMonths = a.startDate && a.endDate 
                    ? Math.max(1, Math.ceil((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
                    : months;
                  const runRate = a.budget / durationMonths;
                  
                  const formatDate = (dateStr: string) => {
                    const d = new Date(dateStr);
                    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  };
                  
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-800">{a.name}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{a.department}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-block px-2.5 py-1 rounded text-xs font-medium border",
                          a.type === 'Insourced' && "bg-blue-50 text-blue-700 border-blue-200",
                          a.type === 'Cosourced' && "bg-teal-50 text-teal-700 border-teal-200",
                          a.type === 'Outsourced' && "bg-amber-50 text-amber-700 border-amber-200",
                        )}>
                          {a.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {a.startDate && a.endDate 
                          ? `${formatDate(a.startDate)} – ${formatDate(a.endDate)}`
                          : '—'
                        }
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-slate-600">
                        {a.type === 'Outsourced' ? '—' : a.resourceCount || 0}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn(
                          "font-mono font-semibold",
                          isUnpaid ? "text-red-600" : "text-[#2563eb]"
                        )}>
                          {formatFull(a.budget)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isUnpaid ? (
                          <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                            Unpaid
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">
                            {formatCurrency(runRate)}/mo
                          </span>
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Recommendations by Department
        </h2>
        
        <div className="space-y-3">
          {/* Critical Resources Expiring */}
          {criticalResources.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-red-500 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold uppercase text-red-600 mb-1">
                    Delivery Department
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">
                    {criticalResources.length} Critical Resources Expiring Q1-Q2
                  </h4>
                  <p className="text-sm text-slate-600">
                    {criticalResources.slice(0, 5).map((r, i) => {
                      const month = r.contractEnd 
                        ? new Date(r.contractEnd).toLocaleDateString('en-US', { month: 'short' })
                        : '';
                      return `${r.name} (${month})`;
                    }).join(', ')}
                    {' need extension decisions.'}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-6">
                  <div className="text-xs text-slate-500 mb-1">Cost to extend +3mo</div>
                  <div className="font-mono font-bold text-red-600">
                    +{formatCurrency(extensionCost)} SAR
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Outstanding Payments */}
          {unpaidAssignments.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-amber-500 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold uppercase text-amber-600 mb-1">
                    Delivery Department
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">
                    {unpaidAssignments.length} Outstanding Payments
                  </h4>
                  <p className="text-sm text-slate-600">
                    {unpaidAssignments.map(a => `${a.name} (${a.vendor} vendor)`).join(' and ')} completed but unpaid.
                  </p>
                </div>
                <div className="text-right shrink-0 ml-6">
                  <div className="text-xs text-slate-500 mb-1">Total outstanding</div>
                  <div className="font-mono font-bold text-amber-600">
                    {formatCurrency(unpaidTotal)} SAR
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Missing CTC Data - show departments with missing data */}
          {Object.entries(missingCTCByDept)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([dept, count]) => (
              <div key={dept} className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#2563eb] p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold uppercase text-[#2563eb] mb-1">
                      {dept} Department
                    </div>
                    <h4 className="font-semibold text-slate-800 mb-1">
                      {count} Resources Missing Compensation Data
                    </h4>
                    <p className="text-sm text-slate-600">
                      Cannot calculate budget for {dept} team. All CTC data needs to be entered.
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-6">
                    <div className="text-xs text-slate-500 mb-1">Action</div>
                    <button 
                      className="text-sm font-medium text-[#2563eb] hover:underline flex items-center gap-1"
                      onClick={() => navigate(`/admin/users?department=${dept}&filter=missing-ctc`)}
                    >
                      Fix Data <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          }

          {/* Empty state */}
          {criticalResources.length === 0 && unpaidAssignments.length === 0 && Object.keys(missingCTCByDept).length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <span className="text-sm">No critical recommendations at this time.</span>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <Dialog open={activeModal === 'insourced'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Insourced Resources ({insourcedResources.length})</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">RID</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Role</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Department</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Type</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Monthly CTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insourcedResources.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.rid}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-2 text-slate-600">{r.role}</td>
                  <td className="px-3 py-2 text-slate-600">{r.department}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
                      r.resourceType === 'Variable' ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", 
                        r.resourceType === 'Variable' ? "bg-blue-500" : "bg-violet-500"
                      )} />
                      {r.resourceType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {r.ctc ? formatCurrency(r.ctc) : <span className="text-red-500">Missing</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'fixed'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fixed Contracts</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Cosourced */}
            <div>
              <h4 className="text-sm font-bold text-teal-700 mb-3">Cosourced — {formatCurrency(budget.cosourced)}</h4>
              <div className="space-y-2">
                {data.assignments.filter(a => a.type === 'Cosourced').map(a => (
                  <div key={a.id} className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">{a.name}</div>
                      <div className="text-xs text-slate-500">{a.vendor}</div>
                    </div>
                    <span className="font-mono font-semibold text-teal-700">{formatCurrency(a.budget)}</span>
                  </div>
                ))}
                {data.assignments.filter(a => a.type === 'Cosourced').length === 0 && (
                  <div className="text-sm text-slate-500 p-3">No cosourced assignments</div>
                )}
              </div>
            </div>
            {/* Outsourced */}
            <div>
              <h4 className="text-sm font-bold text-amber-700 mb-3">Outsourced — {formatCurrency(budget.outsourced)}</h4>
              <div className="space-y-2">
                {data.assignments.filter(a => a.type === 'Outsourced').map(a => (
                  <div key={a.id} className={cn(
                    "flex justify-between items-center p-3 rounded-lg",
                    a.paymentStatus === 'unpaid' ? "bg-red-50 border border-red-200" : "bg-amber-50"
                  )}>
                    <div>
                      <div className="font-medium text-slate-800">{a.name}</div>
                      <div className="text-xs text-slate-500">{a.vendor}</div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-mono font-semibold",
                        a.paymentStatus === 'unpaid' ? "text-red-600" : "text-amber-700"
                      )}>
                        {formatCurrency(a.budget)}
                      </span>
                      {a.paymentStatus === 'unpaid' && (
                        <div className="text-xs text-red-600 font-medium">UNPAID</div>
                      )}
                    </div>
                  </div>
                ))}
                {data.assignments.filter(a => a.type === 'Outsourced').length === 0 && (
                  <div className="text-sm text-slate-500 p-3">No outsourced assignments</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'licenses'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Software Licenses ({data.licenseCount})</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Software</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600">Seats</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Monthly</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Annual</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600">Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.licenses.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{l.name}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{l.userCount || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(l.monthlyCost)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-violet-700">{formatCurrency(l.annualCost)}</td>
                  <td className="px-3 py-2 text-center text-sm text-slate-500">
                    {l.renewalDate ? new Date(l.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-violet-50 border-t-2 border-violet-200">
              <tr>
                <td className="px-3 py-3 font-bold text-violet-800">Total</td>
                <td></td>
                <td className="px-3 py-3 text-right font-mono font-bold text-violet-800">{formatCurrency(data.monthlyLicenseCost)}</td>
                <td className="px-3 py-3 text-right font-mono font-bold text-violet-800">{formatCurrency(budget.licenses)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
