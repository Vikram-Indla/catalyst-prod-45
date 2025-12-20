/**
 * Incident Insights Page
 * Text-first operational briefing
 */

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Printer, Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/release/incidents/analytics">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Incident Insights</h1>
              <p className="text-sm text-muted-foreground">Operational briefing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TimeRangeSelector
              value={timeRange}
              onChange={handleTimeRangeChange}
              customStart={customStart}
              customEnd={customEnd}
            />
            <div className="h-6 w-px bg-border" />
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
              <Printer className="h-4 w-4 mr-1.5" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
        {/* Generated timestamp */}
        <div className="text-xs text-muted-foreground mb-6 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Generated: {format(insights.generatedAt, 'PPpp')}
        </div>

        {/* Executive Summary */}
        <Card className="mb-6 border-l-4 border-l-[var(--brand-primary)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {insights.executiveSummary}
            </p>
          </CardContent>
        </Card>

        {/* Key Facts */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(35_92%_50%)]" />
              Key Facts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.keyFacts.map((fact, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Required Actions */}
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-destructive" />
              Required Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {insights.requiredActions.map((action, idx) => (
                <li key={idx} className="text-sm text-foreground font-medium">
                  {action}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
