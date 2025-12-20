/**
 * Incident Insights Page
 * McKinsey-style Executive Operational Report
 * Boardroom-ready, print-optimized
 */

import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { 
  Printer, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, 
  Clock, ArrowRight, FileText, ChevronUp, ChevronDown, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { IncidentCommandBar } from '@/components/incidents/IncidentCommandBar';
import { CreateIncidentModal, IncidentFormData } from '@/components/incidents/CreateIncidentModal';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import { useIncidentInsights } from '../hooks/useIncidentInsights';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import { useCreateIncident } from '@/hooks/useIncidents';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import catalystLogo from '@/assets/catalyst-logo.png';
import { toast } from 'sonner';
import type { InsightPeriod, DrilldownFilter, IncidentWithSLA, ConversionMetrics, PeriodMetrics, PeriodComparison } from '../types';

const PERIOD_TABS: { value: InsightPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week (WTD)' },
  { value: 'last_week', label: 'Last Week' },
];

// ============================================================================
// DELTA INDICATORS
// ============================================================================

function DeltaIndicator({ 
  delta, 
  inverted = false, 
  showLabel = false,
  size = 'sm' 
}: { 
  delta: number; 
  inverted?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'lg';
}) {
  if (delta === 0) {
    return (
      <span className={cn(
        "inline-flex items-center text-muted-foreground",
        size === 'lg' ? "text-base" : "text-sm"
      )}>
        <Minus className={cn(size === 'lg' ? "h-4 w-4" : "h-3.5 w-3.5", "mr-1")} />
        {showLabel ? 'No change' : '0'}
      </span>
    );
  }
  
  const isPositive = inverted ? delta < 0 : delta > 0;
  const isNegative = inverted ? delta > 0 : delta < 0;
  
  return (
    <span className={cn(
      "inline-flex items-center font-medium",
      size === 'lg' ? "text-base" : "text-sm",
      isPositive && "text-[hsl(var(--warning))]",
      isNegative && "text-emerald-600 dark:text-emerald-400"
    )}>
      {delta > 0 ? (
        <TrendingUp className={cn(size === 'lg' ? "h-4 w-4" : "h-3.5 w-3.5", "mr-1")} />
      ) : (
        <TrendingDown className={cn(size === 'lg' ? "h-4 w-4" : "h-3.5 w-3.5", "mr-1")} />
      )}
      {delta > 0 ? '+' : ''}{delta}
      {showLabel && (delta > 0 ? ' increase' : ' decrease')}
    </span>
  );
}

// ============================================================================
// SECTION 1: EXECUTIVE POSTURE (HERO BLOCK)
// ============================================================================

interface ExecutivePostureProps {
  summary: string;
  generatedAt: Date;
  metrics: PeriodMetrics;
  deltas: PeriodComparison;
  comparisonLabel: string;
  periodLabel: string;
  onMetricClick: (type: DrilldownFilter['type'], label: string) => void;
}

function ExecutivePosture({ 
  summary, 
  generatedAt, 
  metrics, 
  deltas, 
  comparisonLabel,
  periodLabel,
  onMetricClick 
}: ExecutivePostureProps) {
  const deltaMetrics = [
    { key: 'backlog', label: 'Backlog', value: deltas.backlog_delta, prefix: deltas.backlog_delta > 0 ? '+' : '' },
    { key: 'breached', label: 'Breached', value: deltas.sla_breached, prefix: deltas.sla_breached > 0 ? '+' : '' },
    { key: 'at_risk', label: 'At Risk', value: deltas.sla_at_risk, prefix: deltas.sla_at_risk > 0 ? '+' : '' },
    { key: 'major', label: 'Major', value: deltas.major_active, prefix: deltas.major_active > 0 ? '+' : '' },
  ];

  return (
    <section className="mb-10 print:mb-8">
      <div className="border-l-4 border-[var(--brand-primary)] bg-card rounded-r-lg p-8 print:p-6">
        <div className="flex items-start justify-between gap-8">
          {/* Left: Executive Summary Text */}
          <div className="flex-1 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-[var(--brand-primary)]" />
              <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
                Executive Posture
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-foreground mb-6 print:text-base">
              {summary}
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Generated {format(generatedAt, 'MMM d, yyyy HH:mm')}
              </span>
              <span className="text-muted-foreground/50">|</span>
              <span>Period: {periodLabel}</span>
            </div>
          </div>
          
          {/* Right: Change vs Period Mini-Metrics */}
          <div className="flex-shrink-0 min-w-[200px] border-l border-border pl-8 print:pl-6">
            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Δ vs {comparisonLabel}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {deltaMetrics.map(metric => (
                <div key={metric.key} className="text-center">
                  <div className={cn(
                    "text-2xl font-bold tabular-nums",
                    metric.value > 0 && "text-[hsl(var(--warning))]",
                    metric.value < 0 && "text-emerald-600 dark:text-emerald-400",
                    metric.value === 0 && "text-muted-foreground"
                  )}>
                    {metric.prefix}{metric.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 2: KPI SCOREBOARD
// ============================================================================

interface KPIScoreboardProps {
  metrics: PeriodMetrics;
  deltas: PeriodComparison;
  onMetricClick: (type: DrilldownFilter['type'], label: string) => void;
}

function KPIScoreboard({ metrics, deltas, onMetricClick }: KPIScoreboardProps) {
  const kpis = [
    { key: 'created', label: 'Created', value: metrics.created, delta: deltas.created, type: 'created' as const },
    { key: 'resolved', label: 'Resolved', value: metrics.resolved, delta: deltas.resolved, type: 'resolved' as const, invertDelta: true },
    { key: 'backlog', label: 'Backlog Δ', value: metrics.backlog_delta, delta: deltas.backlog_delta, type: 'open' as const },
    { key: 'breached', label: 'SLA Breached', value: metrics.sla_breached, delta: deltas.sla_breached, type: 'sla_breached' as const, isUrgent: true },
    { key: 'at_risk', label: 'SLA At Risk', value: metrics.sla_at_risk, delta: deltas.sla_at_risk, type: 'sla_at_risk' as const, isWarning: true },
    { key: 'major', label: 'Major Active', value: metrics.major_active, delta: deltas.major_active, type: 'major_active' as const, isUrgent: true },
  ];

  return (
    <section className="mb-10 print:mb-8">
      <h2 className="text-base font-bold uppercase tracking-wider text-foreground mb-5 flex items-center gap-2">
        <span className="w-1 h-5 bg-[var(--brand-primary)] rounded-full" />
        KPI Scoreboard
      </h2>
      <div className="grid grid-cols-6 gap-4 print:gap-3">
        {kpis.map(kpi => (
          <button
            key={kpi.key}
            onClick={() => onMetricClick(kpi.type, kpi.label)}
            className={cn(
              "p-6 rounded-lg border text-left transition-all cursor-pointer print:p-4",
              "hover:shadow-lg hover:border-[var(--brand-primary)] hover:-translate-y-1",
              "bg-card border-border"
            )}
          >
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {kpi.label}
            </div>
            <div className={cn(
              "text-4xl font-bold tabular-nums leading-none mb-3 print:text-3xl",
              kpi.isUrgent && kpi.value > 0 && "text-destructive",
              kpi.isWarning && kpi.value > 0 && "text-[hsl(var(--warning))]",
              !kpi.isUrgent && !kpi.isWarning && "text-foreground"
            )}>
              {kpi.value}
            </div>
            <DeltaIndicator delta={kpi.delta} inverted={kpi.invertDelta} />
          </button>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 3: FACTS & RISKS (SIDE-BY-SIDE)
// ============================================================================

interface FactsAndRisksProps {
  keyFacts: string[];
  operationalRisks: string[];
}

function FactsAndRisks({ keyFacts, operationalRisks }: FactsAndRisksProps) {
  // Derive operational risks from key facts if not provided separately
  const risks = operationalRisks.length > 0 ? operationalRisks : keyFacts.filter(f => 
    f.toLowerCase().includes('breach') || 
    f.toLowerCase().includes('risk') || 
    f.toLowerCase().includes('unassign') ||
    f.toLowerCase().includes('escalat') ||
    f.toLowerCase().includes('major')
  );

  const facts = keyFacts.filter(f => !risks.includes(f)).slice(0, 5);

  return (
    <section className="mb-10 print:mb-8">
      <div className="grid grid-cols-2 gap-6 print:gap-4">
        {/* KEY FACTS */}
        <div className="border border-border rounded-lg bg-card p-6 print:p-4">
          <h3 className="text-base font-bold uppercase tracking-wider text-foreground mb-5 flex items-center gap-2">
            <span className="w-1 h-5 bg-[var(--brand-primary)] rounded-full" />
            Key Facts
          </h3>
          <div className="space-y-4">
            {facts.length > 0 ? facts.map((fact, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <p className="text-base text-foreground leading-relaxed print:text-sm">
                  {fact}
                </p>
              </div>
            )) : (
              <p className="text-base text-muted-foreground italic">No significant facts to report.</p>
            )}
          </div>
        </div>

        {/* OPERATIONAL RISKS */}
        <div className="border border-destructive/30 rounded-lg bg-destructive/5 p-6 print:p-4">
          <h3 className="text-base font-bold uppercase tracking-wider text-destructive mb-5 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Operational Risks
          </h3>
          <div className="space-y-4">
            {risks.length > 0 ? risks.slice(0, 5).map((risk, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold text-destructive">
                  !
                </span>
                <p className="text-base text-foreground leading-relaxed print:text-sm">
                  {risk}
                </p>
              </div>
            )) : (
              <p className="text-base text-muted-foreground italic">No operational risks identified.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 4: REQUIRED ACTIONS (TABLE)
// ============================================================================

interface RequiredActionsTableProps {
  actions: string[];
  metrics: PeriodMetrics;
  onActionClick: (action: string) => void;
}

function RequiredActionsTable({ actions, metrics, onActionClick }: RequiredActionsTableProps) {
  // Map actions to structured format with trigger metrics
  const structuredActions = actions.slice(0, 6).map((action, idx) => {
    let triggerMetric = '—';
    let relatedCount = 0;
    let filterType: DrilldownFilter['type'] = 'open';

    if (action.toLowerCase().includes('breach')) {
      triggerMetric = `${metrics.sla_breached} breached`;
      relatedCount = metrics.sla_breached;
      filterType = 'sla_breached';
    } else if (action.toLowerCase().includes('risk') || action.toLowerCase().includes('at-risk')) {
      triggerMetric = `${metrics.sla_at_risk} at risk`;
      relatedCount = metrics.sla_at_risk;
      filterType = 'sla_at_risk';
    } else if (action.toLowerCase().includes('major')) {
      triggerMetric = `${metrics.major_active} major`;
      relatedCount = metrics.major_active;
      filterType = 'major_active';
    } else if (action.toLowerCase().includes('assign')) {
      triggerMetric = 'Unassigned backlog';
      relatedCount = metrics.backlog_delta > 0 ? metrics.backlog_delta : 0;
      filterType = 'open';
    } else if (action.toLowerCase().includes('committee')) {
      triggerMetric = 'Committee queue';
      filterType = 'committee';
    }

    return {
      priority: idx + 1,
      action,
      triggerMetric,
      relatedCount,
      filterType,
    };
  });

  return (
    <section className="mb-10 print:mb-8">
      <h2 className="text-base font-bold uppercase tracking-wider text-destructive mb-5 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Required Actions
      </h2>
      
      {structuredActions.length === 0 ? (
        <div className="border border-border rounded-lg bg-card p-10 text-center">
          <p className="text-base text-muted-foreground">No immediate actions required.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border w-[80px]">
                  Priority
                </th>
                <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Action
                </th>
                <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border w-[180px]">
                  Trigger Metric
                </th>
                <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border w-[140px]">
                  Related Incidents
                </th>
              </tr>
            </thead>
            <tbody>
              {structuredActions.map((item) => (
                <tr 
                  key={item.priority}
                  onClick={() => onActionClick(item.action)}
                  className="hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0"
                >
                  <td className="px-5 py-4 align-middle">
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                      item.priority === 1 && "bg-destructive text-destructive-foreground",
                      item.priority === 2 && "bg-[hsl(var(--warning))] text-white",
                      item.priority > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className="text-base font-medium text-foreground print:text-sm">
                      {item.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className="text-sm text-muted-foreground">
                      {item.triggerMetric}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {item.relatedCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:underline">
                        {item.relatedCount} incidents
                        <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// SECTION 6: WHAT CHANGED VS LAST PERIOD
// ============================================================================

interface WhatChangedProps {
  deltas: PeriodComparison;
  comparisonLabel: string;
  metrics: PeriodMetrics;
}

function WhatChangedSection({ deltas, comparisonLabel, metrics }: WhatChangedProps) {
  const increases: { label: string; delta: number; current: number }[] = [];
  const decreases: { label: string; delta: number; current: number }[] = [];
  const emerging: string[] = [];

  // Categorize changes
  if (deltas.created > 0) increases.push({ label: 'Incidents Created', delta: deltas.created, current: metrics.created });
  if (deltas.created < 0) decreases.push({ label: 'Incidents Created', delta: deltas.created, current: metrics.created });
  
  if (deltas.sla_breached > 0) increases.push({ label: 'SLA Breached', delta: deltas.sla_breached, current: metrics.sla_breached });
  if (deltas.sla_breached < 0) decreases.push({ label: 'SLA Breached', delta: deltas.sla_breached, current: metrics.sla_breached });
  
  if (deltas.sla_at_risk > 0) increases.push({ label: 'SLA At Risk', delta: deltas.sla_at_risk, current: metrics.sla_at_risk });
  if (deltas.sla_at_risk < 0) decreases.push({ label: 'SLA At Risk', delta: deltas.sla_at_risk, current: metrics.sla_at_risk });
  
  if (deltas.major_active > 0) increases.push({ label: 'Major Incidents', delta: deltas.major_active, current: metrics.major_active });
  if (deltas.major_active < 0) decreases.push({ label: 'Major Incidents', delta: deltas.major_active, current: metrics.major_active });
  
  if (deltas.resolved > 0) increases.push({ label: 'Resolved', delta: deltas.resolved, current: metrics.resolved });
  if (deltas.resolved < 0) decreases.push({ label: 'Resolved', delta: deltas.resolved, current: metrics.resolved });
  
  if (deltas.backlog_delta > 0) increases.push({ label: 'Backlog Growth', delta: deltas.backlog_delta, current: metrics.backlog_delta });
  if (deltas.backlog_delta < 0) decreases.push({ label: 'Backlog Growth', delta: deltas.backlog_delta, current: metrics.backlog_delta });

  // Emerging risks
  if (metrics.sla_breached > 0 && deltas.sla_breached > 0) {
    emerging.push(`SLA breach rate increasing (+${deltas.sla_breached})`);
  }
  if (metrics.major_active > 0 && deltas.major_active > 0) {
    emerging.push(`Major incident count rising (+${deltas.major_active})`);
  }
  if (metrics.backlog_delta > 5) {
    emerging.push(`Backlog accumulation exceeding resolution capacity`);
  }

  const hasChanges = increases.length > 0 || decreases.length > 0 || emerging.length > 0;

  return (
    <section className="mb-10 print:mb-8">
      <h2 className="text-base font-bold uppercase tracking-wider text-foreground mb-5 flex items-center gap-2">
        <span className="w-1 h-5 bg-[var(--brand-primary)] rounded-full" />
        What Changed vs {comparisonLabel}
      </h2>

      {!hasChanges ? (
        <div className="border border-border rounded-lg bg-card p-10 text-center">
          <p className="text-base text-muted-foreground">No significant changes from the comparison period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 print:gap-4">
          {/* Increases */}
          <div className="border border-[hsl(var(--warning))]/30 rounded-lg bg-[hsl(var(--warning))]/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-[hsl(var(--warning))]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--warning))]">
                Increases
              </h3>
            </div>
            {increases.length > 0 ? (
              <div className="space-y-3">
                {increases.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-sm font-bold text-[hsl(var(--warning))] tabular-nums">
                      +{item.delta}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No increases</p>
            )}
          </div>

          {/* Decreases */}
          <div className="border border-emerald-500/30 rounded-lg bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Decreases
              </h3>
            </div>
            {decreases.length > 0 ? (
              <div className="space-y-3">
                {decreases.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {item.delta}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No decreases</p>
            )}
          </div>

          {/* Emerging Risks */}
          <div className="border border-destructive/30 rounded-lg bg-destructive/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-destructive">
                Emerging Risks
              </h3>
            </div>
            {emerging.length > 0 ? (
              <div className="space-y-3">
                {emerging.map((risk, idx) => (
                  <p key={idx} className="text-sm text-foreground">
                    {risk}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No new risks identified</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// TOP RISK INCIDENTS TABLE
// ============================================================================

interface TopRiskIncidentsProps {
  incidents: IncidentWithSLA[];
  onRowClick: (id: string) => void;
}

const SLA_STATE_CONFIG: Record<string, { label: string; className: string }> = {
  on_track: { label: 'On Track', className: 'text-foreground' },
  at_risk: { label: 'At Risk', className: 'text-[hsl(var(--warning))] font-semibold' },
  breached: { label: 'Breached', className: 'text-destructive font-semibold' },
  n_a: { label: 'N/A', className: 'text-muted-foreground' },
  met: { label: 'Met', className: 'text-foreground' },
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  triage: 'Triage',
  in_progress: 'In Progress',
  to_committee: 'Committee',
  resolved: 'Resolved',
  closed: 'Closed',
};

function formatAge(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function TopRiskIncidents({ incidents, onRowClick }: TopRiskIncidentsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = incidents.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedIncidents = incidents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  if (incidents.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 print:mb-8">
      <h2 className="text-base font-bold uppercase tracking-wider text-foreground mb-5 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        Top Risk Incidents
      </h2>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead className="bg-muted/50">
            <tr>
              <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                ID
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                Summary
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                Severity
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                Status
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                Age
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                SLA State
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedIncidents.map((incident) => {
              const slaConfig = SLA_STATE_CONFIG[incident.sla_state.state] || SLA_STATE_CONFIG.n_a;

              return (
                <tr
                  key={incident.id}
                  onClick={() => onRowClick(incident.id)}
                  className="hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0"
                >
                  <td className="px-5 py-4 align-middle">
                    <span className="font-mono text-sm font-medium text-[var(--brand-primary)]">
                      {incident.incident_key}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className="text-sm text-foreground line-clamp-1">
                      {incident.title}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className={cn(
                      "text-sm font-bold",
                      incident.severity === 'SEV1' && "text-destructive",
                      incident.severity === 'SEV2' && "text-[hsl(var(--warning))]"
                    )}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className="text-sm text-foreground">
                      {STATUS_LABELS[incident.status] || incident.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className="text-sm font-mono tabular-nums text-muted-foreground">
                      {formatAge(incident.age_hours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className={cn("text-sm", slaConfig.className)}>
                      {slaConfig.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {incident.assignee_name ? (
                      <span className="text-sm text-foreground truncate block max-w-[140px]">
                        {incident.assignee_name}
                      </span>
                    ) : (
                      <span className="text-sm text-destructive/80 italic">
                        Unassigned
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalItems > 10 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/30 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-9 px-3 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="text-sm text-muted-foreground tabular-nums">
              {startIndex + 1}–{endIndex} of {totalItems}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="h-9 w-9 p-0"
              >
                <span className="sr-only">First page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-9 w-9 p-0"
              >
                <span className="sr-only">Previous page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <span className="px-3 text-sm text-foreground tabular-nums">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-9 w-9 p-0"
              >
                <span className="sr-only">Next page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="h-9 w-9 p-0"
              >
                <span className="sr-only">Last page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// INSIGHT TAB CONTENT
// ============================================================================

interface InsightTabContentProps {
  period: InsightPeriod;
  onDrilldown: (filter: DrilldownFilter, incidents: IncidentWithSLA[]) => void;
  onRowClick: (id: string) => void;
}

function InsightTabContent({ period, onDrilldown, onRowClick }: InsightTabContentProps) {
  const {
    periodRange,
    currentMetrics,
    deltas,
    snapshot,
    breakdowns,
    majorIncidents,
    getFilteredIncidents,
    conversionMetrics,
    isLoading,
  } = usePeriodAnalytics(period);

  const insights = useIncidentInsights(
    snapshot,
    breakdowns,
    majorIncidents,
    periodRange.label
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleMetricClick = (type: DrilldownFilter['type'], label: string) => {
    const incidents = getFilteredIncidents(type);
    onDrilldown({ type, label }, incidents);
  };

  const handleActionClick = (action: string) => {
    if (action.toLowerCase().includes('breach')) {
      handleMetricClick('sla_breached', 'SLA Breached');
    } else if (action.toLowerCase().includes('risk')) {
      handleMetricClick('sla_at_risk', 'SLA At Risk');
    } else if (action.toLowerCase().includes('major')) {
      handleMetricClick('major_active', 'Major Active');
    } else if (action.toLowerCase().includes('committee')) {
      handleMetricClick('committee', 'Committee');
    } else {
      handleMetricClick('open', 'Open Incidents');
    }
  };

  // Derive operational risks from insights
  const operationalRisks = insights.keyFacts.filter(f => 
    f.toLowerCase().includes('breach') || 
    f.toLowerCase().includes('risk') || 
    f.toLowerCase().includes('unassign') ||
    f.toLowerCase().includes('escalat') ||
    f.toLowerCase().includes('major') ||
    f.toLowerCase().includes('critical')
  );

  return (
    <div>
      <ExecutivePosture
        summary={insights.executiveSummary}
        generatedAt={insights.generatedAt}
        metrics={currentMetrics}
        deltas={deltas}
        comparisonLabel={periodRange.comparisonLabel}
        periodLabel={periodRange.label}
        onMetricClick={handleMetricClick}
      />

      <KPIScoreboard
        metrics={currentMetrics}
        deltas={deltas}
        onMetricClick={handleMetricClick}
      />

      <FactsAndRisks
        keyFacts={insights.keyFacts}
        operationalRisks={operationalRisks}
      />

      <RequiredActionsTable
        actions={insights.requiredActions}
        metrics={currentMetrics}
        onActionClick={handleActionClick}
      />

      <WhatChangedSection
        deltas={deltas}
        comparisonLabel={periodRange.comparisonLabel}
        metrics={currentMetrics}
      />

      <TopRiskIncidents
        incidents={majorIncidents}
        onRowClick={onRowClick}
      />
    </div>
  );
}

// ============================================================================

// ============================================================================
// PRINT HEADER COMPONENT
// ============================================================================

interface PrintHeaderProps {
  periodLabel: string;
}

function PrintHeader({ periodLabel }: PrintHeaderProps) {
  const currentDate = format(new Date(), 'MMMM d, yyyy • HH:mm');
  
  return (
    <div className="hidden print:block mb-8 pb-6 border-b-2 border-[var(--brand-primary)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={catalystLogo} 
            alt="Catalyst" 
            className="h-10 w-auto"
          />
          <div className="h-10 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Incident Insights Report
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Executive Operational Report
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">
            Period: {periodLabel}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Generated: {currentDate}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRINT STYLES
// ============================================================================

const printStyles = `
@media print {
  /* Force color printing */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  body {
    background: white !important;
    font-size: 11pt !important;
  }
  
  /* Hide non-print elements */
  .print\\:hidden,
  nav, 
  aside, 
  [data-sidebar], 
  [role="navigation"],
  header:not(.print-header),
  .no-print {
    display: none !important;
  }
  
  /* Show print-only elements */
  .hidden.print\\:block {
    display: block !important;
  }
  
  /* Reset main container */
  main, .main-content {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
  }
  
  /* Remove max-width constraints */
  [class*="max-w-"] {
    max-width: 100% !important;
  }
  
  /* Optimize spacing for print */
  .print\\:mb-8 {
    margin-bottom: 1.5rem !important;
  }
  
  .print\\:p-4 {
    padding: 0.75rem !important;
  }
  
  .print\\:p-6 {
    padding: 1rem !important;
  }
  
  /* Typography adjustments */
  .print\\:text-sm {
    font-size: 10pt !important;
  }
  
  .print\\:text-base {
    font-size: 11pt !important;
  }
  
  .print\\:text-3xl {
    font-size: 20pt !important;
  }
  
  /* Gap adjustments */
  .print\\:gap-3 {
    gap: 0.5rem !important;
  }
  
  .print\\:gap-4 {
    gap: 0.75rem !important;
  }
  
  .print\\:gap-6 {
    gap: 1rem !important;
  }
  
  /* KPI Grid - optimize for landscape */
  .grid-cols-6 {
    grid-template-columns: repeat(6, 1fr) !important;
  }
  
  .grid-cols-6 > * {
    padding: 1rem !important;
  }
  
  .grid-cols-6 .text-4xl {
    font-size: 24pt !important;
  }
  
  /* Two-column sections */
  .grid-cols-2 {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 1rem !important;
  }
  
  /* Tables */
  table {
    width: 100% !important;
    font-size: 10pt !important;
  }
  
  th, td {
    padding: 0.5rem 0.75rem !important;
  }
  
  /* Cards and borders */
  .border {
    border-width: 1px !important;
  }
  
  .rounded-lg {
    border-radius: 6px !important;
  }
  
  /* Section headers */
  section h2 {
    font-size: 12pt !important;
    margin-bottom: 0.75rem !important;
  }
  
  /* Tabs - hide them in print, show active content */
  [role="tablist"] {
    display: none !important;
  }
  
  /* Page settings */
  @page {
    margin: 1cm 1.5cm;
    size: A4 landscape;
  }
  
  @page :first {
    margin-top: 1cm;
  }
  
  /* Avoid page breaks inside important elements */
  section, 
  .border, 
  table,
  tr {
    page-break-inside: avoid !important;
  }
  
  /* Force page breaks where needed */
  .page-break-before {
    page-break-before: always !important;
  }
  
  /* Print footer */
  .print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8pt;
    color: #666;
    padding: 0.5rem;
    border-top: 1px solid #ddd;
  }
}
`;

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function IncidentInsightsPage() {
  const navigate = useNavigate();
  const [activePeriod, setActivePeriod] = useState<InsightPeriod>('today');
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter | null>(null);
  const [filteredIncidents, setFilteredIncidents] = useState<IncidentWithSLA[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { data: selectedIncident } = useIncidentDetail(selectedIncidentId);
  const createIncident = useCreateIncident();

  const handleDrilldown = (filter: DrilldownFilter, incidentList: IncidentWithSLA[]) => {
    setActiveFilter(filter);
    setFilteredIncidents(incidentList);
  };

  const handleCloseDrilldown = () => {
    setActiveFilter(null);
    setFilteredIncidents([]);
  };

  const handleRowClick = (id: string) => {
    setSelectedIncidentId(id);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCreateIncident = async (formData: IncidentFormData) => {
    try {
      const result = await createIncident.mutateAsync({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        impact: formData.impact,
        urgency: formData.urgency,
        support_level: formData.support_level,
        project_id: formData.project_id,
        release_version_id: formData.release_version_id,
        is_major_incident: formData.is_major_incident,
        incident_type: formData.incident_type,
        reporter_id: formData.reporterId,
        reporter_name: formData.reporterName,
        assignee_id: formData.assigneeId,
        target_date: formData.target_resolution_date,
      });
      
      toast.success('Incident created successfully');
      setCreateDialogOpen(false);
      
      if (result?.id) {
        navigate(`/release/incidents/${result.id}?created=true`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create incident');
    }
  };

  return (
    <>
      <style>{printStyles}</style>
      <div className="h-full flex flex-col bg-background">
        {/* Print Header - only visible when printing */}
        <div className="px-6 pt-6">
          <PrintHeader periodLabel={PERIOD_TABS.find(t => t.value === activePeriod)?.label || 'Today'} />
        </div>
        
        {/* Screen Header - hidden when printing */}
        <div className="print:hidden">
          <GlobalPageHeader
            sectionLabel="RELEASE"
            pageTitle="Incident Insights"
            showDivider={false}
          />

          {/* Standardized Command Bar */}
          <IncidentCommandBar
            onCreateClick={() => setCreateDialogOpen(true)}
            additionalActions={
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint} 
                className="h-9 px-4 text-sm font-medium"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
            }
          />

          {/* Subtitle */}
          <div className="px-6 pt-2 pb-4 border-b border-border">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
              Executive Operational Report
            </p>
          </div>
        </div>

        {/* Content with Tabs */}
        <div className="flex-1 overflow-auto print:overflow-visible">
          <div className="px-6 py-8 print:py-4 max-w-[1800px] print:max-w-none">
            <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as InsightPeriod)}>
              <TabsList className="mb-10 p-1.5 bg-muted/40 border border-border h-12">
                {PERIOD_TABS.map(tab => (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value} 
                    className="px-8 py-2.5 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PERIOD_TABS.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-0">
                  <InsightTabContent 
                    period={tab.value} 
                    onDrilldown={handleDrilldown}
                    onRowClick={handleRowClick}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        {/* Drilldown Drawer */}
        <DrilldownDrawer
          isOpen={!!activeFilter}
          filter={activeFilter}
          incidents={filteredIncidents}
          timeRange="7d"
          onClose={handleCloseDrilldown}
          onClear={handleCloseDrilldown}
          onRowClick={handleRowClick}
        />

        {/* Incident Detail Modal */}
        {selectedIncident && (
          <IncidentDetailModal
            incident={selectedIncident}
            isOpen={!!selectedIncidentId}
            onClose={() => setSelectedIncidentId(null)}
          />
        )}

        {/* Create Incident Modal */}
        <CreateIncidentModal
          isOpen={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateIncident}
        />
      </div>
    </>
  );
}
