/**
 * Budget Data Quality Tab - V8 Design (Comprehensive Fixes V2)
 * 
 * Fixes implemented:
 * 1. Individual Edit opens single-resource modal (not full department)
 * 2. Export Report button downloads CSV
 * 3. Metric cards are clickable with detail modals
 * 4. Improved table text visibility and density
 * 5. Enhanced metric card visual weight
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Calendar, Download, AlertTriangle, Check, Users, Pencil, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatCurrency, type BudgetPeriod, type BudgetResource } from '@/hooks/budget/useBudgetData';
import { FixCTCModal } from './FixCTCModal';
import { SingleResourceEditModal } from './SingleResourceEditModal';
import { 
  TotalResourcesModal, 
  CompleteRecordsModal, 
  MissingCTCModal, 
  DataQualityBreakdownModal 
} from './DataQualityDetailModals';
import { toast } from 'sonner';
import { PeriodToggle, DEPT_ORDER } from './shared';

interface BudgetDataQualityTabProps {
  data: {
    resources: BudgetResource[];
    departments: Record<string, { total: number }>;
  } | null;
  period: BudgetPeriod;
  totalBudget: number;
  onRefresh?: () => void;
  fixDepartment?: string; // Optional department to auto-open Fix modal for
  onPeriodChange?: (period: BudgetPeriod) => void; // Callback to change period
}

interface DepartmentQuality {
  name: string;
  totalResources: number;
  withCTC: number;
  missingCTC: number;
  coverage: number;
  missingResources: BudgetResource[];
  allResources: BudgetResource[];
}

// Using DEPT_ORDER from shared constants

export function BudgetDataQualityTab({ data, period, totalBudget, onRefresh, fixDepartment, onPeriodChange }: BudgetDataQualityTabProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentQuality | null>(null);
  
  // Single resource edit state
  const [singleEditModalOpen, setSingleEditModalOpen] = useState(false);
  const [singleEditResource, setSingleEditResource] = useState<BudgetResource | null>(null);
  
  // Detail modals state
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  
  // Export loading state (DQ-2 fix)
  const [isExporting, setIsExporting] = useState(false);

  // Calculate quality metrics
  const qualityMetrics = useMemo(() => {
    if (!data) return { total: 0, complete: 0, missing: 0, score: 0 };
    const total = data.resources.length;
    // CTC is considered present even if the value is 0; only null/undefined means missing
    const complete = data.resources.filter(r => r.ctc !== null && r.ctc !== undefined).length;
    const missing = total - complete;
    const score = total > 0 ? Math.round((complete / total) * 100) : 0;

    return { total, complete, missing, score };
  }, [data?.resources]);

  // Calculate by department with resource lists
  const departmentQuality = useMemo<DepartmentQuality[]>(() => {
    if (!data) return [];
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
      // CTC is considered present even if the value is 0; only null/undefined means missing
      if (r.ctc !== null && r.ctc !== undefined) {
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
          allResources: info.resources,
        };
      });
  }, [data?.resources]);

  // Handle auto-open for fixDepartment prop
  useEffect(() => {
    if (fixDepartment && data) {
      const dept = departmentQuality.find(d => d.name === fixDepartment);
      if (dept && dept.missingCTC > 0) {
        setSelectedDept(dept);
        setFixModalOpen(true);
      }
    }
  }, [fixDepartment, data, departmentQuality]);

  // Dept stats for quality breakdown modal
  const deptStats = useMemo(() => {
    return departmentQuality.map(d => ({
      name: d.name,
      total: d.totalResources,
      complete: d.withCTC,
      missing: d.missingCTC,
      quality: d.coverage,
    }));
  }, [departmentQuality]);

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
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBadgeClass = (coverage: number) => {
    if (coverage >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (coverage >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
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

  const handleFixAllDept = (dept: DepartmentQuality) => {
    setSelectedDept(dept);
    setFixModalOpen(true);
  };

  // FIX #1: Individual Edit opens single-resource modal
  const handleEditSingleResource = (resource: BudgetResource) => {
    setSingleEditResource(resource);
    setSingleEditModalOpen(true);
  };

  const handleSingleEditSaved = () => {
    setSingleEditResource(null);
    onRefresh?.();
  };

  const handleBulkSaved = () => {
    onRefresh?.();
  };

  // FIX #2: Export Report functionality with loading state (DQ-2 fix)
  const handleExportReport = async () => {
    if (!data || isExporting) return;

    setIsExporting(true);
    
    try {
      // Simulate slight delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const total = data.resources.length;
      const complete = data.resources.filter(r => r.ctc !== null && r.ctc !== undefined).length;
      const missing = total - complete;
      const quality = total > 0 ? Math.round((complete / total) * 100) : 0;

      // Generate CSV content
      const csvRows: string[][] = [
        ['DATA QUALITY REPORT', '', '', '', '', ''],
        ['Generated:', new Date().toISOString(), '', '', '', ''],
        ['', '', '', '', '', ''],
        ['SUMMARY', '', '', '', '', ''],
        ['Total Resources:', total.toString(), '', '', '', ''],
        ['Complete Records:', complete.toString(), '', '', '', ''],
        ['Missing CTC:', missing.toString(), '', '', '', ''],
        ['Quality Score:', `${quality}%`, '', '', '', ''],
        ['', '', '', '', '', ''],
        ['RESOURCES WITH MISSING CTC', '', '', '', '', ''],
        ['RID', 'Name', 'Role', 'Department', 'Vendor', 'Contract End'],
      ];

      // Add missing resources
      data.resources
        .filter(r => r.ctc === null || r.ctc === undefined)
        .forEach(r => {
          csvRows.push([
            r.rid?.padStart(3, '0') || '',
            r.name,
            r.role || '',
            r.department,
            r.vendorName || '',
            r.contractEnd || '',
          ]);
        });

      // Create and download CSV
      const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `data-quality-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      URL.revokeObjectURL(url);
      toast.success('Report exported successfully!');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle "Fix All" from Missing CTC modal
  const handleFixAllFromModal = () => {
    // Find department with most missing
    const deptWithMost = departmentQuality
      .filter(d => d.missingCTC > 0)
      .sort((a, b) => b.missingCTC - a.missingCTC)[0];
    
    if (deptWithMost) {
      setSelectedDept(deptWithMost);
      setFixModalOpen(true);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading data quality information...
      </div>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Data Quality Analysis">
      {/* Period Toggle + Context Badge - A11Y-1: ARIA labels */}
      <div className="flex items-center justify-between">
        <PeriodToggle 
          period={period} 
          onPeriodChange={onPeriodChange} 
        />

        <div 
          className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl"
          aria-label={`Current period: ${getPeriodLabel()}, Total budget: ${formatCurrency(totalBudget)} SAR`}
        >
          <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{getPeriodLabel()}</span>
            <span className="mx-2 text-border" aria-hidden="true">•</span>
            <span className="font-mono font-bold text-primary">
              {formatCurrency(totalBudget)} SAR
            </span>
          </span>
        </div>
      </div>

      <div className="border-b border-border" />

      {/* DATA QUALITY METRICS - A11Y-1: ARIA labels and focus states */}
      <section aria-labelledby="quality-metrics-heading">
        <h2 id="quality-metrics-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Data Quality Metrics
        </h2>

        <div className="grid grid-cols-4 gap-4" role="list" aria-label="Quality metric cards">
          {/* Total Resources - CLICKABLE with A11Y */}
          <button 
            type="button"
            onClick={() => setShowTotalModal(true)}
            aria-label={`Total Resources: ${qualityMetrics.total}. Click to view details.`}
            className={cn(
              "relative bg-card border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-left",
              "border-l-4 border-l-slate-400 dark:border-l-slate-500",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5 hover:border-l-slate-500 dark:hover:border-l-slate-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Total Resources
            </div>
            <div className="text-[32px] font-bold text-slate-800 dark:text-slate-100 font-mono leading-none mb-1">
              {qualityMetrics.total}
            </div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400">In resource inventory</div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </button>

          {/* Complete Records - CLICKABLE with A11Y */}
          <button 
            type="button"
            onClick={() => setShowCompleteModal(true)}
            aria-label={`Complete Records: ${qualityMetrics.complete}. Click to view details.`}
            className={cn(
              "relative bg-card border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-left",
              "border-l-4 border-l-blue-500",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5 hover:border-l-blue-600",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Complete Records
            </div>
            <div className="text-[32px] font-bold text-blue-600 dark:text-blue-400 font-mono leading-none mb-1">
              {qualityMetrics.complete}
            </div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400">With CTC data</div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-blue-300 dark:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </button>

          {/* Missing CTC - CLICKABLE with A11Y */}
          <button 
            type="button"
            onClick={() => setShowMissingModal(true)}
            aria-label={`Missing CTC: ${qualityMetrics.missing}. Click to view details.`}
            className={cn(
              "relative bg-card border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-left",
              "border-l-4 border-l-amber-500",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5 hover:border-l-amber-600",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Missing CTC
            </div>
            <div className="text-[32px] font-bold text-amber-600 dark:text-amber-400 font-mono leading-none mb-1">
              {qualityMetrics.missing}
            </div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400">Need compensation data</div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-amber-300 dark:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </button>

          {/* Quality Score - CLICKABLE with A11Y */}
          <button 
            type="button"
            onClick={() => setShowQualityModal(true)}
            aria-label={`Data Quality: ${qualityMetrics.score}% completeness score. Click to view breakdown.`}
            className={cn(
              "relative bg-card border border-slate-200 dark:border-slate-700 rounded-xl p-5 overflow-hidden text-left",
              "border-l-4",
              qualityMetrics.score >= 80 
                ? "border-l-emerald-500" 
                : qualityMetrics.score >= 50 
                ? "border-l-amber-500" 
                : "border-l-red-500",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              qualityMetrics.score >= 80 
                ? "focus-visible:ring-emerald-500" 
                : qualityMetrics.score >= 50 
                ? "focus-visible:ring-amber-500" 
                : "focus-visible:ring-red-500",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Data Quality
            </div>
            <div className={cn('text-[32px] font-bold font-mono leading-none mb-1', getScoreTextColor(qualityMetrics.score))}>
              {qualityMetrics.score}%
            </div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400">Completeness score</div>
            {/* Progress bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-700" aria-hidden="true">
              <div
                className={cn('h-full transition-all duration-500', getScoreColor(qualityMetrics.score))}
                style={{ width: `${qualityMetrics.score}%` }}
              />
            </div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* MISSING DATA BY DEPARTMENT TABLE - A11Y labels */}
      <section aria-labelledby="missing-data-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="missing-data-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Missing Data by Department
          </h2>
          {/* DQ-2: Export Button with loading state */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleExportReport}
            disabled={isExporting}
            aria-busy={isExporting}
            aria-label={isExporting ? 'Exporting report...' : 'Export data quality report as CSV'}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="w-4 h-4" aria-hidden="true" />
            )}
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Department
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Complete
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Missing
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Quality
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {departmentQuality.map(dept => (
                <tr key={dept.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">{dept.name}</td>
                  <td className="px-5 py-4 text-center text-slate-600 dark:text-slate-400 font-mono font-medium">{dept.totalResources}</td>
                  <td className="px-5 py-4 text-center text-slate-600 dark:text-slate-400 font-mono font-medium">{dept.withCTC}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn(
                      'font-mono font-semibold',
                      dept.missingCTC > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                    )}>
                      {dept.missingCTC}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getBadgeClass(dept.coverage))}>
                      {dept.coverage}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {dept.missingCTC > 0 ? (
                      <button
                        onClick={() => handleFixAllDept(dept)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors hover:underline"
                      >
                        Fix {dept.missingCTC}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="w-4 h-4" />
                        Complete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800/70 border-t-2 border-slate-200 dark:border-slate-600">
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">TOTAL</td>
                <td className="px-5 py-4 text-center font-bold font-mono text-slate-900 dark:text-slate-100">{totals.total}</td>
                <td className="px-5 py-4 text-center font-bold font-mono text-slate-900 dark:text-slate-100">{totals.complete}</td>
                <td className="px-5 py-4 text-center font-bold font-mono text-red-600 dark:text-red-400">{totals.missing}</td>
                <td className="px-5 py-4 text-center">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getBadgeClass(qualityMetrics.score))}>
                    {qualityMetrics.score}%
                  </span>
                </td>
                <td className="px-5 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* EXPANDABLE RESOURCE LISTS - FIX #1: Per-resource Edit buttons */}
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
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => toggleExpand(dept.name)}
              >
                {expandedDepts.has(dept.name) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">
                  {dept.name}
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{dept.missingCTC} missing</span>
                <Button
                  variant="default"
                  size="sm"
                  className="ml-4 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFixAllDept(dept);
                  }}
                >
                  <Users className="w-3.5 h-3.5" />
                  Fix All
                </Button>
              </div>

              {/* Expanded Content */}
              {expandedDepts.has(dept.name) && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          RID
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Name
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Role
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Vendor
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Contract End
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          CTC Status
                        </th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {dept.missingResources.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {r.rid?.padStart(3, '0') || '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.role || '—'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.vendorName || '—'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(r.contractEnd)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-xs">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Missing
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {/* FIX #1: Opens single-resource modal, not full department */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSingleResource(r);
                              }}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5",
                                "text-xs font-medium rounded-md transition-all",
                                "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30",
                                "hover:bg-blue-100 dark:hover:bg-blue-900/50",
                                "border border-blue-200 dark:border-blue-800"
                              )}
                            >
                              <Pencil className="w-3 h-3" />
                              Add CTC
                            </button>
                          </td>
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
                <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">All Data Complete</h3>
              <p className="text-sm text-muted-foreground">
                All resources have compensation data entered
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Fix All CTC Modal (Bulk) */}
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
          onSaved={handleBulkSaved}
        />
      )}

      {/* Single Resource Edit Modal */}
      {singleEditResource && (
        <SingleResourceEditModal
          open={singleEditModalOpen}
          onOpenChange={setSingleEditModalOpen}
          resource={{
            id: singleEditResource.id,
            rid: singleEditResource.rid,
            name: singleEditResource.name,
            role: singleEditResource.role,
            vendorName: singleEditResource.vendorName,
            contractEnd: singleEditResource.contractEnd,
            ctc: singleEditResource.ctc,
          }}
          onSaved={handleSingleEditSaved}
        />
      )}

      {/* Detail Modals */}
      <TotalResourcesModal
        isOpen={showTotalModal}
        onClose={() => setShowTotalModal(false)}
        resources={data.resources}
      />

      <CompleteRecordsModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        resources={data.resources}
      />

      <MissingCTCModal
        isOpen={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        resources={data.resources}
        onFixAll={handleFixAllFromModal}
      />

      <DataQualityBreakdownModal
        isOpen={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        deptStats={deptStats}
      />
    </div>
  );
}
