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

import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { ChevronRight, ChevronDown, Calendar, Download, AlertTriangle, Check, Users, Pencil, AlertCircle, Loader2 } from '@/lib/atlaskit-icons';
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
import { catalystToast } from '@/lib/catalystToast';
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

  const getScoreColor = (score: number): CSSProperties => {
    if (score >= 80) return { backgroundColor: 'var(--ds-background-success-bold)' };
    if (score >= 50) return { backgroundColor: 'var(--ds-background-warning-bold)' };
    return { backgroundColor: 'var(--ds-background-danger-bold)' };
  };

  const getScoreTextStyle = (score: number): CSSProperties => {
    if (score >= 80) return { color: 'var(--ds-text-success)' };
    if (score >= 50) return { color: 'var(--ds-text-warning)' };
    return { color: 'var(--ds-text-danger)' };
  };

  const getBadgeStyle = (coverage: number): CSSProperties => {
    if (coverage >= 80) return { backgroundColor: 'var(--ds-background-success)', color: 'var(--ds-text-success)' };
    if (coverage >= 50) return { backgroundColor: 'var(--ds-background-warning)', color: 'var(--ds-text-warning)' };
    return { backgroundColor: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)' };
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
      catalystToast.success('Report exported successfully!');
    } catch (error) {
      catalystToast.error('Failed to export report');
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
          className="flex items-center gap-3 px-4 py-2.5 border border-border rounded-xl"
          style={{ backgroundColor: 'var(--ds-surface-sunken)' }}
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
            style={{ borderLeftColor: 'var(--ds-border-bold)' }}
            className={cn(
              "relative bg-card border border-border rounded-xl p-5 text-left",
              "border-l-4",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Total Resources
            </div>
            <div className="text-[32px] font-bold text-foreground font-mono leading-none mb-1">
              {qualityMetrics.total}
            </div>
            <div className="text-[13px] text-muted-foreground">In resource inventory</div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </button>

          {/* Complete Records - CLICKABLE with A11Y */}
          <button 
            type="button"
            onClick={() => setShowCompleteModal(true)}
            aria-label={`Complete Records: ${qualityMetrics.complete}. Click to view details.`}
            style={{ borderLeftColor: 'var(--ds-border-information)' }}
            className={cn(
              "relative bg-card border border-border rounded-xl p-5 text-left",
              "border-l-4",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Complete Records
            </div>
            <div className="text-[32px] font-bold font-mono leading-none mb-1" style={{ color: 'var(--ds-text-information)' }}>
              {qualityMetrics.complete}
            </div>
            <div className="text-[13px] text-muted-foreground">With CTC data</div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </button>

          {/* Missing CTC - CLICKABLE with A11Y */}
          <button 
            type="button"
            onClick={() => setShowMissingModal(true)}
            aria-label={`Missing CTC: ${qualityMetrics.missing}. Click to view details.`}
            style={{ borderLeftColor: 'var(--ds-border-warning)' }}
            className={cn(
              "relative bg-card border border-border rounded-xl p-5 text-left",
              "border-l-4",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Missing CTC
            </div>
            <div className="text-[32px] font-bold font-mono leading-none mb-1" style={{ color: 'var(--ds-text-warning)' }}>
              {qualityMetrics.missing}
            </div>
            <div className="text-[13px] text-muted-foreground">Need compensation data</div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </button>

          {/* Quality Score - CLICKABLE with A11Y */}
          <button 
            type="button"
            onClick={() => setShowQualityModal(true)}
            aria-label={`Data Quality: ${qualityMetrics.score}% completeness score. Click to view breakdown.`}
            style={{
              borderLeftColor: qualityMetrics.score >= 80
                ? 'var(--ds-border-success)'
                : qualityMetrics.score >= 50
                ? 'var(--ds-border-warning)'
                : 'var(--ds-border-danger)',
            }}
            className={cn(
              "relative bg-card border border-border rounded-xl p-5 overflow-hidden text-left",
              "border-l-4",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "group"
            )}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Data Quality
            </div>
            <div className="text-[32px] font-bold font-mono leading-none mb-1" style={getScoreTextStyle(qualityMetrics.score)}>
              {qualityMetrics.score}%
            </div>
            <div className="text-[13px] text-muted-foreground">Completeness score</div>
            {/* Progress bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: 'var(--ds-background-neutral)' }} aria-hidden="true">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${qualityMetrics.score}%`, ...getScoreColor(qualityMetrics.score) }}
              />
            </div>
            <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
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
              <tr className="border-b border-border" style={{ backgroundColor: 'var(--ds-surface-sunken)' }}>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Department
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Complete
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Missing
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quality
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departmentQuality.map(dept => (
                <tr key={dept.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-semibold text-foreground">{dept.name}</td>
                  <td className="px-5 py-4 text-center text-muted-foreground font-mono font-medium">{dept.totalResources}</td>
                  <td className="px-5 py-4 text-center text-muted-foreground font-mono font-medium">{dept.withCTC}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className="font-mono font-semibold"
                      style={{ color: dept.missingCTC > 0 ? 'var(--ds-text-danger)' : 'var(--ds-text-subtlest)' }}
                    >
                      {dept.missingCTC}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={getBadgeStyle(dept.coverage)}>
                      {dept.coverage}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {dept.missingCTC > 0 ? (
                      <button
                        onClick={() => handleFixAllDept(dept)}
                        className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
                        style={{ color: 'var(--ds-text-brand)' }}
                      >
                        Fix {dept.missingCTC}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--ds-text-success)' }}>
                        <Check className="w-4 h-4" />
                        Complete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border" style={{ backgroundColor: 'var(--ds-background-neutral)' }}>
                <td className="px-5 py-4 font-bold text-foreground">TOTAL</td>
                <td className="px-5 py-4 text-center font-bold font-mono text-foreground">{totals.total}</td>
                <td className="px-5 py-4 text-center font-bold font-mono text-foreground">{totals.complete}</td>
                <td className="px-5 py-4 text-center font-bold font-mono" style={{ color: 'var(--ds-text-danger)' }}>{totals.missing}</td>
                <td className="px-5 py-4 text-center">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={getBadgeStyle(qualityMetrics.score)}>
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
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
                style={{ backgroundColor: 'var(--ds-surface-sunken)' }}
                onClick={() => toggleExpand(dept.name)}
              >
                {expandedDepts.has(dept.name) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-bold text-foreground flex-1">
                  {dept.name}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--ds-text-warning)' }}>{dept.missingCTC} missing</span>
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
                    <thead style={{ backgroundColor: 'var(--ds-surface-sunken)' }}>
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          RID
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Role
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Vendor
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Contract End
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          CTC Status
                        </th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dept.missingResources.map(r => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {r.rid?.padStart(3, '0') || '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.role || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.vendorName || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(r.contractEnd)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 font-medium text-xs" style={{ color: 'var(--ds-text-warning)' }}>
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all border"
                              style={{
                                color: 'var(--ds-text-brand)',
                                backgroundColor: 'var(--ds-background-information)',
                                borderColor: 'var(--ds-border-information)',
                              }}
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
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--ds-background-success)' }}>
                <Check className="w-6 h-6" style={{ color: 'var(--ds-text-success)' }} />
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
