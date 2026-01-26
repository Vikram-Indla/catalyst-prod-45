/**
 * Budget Data Quality Tab - V8 Design
 * Matches reference: Overview cards + Department table
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type BudgetPeriod, type BudgetResource } from '@/hooks/budget/useBudgetData';

interface BudgetDataQualityTabProps {
  data: {
    resources: BudgetResource[];
    departments: Record<string, { total: number }>;
  } | null;
  period: BudgetPeriod;
  totalBudget: number;
}

interface DepartmentQuality {
  name: string;
  totalResources: number;
  withCTC: number;
  missingCTC: number;
  coverage: number;
}

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'Q1', label: 'Q1' },
  { value: 'H1', label: 'H1' },
  { value: 'Full', label: 'Full Year' },
];

export function BudgetDataQualityTab({ data, period, totalBudget }: BudgetDataQualityTabProps) {
  const navigate = useNavigate();

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading data quality information...
      </div>
    );
  }

  // Calculate quality metrics
  const qualityMetrics = useMemo(() => {
    const total = data.resources.length;
    
    // Compensation Data (has CTC)
    const withCTC = data.resources.filter(r => r.ctc && r.ctc > 0).length;
    const compensationPct = total > 0 ? Math.round((withCTC / total) * 100) : 0;
    
    // Contract Dates (has contract_end)
    const withContractDate = data.resources.filter(r => r.contractEnd).length;
    const contractPct = total > 0 ? Math.round((withContractDate / total) * 100) : 0;
    
    // Vendor Mapping (has vendorName)
    const withVendor = data.resources.filter(r => r.vendorName).length;
    const vendorPct = total > 0 ? Math.round((withVendor / total) * 100) : 0;
    
    // Assignment Mapping (has assignmentName)
    const withAssignment = data.resources.filter(r => r.assignmentName).length;
    const assignmentPct = total > 0 ? Math.round((withAssignment / total) * 100) : 0;
    
    return {
      compensation: { pct: compensationPct, count: withCTC, total },
      contract: { pct: contractPct, count: withContractDate, total },
      vendor: { pct: vendorPct, count: withVendor, total },
      assignment: { pct: assignmentPct, count: withAssignment, total },
    };
  }, [data.resources]);

  // Calculate by department
  const departmentQuality = useMemo<DepartmentQuality[]>(() => {
    const byDept: Record<string, { total: number; withCTC: number }> = {};
    
    data.resources.forEach(r => {
      if (!byDept[r.department]) {
        byDept[r.department] = { total: 0, withCTC: 0 };
      }
      byDept[r.department].total++;
      if (r.ctc && r.ctc > 0) {
        byDept[r.department].withCTC++;
      }
    });

    // Order departments consistently
    const deptOrder = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];
    
    return deptOrder
      .filter(name => byDept[name])
      .map(name => {
        const info = byDept[name];
        const missing = info.total - info.withCTC;
        const coverage = info.total > 0 ? Math.round((info.withCTC / info.total) * 100) : 0;
        return {
          name,
          totalResources: info.total,
          withCTC: info.withCTC,
          missingCTC: missing,
          coverage,
        };
      });
  }, [data.resources]);

  const handleFixData = (department: string, count: number) => {
    navigate(`/admin/users?department=${encodeURIComponent(department)}&filter=missing-ctc`);
  };

  // Get period label
  const getPeriodLabel = () => {
    const periodLabels: Record<BudgetPeriod, string> = {
      'Q1': 'Q1 2026 (Jan–Mar)',
      'H1': 'H1 2026 (Jan–Jun)',
      'Full': 'Full Year 2026 (Jan–Dec)',
    };
    return periodLabels[period];
  };

  // Color for percentage
  const getPctColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600';
    if (pct >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Period Toggle + Context Badge - matches Budget tab */}
      <div className="flex items-center justify-between">
        {/* Period Toggle (display only - not interactive here) */}
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {PERIODS.map(p => (
            <div
              key={p.value}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150",
                period === p.value
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {p.label}
            </div>
          ))}
        </div>
        
        {/* Context Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{getPeriodLabel()}</span>
            <span className="mx-2 text-border">•</span>
            <span className="font-mono font-bold text-primary">
              {formatCurrency(totalBudget)} SAR
            </span>
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-border" />

      {/* DATA QUALITY OVERVIEW */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Data Quality Overview
        </h2>
        
        <div className="grid grid-cols-4 gap-4">
          {/* Compensation Data */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Compensation Data
            </div>
            <div className={cn("text-4xl font-bold mb-1", getPctColor(qualityMetrics.compensation.pct))}>
              {qualityMetrics.compensation.pct}%
            </div>
            <div className="text-sm text-muted-foreground">
              {qualityMetrics.compensation.count} of {qualityMetrics.compensation.total} resources
            </div>
          </div>

          {/* Contract Dates */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Contract Dates
            </div>
            <div className={cn("text-4xl font-bold mb-1", getPctColor(qualityMetrics.contract.pct))}>
              {qualityMetrics.contract.pct}%
            </div>
            <div className="text-sm text-muted-foreground">
              {qualityMetrics.contract.count} of {qualityMetrics.contract.total} resources
            </div>
          </div>

          {/* Vendor Mapping */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Vendor Mapping
            </div>
            <div className={cn("text-4xl font-bold mb-1", getPctColor(qualityMetrics.vendor.pct))}>
              {qualityMetrics.vendor.pct}%
            </div>
            <div className="text-sm text-muted-foreground">
              {qualityMetrics.vendor.count} of {qualityMetrics.vendor.total} resources
            </div>
          </div>

          {/* Assignment Mapping */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Assignment Mapping
            </div>
            <div className={cn("text-4xl font-bold mb-1", getPctColor(qualityMetrics.assignment.pct))}>
              {qualityMetrics.assignment.pct}%
            </div>
            <div className="text-sm text-muted-foreground">
              {qualityMetrics.assignment.count} of {qualityMetrics.assignment.total} resources
            </div>
          </div>
        </div>
      </section>

      {/* MISSING DATA BY DEPARTMENT */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Missing Data by Department
        </h2>
        
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Department
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Resources
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  With CTC
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Missing CTC
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Coverage
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departmentQuality.map((dept) => (
                <tr key={dept.name} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 font-medium text-foreground">
                    {dept.name}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {dept.totalResources}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {dept.withCTC}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "font-medium",
                      dept.missingCTC > 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {dept.missingCTC}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "font-medium",
                      getPctColor(dept.coverage)
                    )}>
                      {dept.coverage}%
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {dept.missingCTC > 0 ? (
                      <button
                        onClick={() => handleFixData(dept.name, dept.missingCTC)}
                        className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Fix {dept.missingCTC}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
