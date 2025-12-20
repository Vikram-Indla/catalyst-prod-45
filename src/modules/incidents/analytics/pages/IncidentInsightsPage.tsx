/**
 * Incident Insights Page
 * Premium Executive Operational Report for CIOs
 */

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Printer, Loader2, AlertTriangle, Target, TrendingUp, TrendingDown, Minus, Lightbulb, Clock, ArrowRight, FileText, Users, Zap, List, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import { useIncidentInsights } from '../hooks/useIncidentInsights';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { InsightPeriod, DrilldownFilter, IncidentWithSLA, ConversionMetrics, PeriodMetrics, PeriodComparison } from '../types';

const PERIOD_TABS: { value: InsightPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
];

// ============================================================================
// DELTA INDICATORS
// ============================================================================

function DeltaIndicator({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center text-muted-foreground text-sm">
        <Minus className="h-3.5 w-3.5 mr-1" />
        0
      </span>
    );
  }
  
  const isPositive = inverted ? delta < 0 : delta > 0;
  const isNegative = inverted ? delta > 0 : delta < 0;
  
  return (
    <span className={cn(
      "inline-flex items-center text-sm font-medium",
      isPositive && "text-[hsl(var(--warning))]",
      isNegative && "text-muted-foreground"
    )}>
      {delta > 0 ? (
        <TrendingUp className="h-3.5 w-3.5 mr-1" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 mr-1" />
      )}
      {delta > 0 ? '+' : ''}{delta}
    </span>
  );
}

function LatencyDeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    return (
      <span className="inline-flex items-center text-muted-foreground text-sm">
        <Minus className="h-3.5 w-3.5 mr-1" />
        —
      </span>
    );
  }
  
  const isFaster = delta < 0;
  
  return (
    <span className={cn(
      "inline-flex items-center text-sm font-medium",
      isFaster ? "text-muted-foreground" : "text-[hsl(var(--warning))]"
    )}>
      {delta > 0 ? (
        <TrendingUp className="h-3.5 w-3.5 mr-1" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 mr-1" />
      )}
      {delta > 0 ? '+' : ''}{Math.round(delta)}h
    </span>
  );
}

// ============================================================================
// EXECUTIVE SUMMARY HERO
// ============================================================================

interface ExecutiveSummaryHeroProps {
  summary: string;
  generatedAt: Date;
  metrics: PeriodMetrics;
  deltas: PeriodComparison;
  comparisonLabel: string;
  onMetricClick: (type: DrilldownFilter['type'], label: string) => void;
}

