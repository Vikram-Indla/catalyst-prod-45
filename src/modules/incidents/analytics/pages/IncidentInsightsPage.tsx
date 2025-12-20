/**
 * Incident Insights Page
 * Premium tabbed executive report for CIOs
 */

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Printer, Loader2, ChevronRight, AlertTriangle, Target, TrendingUp, TrendingDown, Minus, Lightbulb, Clock, ArrowRight, BarChart3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import { useIncidentInsights } from '../hooks/useIncidentInsights';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { InsightPeriod, DrilldownFilter, IncidentWithSLA, ConversionMetrics } from '../types';

const PERIOD_TABS: { value: InsightPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week (WTD)' },
  { value: 'last_week', label: 'Last Week' },
];

type ViewMode = 'list' | 'analytics' | 'insights';

function ModeSwitchSegment({ 
  currentMode, 
  onModeChange 
}: { 
  currentMode: ViewMode; 
  onModeChange: (mode: ViewMode) => void;
}) {
  const modes: { value: ViewMode; label: string; icon: React.ElementType }[] = [
    { value: 'list', label: 'List', icon: List },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'insights', label: 'Insights', icon: Lightbulb },
  ];

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all",
              isActive 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

interface FactMetric {
  key: string;
  label: string;
  value: number;
  delta?: number;
  isUrgent?: boolean;
  isWarning?: boolean;
  filterType: DrilldownFilter['type'];
}

function DeltaIndicator({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center text-muted-foreground text-xs">
        <Minus className="h-3 w-3 mr-0.5" />
        0
      </span>
    );
  }
  
  // For some metrics, increase is bad (breached, at_risk). For others (resolved), increase is good
  const isPositive = inverted ? delta < 0 : delta > 0;
  const isNegative = inverted ? delta > 0 : delta < 0;
  
  return (
    <span className={cn(
      "inline-flex items-center text-xs font-medium",
      isPositive && "text-[hsl(var(--warning))]",
      isNegative && "text-muted-foreground"
    )}>
      {delta > 0 ? (
        <TrendingUp className="h-3 w-3 mr-0.5" />
      ) : (
        <TrendingDown className="h-3 w-3 mr-0.5" />
      )}
      {delta > 0 ? '+' : ''}{delta}
    </span>
  );
}

function LatencyDeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    return (
      <span className="inline-flex items-center text-muted-foreground text-xs">
        <Minus className="h-3 w-3 mr-0.5" />
        —
      </span>
    );
  }
  
  // Negative = faster (good), Positive = slower (warning)
  const isFaster = delta < 0;
  
  return (
    <span className={cn(
      "inline-flex items-center text-xs font-medium",
      isFaster ? "text-muted-foreground" : "text-[hsl(var(--warning))]"
    )}>
      {delta > 0 ? (
        <TrendingUp className="h-3 w-3 mr-0.5" />
      ) : (
        <TrendingDown className="h-3 w-3 mr-0.5" />
      )}
      {delta > 0 ? '+' : ''}{Math.round(delta)}h
    </span>
  );
}

