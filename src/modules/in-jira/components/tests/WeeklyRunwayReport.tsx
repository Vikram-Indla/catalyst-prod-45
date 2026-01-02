/**
 * Weekly Runway Report Component
 * Forecasting release readiness with coverage gaps and capacity
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Users, 
  AlertTriangle,
  BarChart3,
  Target,
  Bug,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import type { 
  WeeklyMetrics, 
  ReleaseBlocker, 
  FeatureCoverageGap, 
  AssigneeCapacity,
  DefectTrend,
  ReleaseReadiness
} from '../../hooks/useTestReportMetrics';

interface WeeklyRunwayReportProps {
  metrics: WeeklyMetrics | null;
  releaseBlockers: ReleaseBlocker[];
  coverageGaps: FeatureCoverageGap[];
  assigneeCapacity: AssigneeCapacity[];
  defectTrend: DefectTrend[];
  releaseReadiness: ReleaseReadiness | null;
  isLoading: boolean;
  onGapClick?: (gap: FeatureCoverageGap) => void;
  onBlockerClick?: (blocker: ReleaseBlocker) => void;
}

function MetricCard({ 
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
    <div className="bg-surface-2 border border-border-default rounded-lg p-4">
      <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-3xl font-bold text-text-primary tabular-nums">
          {value}{suffix}
        </p>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-status-success' : 
          isNegative ? 'text-status-error' : 
          'text-text-quaternary'
        }`}>
          {change !== 0 && (
            isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
          )}
          <span>{change >= 0 ? '+' : ''}{change}{suffix}</span>
        </div>
      </div>
      <p className="text-xs text-text-quaternary mt-1">vs last week</p>
    </div>
  );
}

function ReadinessGauge({ readiness }: { readiness: ReleaseReadiness }) {
  const statusColors = {
    ready: 'text-status-success',
    at_risk: 'text-amber-500',
    blocked: 'text-status-error',
  };
  
  const statusLabels = {
    ready: 'Ready to Release',
    at_risk: 'At Risk',
    blocked: 'Blocked',
  };

  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent-primary" />
          Release Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className="stroke-surface-3"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className={`${statusColors[readiness.status]} stroke-current`}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${readiness.score} 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-text-primary">{readiness.score}%</span>
            </div>
          </div>
          <div>
            <Badge className={`${statusColors[readiness.status]} bg-current/10`}>
              {statusLabels[readiness.status]}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          {Object.entries(readiness.components).map(([key, comp]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary w-24 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <Progress value={comp.score} className="flex-1 h-1.5" />
              <span className="text-xs text-text-secondary tabular-nums w-10 text-right">
                {comp.score}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BlockersPanel({ blockers, onClick }: { blockers: ReleaseBlocker[]; onClick?: (b: ReleaseBlocker) => void }) {
  const severityColors = {
    blocker: 'bg-status-error/10 text-status-error border-status-error/30',
    critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    high: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  };

  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-error" />
          Release Blockers
          {blockers.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {blockers.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className="h-[160px]">
          {blockers.length > 0 ? (
            <div className="space-y-2">
              {blockers.map(blocker => (
                <div 
                  key={blocker.id}
                  className="group p-2.5 bg-surface-1 border border-border-default rounded-md hover:bg-surface-2 cursor-pointer transition-colors"
                  onClick={() => onClick?.(blocker)}
                >
                  <div className="flex items-start gap-2">
                    <Badge className={`${severityColors[blocker.severity]} text-[10px] uppercase font-semibold shrink-0`}>
                      {blocker.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{blocker.title}</p>
                      <p className="text-xs text-text-quaternary mt-0.5">{blocker.impact}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-quaternary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <Shield className="h-8 w-8 mb-2 text-status-success" />
              <p className="text-sm">No release blockers</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CoverageGapsPanel({ gaps, onClick }: { gaps: FeatureCoverageGap[]; onClick?: (g: FeatureCoverageGap) => void }) {
  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-500" />
          Coverage Gaps by Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className="h-[160px]">
          {gaps.length > 0 ? (
            <div className="space-y-2">
              {gaps.slice(0, 6).map(gap => (
                <div 
                  key={gap.featureId}
                  className="group p-2 bg-surface-1 border border-border-default rounded-md hover:bg-surface-2 cursor-pointer transition-colors"
                  onClick={() => onClick?.(gap)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary truncate flex-1">{gap.featureName}</span>
                    <span className="text-xs text-text-tertiary">{gap.storiesWithTests}/{gap.totalStories}</span>
                  </div>
                  <Progress value={gap.coveragePercent} className="h-1.5" />
                  <p className="text-xs text-text-quaternary mt-1">{gap.epicName || 'No Epic'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <Target className="h-8 w-8 mb-2 text-status-success" />
              <p className="text-sm">All features have adequate coverage</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CapacityPanel({ capacity }: { capacity: AssigneeCapacity[] }) {
  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-primary" />
          Execution Capacity by Assignee
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className="h-[160px]">
          {capacity.length > 0 ? (
            <div className="space-y-3">
              {capacity.slice(0, 6).map(user => (
                <div key={user.userId}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-text-primary truncate">{user.userName}</span>
                    <span className="text-text-tertiary">{user.executed}/{user.assigned} ({user.utilization}%)</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-3">
                    <div 
                      className="bg-status-success" 
                      style={{ width: `${user.assigned > 0 ? (user.passed / user.assigned) * 100 : 0}%` }} 
                    />
                    <div 
                      className="bg-status-error" 
                      style={{ width: `${user.assigned > 0 ? (user.failed / user.assigned) * 100 : 0}%` }} 
                    />
                    <div 
                      className="bg-status-warning" 
                      style={{ width: `${user.assigned > 0 ? (user.blocked / user.assigned) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-sm">No assignment data</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DefectTrendChart({ data }: { data: DefectTrend[] }) {
  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Bug className="h-4 w-4 text-status-error" />
          Defect Leakage Trend (14 days)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--status-error))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--status-error))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--text-tertiary))' }}
                axisLine={{ stroke: 'hsl(var(--border-default))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--text-tertiary))' }}
                axisLine={{ stroke: 'hsl(var(--border-default))' }}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--surface-2))',
                  border: '1px solid hsl(var(--border-default))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke="hsl(var(--status-error))" 
                fillOpacity={1}
                fill="url(#cumulativeGradient)"
                name="Open Defects"
              />
              <Line 
                type="monotone" 
                dataKey="opened" 
                stroke="hsl(var(--status-error))" 
                strokeWidth={2}
                dot={false}
                name="Opened"
              />
              <Line 
                type="monotone" 
                dataKey="closed" 
                stroke="hsl(var(--status-success))" 
                strokeWidth={2}
                dot={false}
                name="Closed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyTrendChart({ data }: { data: { date: string; passed: number; failed: number; blocked: number }[] }) {
  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-primary" />
          Daily Execution Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--text-tertiary))' }}
                axisLine={{ stroke: 'hsl(var(--border-default))' }}
                tickLine={false}
                tickFormatter={(v) => v.split('-').slice(1).join('/')}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--text-tertiary))' }}
                axisLine={{ stroke: 'hsl(var(--border-default))' }}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--surface-2))',
                  border: '1px solid hsl(var(--border-default))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="passed" stackId="a" fill="hsl(var(--status-success))" name="Passed" />
              <Bar dataKey="failed" stackId="a" fill="hsl(var(--status-error))" name="Failed" />
              <Bar dataKey="blocked" stackId="a" fill="hsl(var(--status-warning))" name="Blocked" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyRunwayReport({
  metrics,
  releaseBlockers,
  coverageGaps,
  assigneeCapacity,
  defectTrend,
  releaseReadiness,
  isLoading,
  onGapClick,
  onBlockerClick,
}: WeeklyRunwayReportProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary">
        No data available for this week
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard 
          label="Total Executed" 
          value={metrics.totalExecuted} 
          change={metrics.totalExecuted - metrics.totalExecutedLastWeek} 
        />
        <MetricCard 
          label="Avg Pass Rate" 
          value={metrics.avgPassRate} 
          change={metrics.avgPassRate - metrics.avgPassRateLastWeek}
          suffix="%" 
        />
        <MetricCard 
          label="Coverage" 
          value={metrics.coveragePercent} 
          change={metrics.coveragePercent - metrics.coveragePercentLastWeek}
          suffix="%" 
        />
        <MetricCard 
          label="Total Defects" 
          value={metrics.totalDefects} 
          change={metrics.totalDefects - metrics.totalDefectsLastWeek}
          inverse 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DailyTrendChart data={metrics.dailyTrend} />
        <DefectTrendChart data={defectTrend} />
      </div>

      {/* Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {releaseReadiness && <ReadinessGauge readiness={releaseReadiness} />}
        <BlockersPanel blockers={releaseBlockers} onClick={onBlockerClick} />
        <CoverageGapsPanel gaps={coverageGaps} onClick={onGapClick} />
      </div>

      {/* Capacity Row */}
      <CapacityPanel capacity={assigneeCapacity} />
    </div>
  );
}
