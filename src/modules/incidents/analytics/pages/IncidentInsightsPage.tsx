/**
 * Incident Insights Page
 * Text-first operational briefing for CIOs
 */

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Printer, Loader2, ChevronRight, AlertTriangle, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIncidentAnalytics } from '../hooks/useIncidentAnalytics';
import { useIncidentInsights } from '../hooks/useIncidentInsights';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import type { TimeRange } from '../types';
import { format } from 'date-fns';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  custom: 'Custom range',
};

export default function IncidentInsightsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();

  const { snapshot, breakdowns, majorIncidents, isLoading } = useIncidentAnalytics(
    timeRange, customStart, customEnd
  );

  const insights = useIncidentInsights(
    snapshot,
    breakdowns,
    majorIncidents,
    TIME_RANGE_LABELS[timeRange]
  );

  const handleTimeRangeChange = (range: TimeRange, start?: Date, end?: Date) => {
    setTimeRange(range);
    if (range === 'custom') {
      setCustomStart(start);
      setCustomEnd(end);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground mt-0.5">Operational briefing</p>
            </div>
            <div className="flex items-center gap-3">
              <TimeRangeSelector
                value={timeRange}
                onChange={handleTimeRangeChange}
                customStart={customStart}
                customEnd={customEnd}
              />
              <div className="h-5 w-px bg-border" />
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
                <Printer className="h-4 w-4 mr-1.5" />
                Print / PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content - CIO Briefing Style */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Timestamp */}
          <div className="text-xs text-muted-foreground mb-4">
            Generated {format(insights.generatedAt, 'EEEE, MMMM d, yyyy · h:mm a')}
          </div>

          {/* Executive Summary - Most Prominent */}
          <section className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Executive Summary
            </h2>
            <div className="border-l-2 border-[var(--brand-primary)] pl-4">
              <p className="text-base text-foreground leading-relaxed">
                {insights.executiveSummary}
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border my-6" />

          {/* Key Facts */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key Facts
              </h2>
            </div>
            <ul className="space-y-2">
              {insights.keyFacts.map((fact, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-muted-foreground select-none">•</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Divider */}
          <div className="border-t border-border my-6" />

          {/* Required Actions */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-destructive" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive">
                Required Actions
              </h2>
            </div>
            <ol className="space-y-2">
              {insights.requiredActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-foreground font-medium pt-0.5">{action}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
