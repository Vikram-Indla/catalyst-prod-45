/**
 * Budget Data Quality Tab - V8 Design
 * Per spec: 4 metric cards, department table, expandable resource lists, Fix CTC Modal
 */

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Calendar, Download, AlertTriangle, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatCurrency, type BudgetPeriod, type BudgetResource } from '@/hooks/budget/useBudgetData';
import { FixCTCModal } from './FixCTCModal';

interface BudgetDataQualityTabProps {
  data: {
    resources: BudgetResource[];
    departments: Record<string, { total: number }>;
  } | null;
  period: BudgetPeriod;
  totalBudget: number;
  onRefresh?: () => void;
}

interface DepartmentQuality {
  name: string;
  totalResources: number;
  withCTC: number;
  missingCTC: number;
  coverage: number;
  missingResources: BudgetResource[];
}

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'Q1', label: 'Q1' },
  { value: 'H1', label: 'H1' },
  { value: 'Full', label: 'Full Year' },
];

const DEPT_ORDER = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];

export function BudgetDataQualityTab({ data, period, totalBudget, onRefresh }: BudgetDataQualityTabProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentQuality | null>(null);

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
    const complete = data.resources.filter(r => r.ctc && r.ctc > 0).length;
    const missing = total - complete;
    const score = total > 0 ? Math.round((complete / total) * 100) : 0;

    return { total, complete, missing, score };
  }, [data.resources]);

  // Calculate by department with resource lists
  const departmentQuality = useMemo<DepartmentQuality[]>(() => {
    const byDept: Record<string, { 
      total: number; 
      withCTC: number; 
      resources: BudgetResource[];
      missing: BudgetResource[];
    }> = {};

    data.resources.forEach(r => {
      if (!byDept[r.department]) {
        byDept[r.department] = { total: 0, withCTC: 0, resources: [], missing: [] };
      }
      byDept[r.department].total++;
      byDept[r.department].resources.push(r);
      if (r.ctc && r.ctc > 0) {
        byDept[r.department].withCTC++;
      } else {
        byDept[r.department].missing.push(r);
      }
    });

    return DEPT_ORDER
      .filter(name => byDept[name])
      .map(name => {
        const info = byDept[name];
        const missingCount = info.total - info.withCTC;
        const coverage = info.total > 0 ? Math.round((info.withCTC / info.total) * 100) : 0;
        return {
          name,
          totalResources: info.total,
          withCTC: info.withCTC,
          missingCTC: missingCount,
          coverage,
          missingResources: info.missing,
        };
      });
  }, [data.resources]);

  // Totals for table footer
  const totals = useMemo(() => {
    return departmentQuality.reduce(
      (acc, d) => ({
        total: acc.total + d.totalResources,
        complete: acc.complete + d.withCTC,
        missing: acc.missing + d.missingCTC,
      }),
      { total: 0, complete: 0, missing: 0 }
    );
  }, [departmentQuality]);

  const getPeriodLabel = () => {
    const periodLabels: Record<BudgetPeriod, string> = {
      Q1: 'Q1 2026 (Jan–Mar)',
      H1: 'H1 2026 (Jan–Jun)',
      Full: 'Full Year 2026 (Jan–Dec)',
    };
    return periodLabels[period];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBadgeClass = (coverage: number) => {
    if (coverage >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (coverage >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const toggleExpand = (deptName: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptName)) {
        next.delete(deptName);
      } else {
        next.add(deptName);
      }
      return next;
    });
  };

  const toggleAllExpand = () => {
    if (expandedDepts.size > 0) {
      setExpandedDepts(new Set());
    } else {
      setExpandedDepts(new Set(departmentQuality.filter(d => d.missingCTC > 0).map(d => d.name)));
    }
  };

  const handleFixData = (dept: DepartmentQuality) => {
    setSelectedDept(dept);
    setFixModalOpen(true);
  };

  const handleSaved = () => {
    onRefresh?.();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Period Toggle + Context Badge */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {PERIODS.map(p => (
            <div
              key={p.value}
              className={cn(
                'px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150',
                period === p.value
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              {p.label}
            </div>
          ))}
        </div>

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

      <div className="border-b border-border" />

      {/* DATA QUALITY METRICS - 4 Cards per spec */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Data Quality Metrics
        </h2>

        <div className="grid grid-cols-4 gap-4">
          {/* Total Resources */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Total Resources
            </div>
            <div className="text-4xl font-bold text-foreground mb-1">
              {qualityMetrics.total}
            </div>
            <div className="text-sm text-muted-foreground">In resource inventory</div>
          </div>

          {/* Complete Records */}
          <div className="bg-card border border-border rounded-xl p-5 border-l-4 border-l-blue-500">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Complete Records
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-1">
              {qualityMetrics.complete}
            </div>
            <div className="text-sm text-muted-foreground">With CTC data</div>
          </div>

          {/* Missing CTC */}
          <div className="bg-card border border-border rounded-xl p-5 border-l-4 border-l-amber-500">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Missing CTC
            </div>
            <div className="text-4xl font-bold text-amber-600 mb-1">
              {qualityMetrics.missing}
            </div>
            <div className="text-sm text-muted-foreground">Need compensation data</div>
          </div>

          {/* Quality Score */}
          <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Data Quality
            </div>
            <div className={cn('text-4xl font-bold mb-1', getScoreTextColor(qualityMetrics.score))}>
              {qualityMetrics.score}%
            </div>
            <div className="text-sm text-muted-foreground">Completeness score</div>
            {/* Progress bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
              <div
                className={cn('h-full transition-all duration-500', getScoreColor(qualityMetrics.score))}
                style={{ width: `${qualityMetrics.score}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* MISSING DATA BY DEPARTMENT TABLE */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Missing Data by Department
          </h2>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Department
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Complete
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Missing
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quality
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departmentQuality.map(dept => (
                <tr key={dept.name} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 font-semibold text-foreground">{dept.name}</td>
                  <td className="px-5 py-4 text-center text-muted-foreground">{dept.totalResources}</td>
                  <td className="px-5 py-4 text-center text-muted-foreground">{dept.withCTC}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn('font-medium', dept.missingCTC > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                      {dept.missingCTC}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', getBadgeClass(dept.coverage))}>
                      {dept.coverage}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {dept.missingCTC > 0 ? (
                      <button
                        onClick={() => handleFixData(dept)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Fix {dept.missingCTC}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                        <Check className="w-4 h-4" />
                        Complete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 border-t-2 border-border">
                <td className="px-5 py-4 font-bold text-foreground">TOTAL</td>
                <td className="px-5 py-4 text-center font-bold">{totals.total}</td>
                <td className="px-5 py-4 text-center font-bold">{totals.complete}</td>
                <td className="px-5 py-4 text-center font-bold text-red-600">{totals.missing}</td>
                <td className="px-5 py-4 text-center">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', getBadgeClass(qualityMetrics.score))}>
                    {qualityMetrics.score}%
                  </span>
                </td>
                <td className="px-5 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* EXPANDABLE RESOURCE LISTS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Resources with Missing CTC
          </h2>
          <Button variant="ghost" size="sm" onClick={toggleAllExpand}>
            {expandedDepts.size > 0 ? '▲ Collapse All' : '▼ Expand All'}
          </Button>
        </div>

        <div className="space-y-2">
          {departmentQuality.filter(d => d.missingCTC > 0).map(dept => (
            <div key={dept.name} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center gap-3 px-5 py-3 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(dept.name)}
              >
                {expandedDepts.has(dept.name) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex-1">
                  {dept.name}
                </span>
                <span className="text-xs font-semibold text-amber-600">{dept.missingCTC} missing</span>
                <Button
                  variant="default"
                  size="sm"
                  className="ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFixData(dept);
                  }}
                >
                  Fix All
                </Button>
              </div>

              {/* Expanded Content */}
              {expandedDepts.has(dept.name) && (
                <div className="p-4 border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          RID
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Role
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Vendor
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Contract End
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          CTC
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {dept.missingResources.map(r => (
                        <tr key={r.id} className="hover:bg-muted/10">
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {r.rid?.padStart(3, '0') || '—'}
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.role || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.vendorName || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{formatDate(r.contractEnd)}</td>
                          <td className="px-3 py-2 text-red-600 font-semibold">Missing</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {departmentQuality.filter(d => d.missingCTC > 0).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">All Data Complete</h3>
              <p className="text-sm text-muted-foreground">
                All resources have compensation data entered
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Fix CTC Modal */}
      {selectedDept && (
        <FixCTCModal
          open={fixModalOpen}
          onOpenChange={setFixModalOpen}
          department={selectedDept.name}
          resources={selectedDept.missingResources.map(r => ({
            id: r.id,
            rid: r.rid,
            name: r.name,
            role: r.role,
            vendorName: r.vendorName,
            contractEnd: r.contractEnd,
            ctc: r.ctc,
          }))}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
