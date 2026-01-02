/**
 * Daily Command Center Report Component
 * Bloomberg-style dense panel grid with real metrics
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  Target,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { 
  DailyMetrics, 
  RiskItem, 
  RecommendedAction 
} from '../hooks/useTestReportMetrics';

interface DailyCommandReportProps {
  metrics: DailyMetrics | null;
  risks: RiskItem[];
  recommendedActions: RecommendedAction[];
  isLoading: boolean;
  onRiskClick?: (risk: RiskItem) => void;
  onActionClick?: (action: RecommendedAction) => void;
}

function MetricTile({ 
  label, 
  value, 
  change, 
  suffix = '', 
  inverse = false 
}: { 
  label: string; 
  value: number; 
  change: number; 
  suffix?: string; 
  inverse?: boolean;
}) {
  const isPositive = inverse ? change < 0 : change > 0;
  const isNegative = inverse ? change > 0 : change < 0;
  
  return (
    <div className="bg-surface-2 border border-border-default rounded-lg p-3">
      <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-2xl font-bold text-text-primary tabular-nums">
          {value}{suffix}
        </p>
        <div className={`flex items-center gap-0.5 text-xs font-medium ${
          isPositive ? 'text-status-success' : 
          isNegative ? 'text-status-error' : 
          'text-text-quaternary'
        }`}>
          {change !== 0 && (
            isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
          )}
          <span>{change >= 0 ? '+' : ''}{change}{suffix}</span>
        </div>
      </div>
    </div>
  );
}

function StatusBreakdown({ metrics }: { metrics: DailyMetrics }) {
  const total = metrics.passed + metrics.failed + metrics.blocked + metrics.skipped + metrics.notRun;
  const items = [
    { label: 'Passed', value: metrics.passed, color: 'bg-status-success', percent: total > 0 ? (metrics.passed / total) * 100 : 0 },
    { label: 'Failed', value: metrics.failed, color: 'bg-status-error', percent: total > 0 ? (metrics.failed / total) * 100 : 0 },
    { label: 'Blocked', value: metrics.blocked, color: 'bg-status-warning', percent: total > 0 ? (metrics.blocked / total) * 100 : 0 },
    { label: 'Skipped', value: metrics.skipped, color: 'bg-text-quaternary', percent: total > 0 ? (metrics.skipped / total) * 100 : 0 },
    { label: 'Not Run', value: metrics.notRun, color: 'bg-surface-3', percent: total > 0 ? (metrics.notRun / total) * 100 : 0 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-surface-3">
        {items.map((item, i) => (
          <div 
            key={item.label} 
            className={`${item.color} transition-all`} 
            style={{ width: `${item.percent}%` }} 
          />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 text-xs">
        {items.map(item => (
          <div key={item.label} className="text-center">
            <div className="font-semibold text-text-primary tabular-nums">{item.value}</div>
            <div className="text-text-quaternary">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskCard({ risk, onClick }: { risk: RiskItem; onClick?: () => void }) {
  const severityColors = {
    critical: 'bg-status-error/10 text-status-error border-status-error/30',
    high: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    medium: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  };

  return (
    <div 
      className="group p-2.5 bg-surface-1 border border-border-default rounded-md hover:bg-surface-2 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <Badge className={`${severityColors[risk.severity]} text-[10px] uppercase font-semibold shrink-0`}>
          {risk.severity}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{risk.title}</p>
          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{risk.description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-text-quaternary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </div>
  );
}

function ActionCard({ action, onClick }: { action: RecommendedAction; onClick?: () => void }) {
  const priorityIcons = {
    1: <Zap className="h-3.5 w-3.5 text-status-error" />,
    2: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    3: <Target className="h-3.5 w-3.5 text-accent-primary" />,
  };

  return (
    <div 
      className="group flex items-center gap-3 p-2.5 bg-surface-1 border border-border-default rounded-md hover:bg-surface-2 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-3 shrink-0">
        {priorityIcons[action.priority as 1 | 2 | 3] || priorityIcons[3]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{action.title}</p>
        <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{action.description}</p>
      </div>
      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function DailyCommandReport({
  metrics,
  risks,
  recommendedActions,
  isLoading,
  onRiskClick,
  onActionClick,
}: DailyCommandReportProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary">
        No data available for today
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric Tiles Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile 
          label="Tests Executed" 
          value={metrics.testsExecuted} 
          change={metrics.testsExecuted - metrics.testsExecutedYesterday} 
        />
        <MetricTile 
          label="Pass Rate" 
          value={metrics.passRate} 
          change={metrics.passRate - metrics.passRateYesterday}
          suffix="%" 
        />
        <MetricTile 
          label="New Defects" 
          value={metrics.newDefects} 
          change={metrics.newDefects - metrics.newDefectsYesterday}
          inverse 
        />
        <MetricTile 
          label="Blocked Tests" 
          value={metrics.blockedTests} 
          change={metrics.blockedTests - metrics.blockedTestsYesterday}
          inverse 
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Breakdown Panel */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent-primary" />
              Execution Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <StatusBreakdown metrics={metrics} />
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Completion</span>
                <span className="font-medium text-text-primary">
                  {metrics.testsExecuted > 0 
                    ? Math.round(((metrics.passed + metrics.failed) / metrics.testsExecuted) * 100) 
                    : 0}%
                </span>
              </div>
              <Progress 
                value={metrics.testsExecuted > 0 
                  ? ((metrics.passed + metrics.failed) / metrics.testsExecuted) * 100 
                  : 0} 
                className="h-1.5" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Risks Panel */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-error" />
              Top Risks Today
              {risks.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {risks.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="h-[180px]">
              {risks.length > 0 ? (
                <div className="space-y-2">
                  {risks.slice(0, 5).map(risk => (
                    <RiskCard 
                      key={risk.id} 
                      risk={risk} 
                      onClick={() => onRiskClick?.(risk)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                  <CheckCircle2 className="h-8 w-8 mb-2 text-status-success" />
                  <p className="text-sm">No critical risks identified</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recommended Actions Panel */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Recommended Actions
              {recommendedActions.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {recommendedActions.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="h-[180px]">
              {recommendedActions.length > 0 ? (
                <div className="space-y-2">
                  {recommendedActions.slice(0, 5).map(action => (
                    <ActionCard 
                      key={action.id} 
                      action={action} 
                      onClick={() => onActionClick?.(action)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                  <Target className="h-8 w-8 mb-2" />
                  <p className="text-sm">No actions pending</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