function FactStrip({ 
  metrics, 
  comparisonLabel,
  onMetricClick 
}: { 
  metrics: FactMetric[]; 
  comparisonLabel: string;
  onMetricClick: (metric: FactMetric) => void;
}) {
  return (
    <div className="border-l border-border pl-5 ml-5 flex-shrink-0">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
        vs {comparisonLabel}
      </div>
      <div className="grid grid-cols-3 gap-x-5 gap-y-3">
        {metrics.map(metric => (
          <button
            key={metric.key}
            onClick={() => onMetricClick(metric)}
            className={cn(
              "text-left p-2 -m-2 rounded transition-colors min-w-[72px]",
              "hover:bg-muted/50 cursor-pointer"
            )}
          >
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
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
              {metric.delta !== undefined && (
                <DeltaIndicator 
                  delta={metric.delta} 
                  inverted={metric.key === 'resolved'} 
                />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChangeLearningSection({ 
  conversionMetrics, 
  comparisonLabel,
  conversionDelta,
}: { 
  conversionMetrics: ConversionMetrics;
  comparisonLabel: string;
  conversionDelta: number;
}) {
  const { total, byType, medianLatencyHours, latencyChange, recentConversions } = conversionMetrics;
  
  const formatLatency = (hours: number | null): string => {
    if (hours === null) return '—';
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  };

  return (
    <section className="border border-border rounded-md bg-card">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Change &amp; Learning
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Conversion Count */}
          <div>
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
              Incidents Converted to Change
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {total}
              </span>
              <DeltaIndicator delta={conversionDelta} inverted={true} />
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">
              vs {comparisonLabel}
            </div>
          </div>

          {/* Conversion Mix */}
          <div>
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
              Conversion Mix
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-foreground">
                <span className="font-semibold tabular-nums">{byType.story || 0}</span>
                <span className="text-muted-foreground ml-1">Story</span>
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">
                <span className="font-semibold tabular-nums">{byType.feature || 0}</span>
                <span className="text-muted-foreground ml-1">Feature</span>
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">
                <span className="font-semibold tabular-nums">{byType.epic || 0}</span>
                <span className="text-muted-foreground ml-1">Epic</span>
              </span>
            </div>
          </div>

          {/* Median Latency */}
          <div>
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
              Median Conversion Latency
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatLatency(medianLatencyHours)}
              </span>
              <LatencyDeltaIndicator delta={latencyChange} />
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">
              created → converted
            </div>
          </div>
        </div>

        {/* Recent Conversions */}
        {recentConversions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-2">
              Latest Conversions
            </div>
            <div className="space-y-1.5">
              {recentConversions.map((conv) => (
                <div key={conv.incident_id} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{conv.incident_key}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground capitalize">{conv.converted_to_type}</span>
                  {conv.converted_to_key && (
                    <span className="font-mono text-xs text-muted-foreground">{conv.converted_to_key}</span>
                  )}
                  <span className="text-muted-foreground text-xs ml-auto">
                    {format(new Date(conv.converted_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function InsightTabContent({ 
  period,
  onDrilldown,
}: { 
  period: InsightPeriod;
  onDrilldown: (filter: DrilldownFilter, incidents: IncidentWithSLA[]) => void;
}) {
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const factMetrics: FactMetric[] = [
    { key: 'created', label: 'Created', value: currentMetrics.created, delta: deltas.created, filterType: 'created' },
    { key: 'resolved', label: 'Resolved', value: currentMetrics.resolved, delta: deltas.resolved, filterType: 'resolved' },
    { key: 'backlog', label: 'Backlog Δ', value: currentMetrics.backlog_delta, delta: deltas.backlog_delta, filterType: 'open' },
    { key: 'breached', label: 'SLA Breached', value: currentMetrics.sla_breached, delta: deltas.sla_breached, isUrgent: true, filterType: 'sla_breached' },
    { key: 'at_risk', label: 'SLA At Risk', value: currentMetrics.sla_at_risk, delta: deltas.sla_at_risk, isWarning: true, filterType: 'sla_at_risk' },
    { key: 'major', label: 'Major Active', value: currentMetrics.major_active, delta: deltas.major_active, isUrgent: true, filterType: 'major_active' },
  ];

  const handleMetricClick = (metric: FactMetric) => {
    const incidents = getFilteredIncidents(metric.filterType);
    onDrilldown({ type: metric.filterType, label: metric.label }, incidents);
  };

  return (
    <div className="space-y-6">
      {/* Period Info */}
      <div className="text-xs text-muted-foreground">
        {format(periodRange.start, 'MMM d, yyyy HH:mm')} – {format(periodRange.end, 'MMM d, yyyy HH:mm')}
      </div>

      {/* Executive Briefing Card */}
      <section className="border border-border rounded-md bg-card">
        <div className="p-4 flex">
          {/* Left: Executive Summary */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Executive Briefing
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              {insights.executiveSummary}
            </p>
          </div>
          
          {/* Right: Fact Strip */}
          <FactStrip 
            metrics={factMetrics} 
            comparisonLabel={periodRange.comparisonLabel}
            onMetricClick={handleMetricClick}
          />
        </div>
      </section>

      {/* Situation Breakdown */}
      <section className="grid grid-cols-2 gap-6">
        {/* Key Facts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key Facts
            </h2>
          </div>
          <ul className="space-y-1.5">
            {insights.keyFacts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-muted-foreground select-none leading-5">•</span>
                <span className="leading-5">{fact}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Required Actions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-destructive" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Required Actions
            </h2>
          </div>
          <ol className="space-y-1.5">
            {insights.requiredActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-foreground font-medium leading-5 pt-0.5">{action}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Change & Learning Section */}
      <ChangeLearningSection 
        conversionMetrics={conversionMetrics}
        comparisonLabel={periodRange.comparisonLabel}
        conversionDelta={deltas.converted}
      />
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

  const handleModeChange = (mode: ViewMode) => {
    if (mode === 'list') {
      navigate('/release/incidents');
    } else if (mode === 'analytics') {
      navigate('/release/incidents/analytics');
    } else if (mode === 'insights') {
      navigate('/release/incidents/insights');
    }
  };

  const handleDrilldown = (filter: DrilldownFilter, incidents: IncidentWithSLA[]) => {
    setActiveFilter(filter);
    setFilteredIncidents(incidents);
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
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="px-6 py-4">
          {/* Breadcrumb Row */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link to="/release" className="hover:text-foreground transition-colors">
              Release
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/release/incidents" className="hover:text-foreground transition-colors">
              Incident List
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Insights</span>
          </nav>
          
          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Incident Insights</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Executive operational report</p>
            </div>
            <div className="flex items-center gap-4">
              <ModeSwitchSegment currentMode="insights" onModeChange={handleModeChange} />
              <div className="h-5 w-px bg-border" />
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
                <Printer className="h-4 w-4 mr-1.5" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as InsightPeriod)}>
            <TabsList className="mb-6">
              {PERIOD_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="px-4">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {PERIOD_TABS.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                <InsightTabContent 
                  period={tab.value} 
                  onDrilldown={handleDrilldown}
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