function ExecutiveSummaryHero({ 
  summary, 
  generatedAt, 
  metrics, 
  deltas, 
  comparisonLabel,
  onMetricClick 
}: ExecutiveSummaryHeroProps) {
  const deltaMetrics = [
    { key: 'backlog', label: 'Backlog Δ', value: metrics.backlog_delta, delta: deltas.backlog_delta, type: 'open' as const },
    { key: 'breached', label: 'SLA Breached', value: metrics.sla_breached, delta: deltas.sla_breached, type: 'sla_breached' as const, isUrgent: true },
    { key: 'at_risk', label: 'SLA At Risk', value: metrics.sla_at_risk, delta: deltas.sla_at_risk, type: 'sla_at_risk' as const, isWarning: true },
    { key: 'major', label: 'Major Active', value: metrics.major_active, delta: deltas.major_active, type: 'major_active' as const, isUrgent: true },
  ];

  return (
    <section className="border border-border rounded-lg bg-card mb-8">
      <div className="p-6 flex gap-8">
        {/* Left: Executive Summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Operational Posture
            </h2>
          </div>
          <p className="text-base text-foreground leading-relaxed mb-4">
            {summary}
          </p>
          <p className="text-xs text-muted-foreground">
            Generated {format(generatedAt, 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        
        {/* Right: Change vs Baseline */}
        <div className="flex-shrink-0 w-[280px] border-l border-border pl-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Change vs {comparisonLabel}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {deltaMetrics.map(metric => (
              <button
                key={metric.key}
                onClick={() => onMetricClick(metric.type, metric.label)}
                className="text-left p-2 -m-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {metric.label}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-xl font-bold tabular-nums",
                    metric.isUrgent && metric.value > 0 && "text-destructive",
                    metric.isWarning && metric.value > 0 && "text-[hsl(var(--warning))]",
                    !metric.isUrgent && !metric.isWarning && "text-foreground"
                  )}>
                    {metric.value}
                  </span>
                  <DeltaIndicator delta={metric.delta} inverted={metric.key === 'resolved'} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// KPI SCOREBOARD
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
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        KPI Scoreboard
      </h2>
      <div className="grid grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <button
            key={kpi.key}
            onClick={() => onMetricClick(kpi.type, kpi.label)}
            className={cn(
              "p-5 rounded-lg border text-left transition-all cursor-pointer",
              "hover:shadow-md hover:border-[var(--brand-primary)] hover:-translate-y-0.5",
              "bg-card border-border"
            )}
          >
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              {kpi.label}
            </div>
            <div className={cn(
              "text-3xl font-bold tabular-nums leading-none mb-2",
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
// OPERATIONAL NARRATIVE CARDS
// ============================================================================

interface NarrativeCardsProps {
  keyFacts: string[];
  requiredActions: string[];
}

function NarrativeCards({ keyFacts, requiredActions }: NarrativeCardsProps) {
  // Group facts into categories
  const slaFacts = keyFacts.filter(f => f.toLowerCase().includes('sla') || f.toLowerCase().includes('breach') || f.toLowerCase().includes('risk'));
  const flowFacts = keyFacts.filter(f => f.toLowerCase().includes('backlog') || f.toLowerCase().includes('flow') || f.toLowerCase().includes('created') || f.toLowerCase().includes('resolved'));
  const ownershipFacts = keyFacts.filter(f => f.toLowerCase().includes('assign') || f.toLowerCase().includes('escalat') || f.toLowerCase().includes('major') || f.toLowerCase().includes('committee'));

  const narrativeCards = [
    { 
      title: 'SLA & Risk', 
      icon: AlertTriangle, 
      facts: slaFacts.length > 0 ? slaFacts : keyFacts.slice(0, 2),
      color: 'text-destructive' 
    },
    { 
      title: 'Flow & Backlog', 
      icon: Zap, 
      facts: flowFacts.length > 0 ? flowFacts : keyFacts.slice(2, 4),
      color: 'text-[hsl(var(--warning))]' 
    },
    { 
      title: 'Ownership & Escalation', 
      icon: Users, 
      facts: ownershipFacts.length > 0 ? ownershipFacts : keyFacts.slice(4, 6),
      color: 'text-muted-foreground' 
    },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Operational Narrative
      </h2>
      <div className="grid grid-cols-3 gap-5">
        {narrativeCards.map(card => (
          <div key={card.title} className="border border-border rounded-lg bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <card.icon className={cn("h-4 w-4", card.color)} />
              <h3 className="text-sm font-semibold text-foreground">
                {card.title}
              </h3>
            </div>
            <ul className="space-y-2">
              {card.facts.slice(0, 4).map((fact, idx) => (
                <li key={idx} className="text-sm text-foreground leading-snug flex items-start gap-2">
                  <span className="text-muted-foreground select-none mt-0.5">•</span>
                  <span>{fact}</span>
                </li>
              ))}
              {card.facts.length === 0 && (
                <li className="text-sm text-muted-foreground italic">No notable items</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// ACTION REGISTER
// ============================================================================

interface ActionRegisterProps {
  actions: string[];
  onActionClick: (action: string) => void;
}

function ActionRegister({ actions, onActionClick }: ActionRegisterProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 text-destructive" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">
          Required Actions
        </h2>
      </div>
      
      {actions.length === 0 ? (
        <div className="border border-border rounded-lg bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No immediate actions required</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[60px]">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {actions.slice(0, 7).map((action, idx) => (
                <tr 
                  key={idx}
                  onClick={() => onActionClick(action)}
                  className="hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3 align-middle">
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                      idx === 0 && "bg-destructive/10 text-destructive",
                      idx === 1 && "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
                      idx > 1 && "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="text-sm text-foreground font-medium">
                      {action}
                    </span>
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
// CHANGE & LEARNING SECTION
// ============================================================================

interface ChangeLearningProps {
  conversionMetrics: ConversionMetrics;
  comparisonLabel: string;
  conversionDelta: number;
}

function ChangeLearningSection({ 
  conversionMetrics, 
  comparisonLabel,
  conversionDelta 
}: ChangeLearningProps) {
  const { total, byType, medianLatencyHours, latencyChange, recentConversions } = conversionMetrics;
  
  const formatLatency = (hours: number | null): string => {
    if (hours === null) return '—';
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  };

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Change & Learning
        </h2>
      </div>

      <div className="border border-border rounded-lg bg-card p-6">
        {total === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-base font-medium text-foreground mb-1">
              No incidents converted to change items
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Consider reviewing resolved incidents for recurring patterns that could be addressed through stories, features, or epics to prevent future occurrences.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-8 mb-6">
              {/* Conversion Count */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Incidents Converted to Change
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {total}
                  </span>
                  <DeltaIndicator delta={conversionDelta} inverted={true} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  vs {comparisonLabel}
                </div>
              </div>

              {/* Conversion Mix */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Conversion Mix
                </div>
                <div className="flex items-center gap-4 text-base">
                  <span className="text-foreground">
                    <span className="font-bold tabular-nums text-xl">{byType.story || 0}</span>
                    <span className="text-muted-foreground ml-1.5">Story</span>
                  </span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-foreground">
                    <span className="font-bold tabular-nums text-xl">{byType.feature || 0}</span>
                    <span className="text-muted-foreground ml-1.5">Feature</span>
                  </span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-foreground">
                    <span className="font-bold tabular-nums text-xl">{byType.epic || 0}</span>
                    <span className="text-muted-foreground ml-1.5">Epic</span>
                  </span>
                </div>
              </div>

              {/* Median Latency */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Median Conversion Latency
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold tabular-nums text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    {formatLatency(medianLatencyHours)}
                  </span>
                  <LatencyDeltaIndicator delta={latencyChange} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  created → converted
                </div>
              </div>
            </div>

            {/* Recent Conversions Table */}
            {recentConversions.length > 0 && (
              <div className="border-t border-border pt-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  Latest Conversions
                </div>
                <div className="space-y-2">
                  {recentConversions.map((conv) => (
                    <div key={conv.incident_id} className="flex items-center gap-3 text-sm py-1">
                      <span className="font-mono text-xs text-[var(--brand-primary)] font-medium">
                        {conv.incident_key}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground capitalize font-medium">
                        {conv.converted_to_type}
                      </span>
                      {conv.converted_to_key && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {conv.converted_to_key}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs ml-auto">
                        {format(new Date(conv.converted_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
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

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top Risk Incidents
        </h2>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[40%]">
                Summary
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap">
                Age
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap">
                SLA State
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedIncidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No high-risk incidents at this time
                </td>
              </tr>
            ) : (
              paginatedIncidents.map((incident) => {
                const slaConfig = SLA_STATE_CONFIG[incident.sla_state.state] || SLA_STATE_CONFIG.n_a;

                return (
                  <tr
                    key={incident.id}
                    onClick={() => onRowClick(incident.id)}
                    className="hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 align-middle">
                      <span className="font-mono text-sm font-medium text-[var(--brand-primary)]">
                        {incident.incident_key}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-sm text-foreground line-clamp-1">
                        {incident.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={cn(
                        "text-sm font-semibold",
                        incident.severity === 'SEV1' && "text-destructive",
                        incident.severity === 'SEV2' && "text-[hsl(var(--warning))]"
                      )}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-sm text-foreground">
                        {STATUS_LABELS[incident.status] || incident.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-sm font-mono tabular-nums text-muted-foreground">
                        {formatAge(incident.age_hours)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={cn("text-sm", slaConfig.className)}>
                        {slaConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {incident.assignee_name ? (
                        <span className="text-sm text-foreground truncate block max-w-[120px]">
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
              })
            )}
          </tbody>
        </table>

        {/* Enterprise Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            {/* Left: Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-8 px-2 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Center: Page info */}
            <div className="text-sm text-muted-foreground tabular-nums">
              {startIndex + 1}–{endIndex} of {totalItems}
            </div>

            {/* Right: Navigation controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
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
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Previous page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <span className="px-2 text-sm text-foreground tabular-nums">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0"
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
                className="h-8 w-8 p-0"
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleMetricClick = (type: DrilldownFilter['type'], label: string) => {
    const incidents = getFilteredIncidents(type);
    onDrilldown({ type, label }, incidents);
  };

  const handleActionClick = (action: string) => {
    // Try to determine which filter to apply based on action text
    if (action.toLowerCase().includes('breach')) {
      handleMetricClick('sla_breached', 'SLA Breached');
    } else if (action.toLowerCase().includes('risk')) {
      handleMetricClick('sla_at_risk', 'SLA At Risk');
    } else if (action.toLowerCase().includes('major')) {
      handleMetricClick('major_active', 'Major Active');
    } else if (action.toLowerCase().includes('committee')) {
      handleMetricClick('committee', 'Committee');
    }
  };

  return (
    <div>
      {/* Period Info */}
      <div className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {format(periodRange.start, 'MMM d, yyyy HH:mm')} – {format(periodRange.end, 'MMM d, yyyy HH:mm')}
      </div>

      <ExecutiveSummaryHero
        summary={insights.executiveSummary}
        generatedAt={insights.generatedAt}
        metrics={currentMetrics}
        deltas={deltas}
        comparisonLabel={periodRange.comparisonLabel}
        onMetricClick={handleMetricClick}
      />

      <KPIScoreboard
        metrics={currentMetrics}
        deltas={deltas}
        onMetricClick={handleMetricClick}
      />

      <NarrativeCards
        keyFacts={insights.keyFacts}
        requiredActions={insights.requiredActions}
      />

      <ActionRegister
        actions={insights.requiredActions}
        onActionClick={handleActionClick}
      />

      <ChangeLearningSection
        conversionMetrics={conversionMetrics}
        comparisonLabel={periodRange.comparisonLabel}
        conversionDelta={deltas.converted}
      />

      <TopRiskIncidents
        incidents={majorIncidents}
        onRowClick={onRowClick}
      />
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

type ViewMode = 'list' | 'analytics' | 'insights';

function ViewSwitch({ currentMode }: { currentMode: ViewMode }) {
  const navigate = useNavigate();
  
  const modes: { value: ViewMode; label: string; icon: React.ElementType; path: string }[] = [
    { value: 'list', label: 'List', icon: List, path: '/release/incidents' },
    { value: 'analytics', label: 'Analytics', icon: BarChart3, path: '/release/incidents/analytics' },
    { value: 'insights', label: 'Insights', icon: Lightbulb, path: '/release/incidents/insights' },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => navigate(mode.path)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-all",
              isActive 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export default function IncidentInsightsPage() {
  const navigate = useNavigate();
  const [activePeriod, setActivePeriod] = useState<InsightPeriod>('today');
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter | null>(null);
  const [filteredIncidents, setFilteredIncidents] = useState<IncidentWithSLA[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  
  const { data: selectedIncident } = useIncidentDetail(selectedIncidentId);

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

  return (
    <div className="h-full flex flex-col bg-background">
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle="Incident Insights"
        showDivider={false}
        rightActions={
          <div className="flex items-center gap-4">
            <ViewSwitch currentMode="insights" />
            <div className="h-6 w-px bg-border" />
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 px-3 text-sm">
              <Printer className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        }
      />


      {/* Content with Tabs */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-6 max-w-[1600px]">
          <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as InsightPeriod)}>
            <TabsList className="mb-8 p-1 bg-muted/40 border border-border h-10">
              {PERIOD_TABS.map(tab => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="px-6 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
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
    </div>
  );
}
