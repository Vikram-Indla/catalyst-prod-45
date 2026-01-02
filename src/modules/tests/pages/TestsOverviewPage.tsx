/**
 * TESTS OVERVIEW PAGE
 * Dashboard with cycle progress, recent failures, coverage
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ListChecks,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useProjectTestSummary,
  useProjectRecentFailures,
  useProjectCoverageByFeature,
  useProjectCycleProgress,
} from '@/hooks/useProjectTestMetrics';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  isLoading?: boolean;
}

function MetricCard({ title, value, icon, trend, trendUp, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-surface-2 border-border-default">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-2 border-border-default">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-tertiary">{title}</p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
            {trend && (
              <p className={cn('text-xs mt-1', trendUp ? 'text-status-success' : 'text-status-error')}>
                {trend}
              </p>
            )}
          </div>
          <div className="p-2 bg-surface-3 rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestsOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  
  const { data: summary, isLoading: summaryLoading } = useProjectTestSummary(projectId || null);
  const { data: cycleProgress, isLoading: cyclesLoading } = useProjectCycleProgress(projectId || '');
  const { data: recentFailures, isLoading: failuresLoading } = useProjectRecentFailures(projectId || '');
  const { data: coverage, isLoading: coverageLoading } = useProjectCoverageByFeature(projectId || '');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Test Cases"
          value={summary?.totalCases ?? 0}
          icon={<ListChecks className="w-5 h-5 text-accent-primary" />}
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Pass Rate"
          value={`${summary?.passRate ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5 text-status-success" />}
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Failed"
          value={summary?.failed ?? 0}
          icon={<XCircle className="w-5 h-5 text-status-error" />}
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Blocked"
          value={summary?.blocked ?? 0}
          icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Not Run"
          value={summary?.notRun ?? 0}
          icon={<Clock className="w-5 h-5 text-text-tertiary" />}
          isLoading={summaryLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Cycle Progress */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary">
              Current Cycle Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cyclesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : cycleProgress?.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active cycles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cycleProgress?.map(cycle => (
                  <div key={cycle.id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-secondary">{cycle.name}</span>
                      <span className="text-text-primary font-medium">{cycle.progress}%</span>
                    </div>
                    <Progress value={cycle.progress} className="h-2" />
                    <div className="grid grid-cols-4 gap-2 text-center text-xs mt-2">
                      <div>
                        <p className="text-status-success font-medium">{cycle.passed}</p>
                        <p className="text-text-quaternary">Passed</p>
                      </div>
                      <div>
                        <p className="text-status-error font-medium">{cycle.failed}</p>
                        <p className="text-text-quaternary">Failed</p>
                      </div>
                      <div>
                        <p className="text-status-warning font-medium">{cycle.blocked}</p>
                        <p className="text-text-quaternary">Blocked</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary font-medium">{cycle.notRun}</p>
                        <p className="text-text-quaternary">Not Run</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Failures */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary">
              Recent Failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {failuresLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentFailures?.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-status-success opacity-50" />
                <p className="text-sm">No recent failures</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFailures?.map(failure => (
                  <div
                    key={failure.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="h-4 w-4 text-status-error" />
                      <div>
                        <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">
                          {failure.testCaseTitle}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {failure.cycleKey} • {failure.executedAt ? format(new Date(failure.executedAt), 'MMM d') : '—'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-status-error border-status-error/30">
                      Failed
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Feature */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-text-primary">
            Test Coverage by Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : coverage?.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No features with test coverage yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {coverage?.map(feature => (
                <div key={feature.featureId} className="p-3 bg-surface-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary truncate max-w-[150px]">
                      {feature.featureName}
                    </span>
                    <span className="text-xs text-text-secondary">{feature.totalCases} cases</span>
                  </div>
                  <Progress value={feature.coverage} className="h-1.5" />
                  <p className="text-xs text-text-tertiary mt-1">{feature.coverage}% covered</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
