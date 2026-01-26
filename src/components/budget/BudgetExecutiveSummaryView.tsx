/**
 * Budget Executive Summary View - Inline Tab View
 * Extracted from BudgetExecutiveModal for embedded display
 */

import { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatSAR, type BudgetPeriod } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment, DepartmentBudget, BudgetResource } from '@/hooks/budget/useBudgetData';
import { exportElementToPdf } from '@/utils/exports/exportToPdf';

interface BudgetExecutiveSummaryViewProps {
  data: {
    assignments: BudgetAssignment[];
    departments: Record<string, DepartmentBudget>;
    dataQualityIssues: { name: string; department: string; issue: string }[];
    licenseBudget?: number;
    licenseCount?: number;
    monthlyLicenseCost?: number;
    period?: BudgetPeriod;
    resources?: BudgetResource[];
  } | undefined;
  currentDept: string;
  onDeptChange: (dept: string) => void;
  period: BudgetPeriod;
}

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  'Q1': 'Q1 2026',
  'H1': 'H1 2026',
  'Full': 'Full Year 2026'
};

const EXEC_CONTENT_ID = 'budget-executive-summary-content';

export function BudgetExecutiveSummaryView({ data, currentDept, onDeptChange, period }: BudgetExecutiveSummaryViewProps) {
  const [execTypeFilter, setExecTypeFilter] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const periodLabel = PERIOD_LABELS[period];
      await exportElementToPdf(EXEC_CONTENT_ID, {
        filename: `budget-executive-summary-${periodLabel.replace(' ', '-').toLowerCase()}`,
        title: `Executive Budget Summary - ${periodLabel}`,
        orientation: 'landscape'
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        No budget data available
      </div>
    );
  }

  const periodLabel = PERIOD_LABELS[period];

  // Derive departments dynamically from actual data
  const departments = useMemo(() => [
    { id: 'all', name: 'All Departments' },
    ...Object.keys(data.departments)
      .filter(k => k !== 'all')
      .map(k => ({ 
        id: k, 
        name: k === 'Technical Support' ? 'Tech Support' : k 
      }))
  ], [data.departments]);

  const budget = data.departments[currentDept] || data.departments.all;
  const unpaidAssignments = data.assignments.filter(a => 
    a.paymentStatus?.toLowerCase() === 'unpaid'
  );
  const unpaidTotal = unpaidAssignments.reduce((s, a) => s + a.budget, 0);
  const cosourcedAssignments = data.assignments.filter(a => a.type === 'Cosourced');
  const outsourcedAssignments = data.assignments.filter(a => a.type === 'Outsourced');

  return (
    <div className="space-y-6" id={EXEC_CONTENT_ID}>
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isExporting}
          className="gap-1.5"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Export PDF
        </Button>
      </div>

      {/* Department Selector */}
      <div className="flex gap-2 flex-wrap">
        {departments.map(d => (
          <button
            key={d.id}
            className={cn(
              "px-4 py-2 text-[13px] font-medium rounded-lg border transition-all",
              currentDept === d.id 
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-blue-400"
            )}
            onClick={() => onDeptChange(d.id)}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Portfolio Overview Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">Portfolio Budget Overview</h3>
        <p className="text-sm text-slate-500">
          Total budget requirement — {currentDept === 'all' ? 'All Departments' : currentDept} • {periodLabel}
        </p>
      </div>

      {/* Unpaid Alert */}
      {unpaidAssignments.length > 0 && currentDept === 'all' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-bold text-red-800 mb-3">
            ⚠️ CRITICAL: {formatSAR(unpaidTotal)} Unpaid — Completed Outsourced
          </div>
          <div className="space-y-2">
            {unpaidAssignments.map(a => (
              <div key={a.id} className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-red-900">{a.name}</div>
                  <div className="text-xs text-red-600">Vendor: {a.vendor}</div>
                </div>
                <div className="text-sm font-bold text-red-900 font-mono">{formatSAR(a.budget)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Insourced */}
        <div 
          className={cn(
            'bg-white border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md',
            execTypeFilter === 'insourced' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
          )}
          onClick={() => setExecTypeFilter(execTypeFilter === 'insourced' ? null : 'insourced')}
        >
          <h4 className="text-sm font-semibold text-slate-600 mb-2">Insourced</h4>
          <div className="text-2xl font-bold text-blue-600 font-mono">{formatCurrency(budget.insourced)}</div>
          <div className="text-xs text-slate-500 mt-1">{budget.resources} resources • CTC × Duration</div>
          {budget.dataIssues > 0 && (
            <div className="text-xs text-amber-600 mt-2">⚠️ {budget.dataIssues} compensation details missing</div>
          )}
        </div>

        {/* Cosourced */}
        <div 
          className={cn(
            'bg-white border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md',
            execTypeFilter === 'cosourced' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
          )}
          onClick={() => setExecTypeFilter(execTypeFilter === 'cosourced' ? null : 'cosourced')}
        >
          <h4 className="text-sm font-semibold text-slate-600 mb-2">Cosourced</h4>
          <div className="text-2xl font-bold text-teal-600 font-mono">{formatCurrency(budget.cosourced)}</div>
          <div className="text-xs text-slate-500 mt-1">Fixed Vendor Budget</div>
          <div className="mt-3 space-y-1">
            {cosourcedAssignments.slice(0, 3).map(a => (
              <div key={a.id} className="flex justify-between text-xs py-1">
                <span className="text-slate-600 truncate max-w-[120px]">{a.vendor} — {a.name}</span>
                <span className="font-mono text-slate-700">{formatCurrency(a.budget)}</span>
              </div>
            ))}
            {cosourcedAssignments.length > 3 && (
              <div className="text-xs text-slate-400">+{cosourcedAssignments.length - 3} more</div>
            )}
          </div>
        </div>

        {/* Outsourced */}
        <div 
          className={cn(
            'bg-white border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md',
            execTypeFilter === 'outsourced' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-slate-200'
          )}
          onClick={() => setExecTypeFilter(execTypeFilter === 'outsourced' ? null : 'outsourced')}
        >
          <h4 className="text-sm font-semibold text-slate-600 mb-2">Outsourced</h4>
          <div className="text-2xl font-bold text-purple-600 font-mono">{formatCurrency(budget.outsourced)}</div>
          <div className="text-xs text-slate-500 mt-1">Fixed Contract</div>
          <div className="mt-3 space-y-1">
            {outsourcedAssignments.slice(0, 3).map(a => (
              <div key={a.id} className="flex justify-between text-xs py-1">
                <span className="text-slate-600 truncate max-w-[120px]">{a.vendor} — {a.name}</span>
                <span className={cn(
                  'font-mono',
                  a.paymentStatus?.toLowerCase() === 'unpaid' ? 'text-red-600' : 'text-slate-700'
                )}>
                  {formatCurrency(a.budget)}{a.paymentStatus?.toLowerCase() === 'unpaid' ? ' ⚠️' : ''}
                </span>
              </div>
            ))}
            {outsourcedAssignments.length > 3 && (
              <div className="text-xs text-slate-400">+{outsourcedAssignments.length - 3} more</div>
            )}
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="text-lg font-bold text-slate-900 mb-4">Department Budget Breakdown</h4>
        <div className="space-y-3">
          {departments.filter(d => d.id !== 'all').map(d => {
            const b = data.departments[d.id];
            if (!b) return null;
            const maxTotal = Math.max(...departments.filter(x => x.id !== 'all').map(x => data.departments[x.id]?.total || 0));
            const barWidth = maxTotal > 0 ? (b.total / maxTotal * 100) : 0;
            const pI = b.total > 0 ? (b.insourced / b.total * 100) : 0;
            const pC = b.total > 0 ? (b.cosourced / b.total * 100) : 0;
            const pO = b.total > 0 ? (b.outsourced / b.total * 100) : 0;

            return (
              <div key={d.id} className="flex items-center py-2 border-b border-slate-100 last:border-0">
                <span className="w-[100px] font-medium text-sm text-slate-700">{d.name}</span>
                <div className="flex-1 mx-4">
                  <div 
                    className="h-6 bg-slate-100 rounded overflow-hidden flex"
                    style={{ width: `${barWidth}%`, minWidth: '20px' }}
                  >
                    {pI > 0 && <div style={{ width: `${pI}%` }} className="bg-blue-500" />}
                    {pC > 0 && <div style={{ width: `${pC}%` }} className="bg-teal-500" />}
                    {pO > 0 && <div style={{ width: `${pO}%` }} className="bg-purple-500" />}
                  </div>
                </div>
                <span className="w-[100px] text-right font-bold font-mono text-sm">{formatCurrency(b.total)}</span>
                <span className="w-[80px] text-right text-xs text-slate-500">
                  {b.resources} res{b.dataIssues > 0 ? ' ⚠️' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Quality Note */}
      {data.dataQualityIssues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-amber-800 mb-2">
            ⚠️ Data Quality Issues ({data.dataQualityIssues.length})
          </div>
          <div className="text-xs text-amber-700">
            {data.dataQualityIssues.length} resources missing compensation data. Complete CTC entry for accurate budget forecasting.
          </div>
        </div>
      )}

      {/* Forecast Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
          <div className="text-xs text-emerald-700 mb-2">Jan 2026 Consumed</div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {formatCurrency(budget.insourced / 4)}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
          <div className="text-xs text-blue-700 mb-2">Remaining (Feb+)</div>
          <div className="text-2xl font-bold font-mono text-blue-700">
            {formatCurrency(budget.insourced * 0.75)}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <div className="text-xs text-slate-600 mb-2">Total {periodLabel} Commitment</div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(budget.total)}
          </div>
        </div>
      </div>
    </div>
  );
}
