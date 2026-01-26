/**
 * Budget Summary Tab - V8 Design
 * Portfolio baseline cards, department budget bars with quarterly values,
 * assignment costs table, and recommendations section
 */

import { useState, useMemo } from 'react';
import { ChevronRight, AlertTriangle, DollarSign, Users, FileText, TrendingUp, Calendar, Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatFull, type BudgetPeriod, type BudgetResource, type BudgetAssignment, type DepartmentBudget, type BudgetLicense } from '@/hooks/budget/useBudgetData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  total: 'from-slate-600 to-slate-700',
  insourced: 'from-[#2563eb] to-[#3b82f6]',
  fixed: 'from-[#d97706] to-[#f59e0b]',
  licenses: 'from-[#7c3aed] to-[#a78bfa]',
};

export function BudgetSummaryTab({ data, period }: BudgetSummaryTabProps) {
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
  
  // Calculate quarterly values for Delivery department
  const deliveryBudget = data.departments['Delivery'];
  const quarterlyValues = useMemo(() => {
    if (!deliveryBudget) return { q1: 0, q2: 0, q3: 0, q4: 0 };
    const monthlyRate = deliveryBudget.insourced / months;
    return {
      q1: monthlyRate * 3,
      q2: monthlyRate * 6,
      q3: monthlyRate * 9,
      q4: monthlyRate * 12,
    };
  }, [deliveryBudget, months]);

  // Critical resources expiring soon
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

  // Unpaid outsourced
  const unpaidAssignments = data.assignments.filter(a => 
    a.type === 'Outsourced' && a.paymentStatus === 'unpaid'
  );
  const unpaidTotal = unpaidAssignments.reduce((sum, a) => sum + a.budget, 0);

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

  // Department list for breakdown
  const departments = Object.keys(data.departments).filter(k => k !== 'all');

  return (
    <div className="space-y-8">
      {/* Section 1: Portfolio Baseline Cards */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Portfolio Baseline
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {/* Total Budget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden">
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.total)} />
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Budget</span>
            </div>
            <div className="font-mono text-4xl font-bold text-slate-900 mb-2">
              {formatCurrency(budget.total)}
            </div>
            <div className="text-sm text-slate-500">
              SAR • {period === 'Q1' ? 'Q1' : period === 'H1' ? 'H1' : 'Full Year'} 2026
            </div>
          </div>

          {/* Insourced */}
          <div 
            className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
            onClick={() => setActiveModal('insourced')}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.insourced)} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2563eb]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Insourced</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-mono text-4xl font-bold text-[#2563eb] mb-2">
              {formatCurrency(budget.insourced)}
            </div>
            <div className="text-sm text-slate-500">
              {insourcedResources.length} resources
            </div>
          </div>

          {/* Fixed Contracts */}
          <div 
            className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
            onClick={() => setActiveModal('fixed')}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.fixed)} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#d97706]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fixed Contracts</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-mono text-4xl font-bold text-[#d97706] mb-2">
              {formatCurrency(fixedTotal)}
            </div>
            <div className="text-sm text-slate-500">
              Cosourced + Outsourced
            </div>
          </div>

          {/* Licenses */}
          <div 
            className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
            onClick={() => setActiveModal('licenses')}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", cardColors.licenses)} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7c3aed]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Licenses</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-mono text-4xl font-bold text-[#7c3aed] mb-2">
              {formatCurrency(budget.licenses)}
            </div>
            <div className="text-sm text-slate-500">
              {data.licenseCount} active
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Department Budgets with Quarterly Values */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Department Budgets
          </h2>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[140px_1fr_120px_100px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="text-xs font-bold uppercase text-slate-500">Department</div>
            <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
              <span>Q1</span>
              <span>Q2</span>
              <span>Q3</span>
              <span>Q4</span>
            </div>
            <div className="text-xs font-bold uppercase text-slate-500 text-right">Total</div>
            <div className="text-xs font-bold uppercase text-slate-500 text-right">Run Rate</div>
          </div>
          
          {/* Department Rows */}
          {departments.map(deptName => {
            const dept = data.departments[deptName];
            if (!dept) return null;
            
            const hasBudget = dept.total > 0;
            const monthlyRate = hasBudget ? dept.insourced / months : 0;
            const maxBudget = Math.max(...departments.map(d => data.departments[d]?.total || 0));
            const barWidth = maxBudget > 0 ? (dept.total / maxBudget * 100) : 0;
            
            // Calculate quarterly cumulative values
            const q1 = monthlyRate * 3;
            const q2 = monthlyRate * 6;
            const q3 = monthlyRate * 9;
            const q4 = monthlyRate * 12;
            
            const resourceCount = data.resources.filter(r => r.department === deptName).length;
            
            return (
              <div 
                key={deptName}
                className="grid grid-cols-[140px_1fr_120px_100px] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                onClick={() => { setSelectedDept(deptName); setActiveModal('department'); }}
              >
                <div>
                  <div className="font-medium text-sm text-slate-800">{deptName}</div>
                  <div className="text-xs text-slate-500">{resourceCount} resources</div>
                </div>
                
                <div className="flex flex-col justify-center">
                  {hasBudget ? (
                    <>
                      {/* Progress Bar */}
                      <div className="h-5 bg-slate-100 rounded-full overflow-hidden relative mb-1">
                        <div 
                          className="h-full bg-gradient-to-r from-[#2563eb] to-[#60a5fa] rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                        {/* Quarter markers */}
                        <div className="absolute inset-0 flex">
                          {[25, 50, 75].map(pct => (
                            <div key={pct} className="flex-1 border-r border-dashed border-slate-300" />
                          ))}
                          <div className="flex-1" />
                        </div>
                      </div>
                      {/* Quarterly values */}
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>{formatCurrency(q1)}</span>
                        <span>{formatCurrency(q2)}</span>
                        <span>{formatCurrency(q3)}</span>
                        <span>{formatCurrency(q4)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-5 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-xs text-slate-400">—</span>
                    </div>
                  )}
                </div>
                
                <div className="text-right font-mono font-bold text-sm text-slate-800">
                  {hasBudget ? formatCurrency(dept.total) : '0'}
                </div>
                
                <div className="text-right">
                  {hasBudget ? (
                    <span className="text-sm text-slate-600">{formatCurrency(monthlyRate)}/mo</span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      △{missingCTCByDept[deptName] || 0} missing
                    </span>
                  )}
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
          <span className="text-xs text-slate-500">{data.assignments.length} assignments</span>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Assignment</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Department</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Duration</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">Resources</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.assignments
                .sort((a, b) => b.budget - a.budget)
                .slice(0, 8)
                .map(a => {
                  const isUnpaid = a.paymentStatus === 'unpaid';
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm text-slate-800">{a.name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{a.department}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          a.type === 'Insourced' && "bg-blue-100 text-blue-700",
                          a.type === 'Cosourced' && "bg-teal-100 text-teal-700",
                          a.type === 'Outsourced' && "bg-amber-100 text-amber-700",
                        )}>
                          {a.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {a.startDate && a.endDate 
                          ? `${new Date(a.startDate).toLocaleDateString('en-US', { month: 'short' })} – ${new Date(a.endDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {a.type === 'Outsourced' ? '—' : a.resourceCount || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "font-mono font-semibold text-sm",
                          isUnpaid ? "text-red-600" : "text-slate-800"
                        )}>
                          {formatCurrency(a.budget)}
                          {isUnpaid && ' ⚠'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Recommendations */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Recommendations by Department
        </h2>
        
        <div className="space-y-3">
          {/* Critical Resources Alert */}
          {criticalResources.length > 0 && (
            <div className="bg-white rounded-xl border-l-4 border-l-red-500 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-100 rounded">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase text-slate-500">Delivery Department</span>
                    <span className="text-sm font-mono font-semibold text-red-600">
                      Cost: +{formatCurrency(criticalResources.reduce((sum, r) => sum + (r.ctc || 0) * 3, 0))} SAR
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">
                    {criticalResources.length} Critical Resources Expiring Q1-Q2
                  </h4>
                  <p className="text-sm text-slate-600">
                    {criticalResources.slice(0, 3).map(r => r.name).join(', ')}
                    {criticalResources.length > 3 && ` +${criticalResources.length - 3} more`}
                    {' — need extension decisions'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Unpaid Payments Alert */}
          {unpaidAssignments.length > 0 && (
            <div className="bg-white rounded-xl border-l-4 border-l-amber-500 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 rounded">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase text-slate-500">Delivery Department</span>
                    <span className="text-sm font-mono font-semibold text-amber-600">
                      Total: {formatCurrency(unpaidTotal)} SAR
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">
                    {unpaidAssignments.length} Outstanding Payments
                  </h4>
                  <p className="text-sm text-slate-600">
                    {unpaidAssignments.map(a => `${a.name} (${a.vendor})`).join(' and ')} completed but unpaid
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Missing CTC Alerts */}
          {Object.entries(missingCTCByDept).map(([dept, count]) => (
            <div key={dept} className="bg-white rounded-xl border-l-4 border-l-slate-400 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-slate-100 rounded">
                  <Building2 className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase text-slate-500">{dept} Department</span>
                    <button className="text-xs font-semibold text-blue-600 hover:underline">
                      Fix Data →
                    </button>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">
                    {count} Resources Missing Compensation Data
                  </h4>
                  <p className="text-sm text-slate-600">
                    Cannot calculate budget. All CTC data needs entry.
                  </p>
                </div>
              </div>
            </div>
          ))}
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
