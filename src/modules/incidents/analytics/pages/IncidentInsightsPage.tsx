/**
 * Incident Insights Page
 * Premium tabbed executive report for CIOs
 */

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Printer, Loader2, ChevronRight, AlertTriangle, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import { useIncidentInsights } from '../hooks/useIncidentInsights';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { InsightPeriod, DrilldownFilter, IncidentWithSLA } from '../types';

const PERIOD_TABS: { value: InsightPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week (WTD)' },
  { value: 'last_week', label: 'Last Week' },
];

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
    <div className="border-l border-border pl-4 ml-4 flex-shrink-0">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
        vs {comparisonLabel}
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        {metrics.map(metric => (
          <button
            key={metric.key}
            onClick={() => onMetricClick(metric)}
            className={cn(
              "text-left p-1.5 -m-1.5 rounded transition-colors",
              "hover:bg-muted/50 cursor-pointer"
            )}
          >
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">
              {metric.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-lg font-bold tabular-nums",
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
    </div>
  );
}

export default function IncidentInsightsPage() {
  const [activePeriod, setActivePeriod] = useState<InsightPeriod>('today');
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter | null>(null);
  const [filteredIncidents, setFilteredIncidents] = useState<IncidentWithSLA[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  
  const { data: selectedIncident } = useIncidentDetail(selectedIncidentId);

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
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
                <Printer className="h-4 w-4 mr-1.5" />
                Print / PDF
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
