/**
 * TESTS OVERVIEW PAGE
 * Dashboard with cycle progress, recent failures, coverage
 * All KPIs are clickable and deep-link to filtered views
 */

import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ListChecks,
  FileText,
  Play,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useProjectTestSummary,
  useProjectRecentFailures,
  useProjectCoverageByFeature,
  useProjectCycleProgress,
  useProjectTestCycles,
} from '@/hooks/useProjectTestMetrics';
import { RunTestsModal } from '../components/RunTestsModal';

// ═══════════════════════════════════════════════════════════════════
// METRIC CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  linkTo?: string;
}

function MetricCard({ title, value, icon, trend, trendUp, isLoading, onClick, linkTo }: MetricCardProps) {
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

  const content = (
    <Card className={cn(
      "bg-surface-2 border-border-default transition-all",
      (onClick || linkTo) && "hover:bg-surface-3 cursor-pointer hover:border-accent-primary/30"
    )}>
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
          <div className="flex flex-col items-end gap-2">
            <div className="p-2 bg-surface-3 rounded-lg">{icon}</div>
            {(onClick || linkTo) && (
              <ChevronRight className="h-4 w-4 text-text-quaternary" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block">{content}</Link>;
  }

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function TestsOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [runTestsOpen, setRunTestsOpen] = useState(false);
  
  // Preserve query params for navigation
  const queryString = searchParams.toString();
  const baseTestsUrl = `/projects/${projectId}/tests`;
  const preserveParams = (path: string, additionalParams?: string) => {
    const base = `${baseTestsUrl}${path}`;
    if (additionalParams && queryString) {
      return `${base}?${queryString}&${additionalParams}`;
    }
    if (additionalParams) {
      return `${base}?${additionalParams}`;
    }
    if (queryString) {
      return `${base}?${queryString}`;
    }
    return base;
  };
  
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useProjectTestSummary(projectId || null);
  const { data: cycleProgress, isLoading: cyclesLoading } = useProjectCycleProgress(projectId || '');
  const { data: recentFailures, isLoading: failuresLoading } = useProjectRecentFailures(projectId || '');
  const { data: coverage, isLoading: coverageLoading } = useProjectCoverageByFeature(projectId || '');
  const { cycles } = useProjectTestCycles(projectId || null);

  const handleRefresh = () => {
    refetchSummary();
  };

  const handleFailureClick = (failure: any) => {
    // Navigate to executions page with this specific execution highlighted
    navigate(preserveParams('/executions', `executionId=${failure.id}`));
  };

  const handleCycleClick = (cycleId: string) => {
    navigate(preserveParams('/cycles', `cycleId=${cycleId}`));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Test Overview</h2>
          <p className="text-sm text-text-tertiary">Real-time testing metrics and progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setRunTestsOpen(true)}
            className="gap-2 bg-accent-primary hover:bg-accent-primary-hover"
          >
            <Play className="h-4 w-4" />
            Run Tests
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(preserveParams('/reports'))}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Reports
          </Button>
        </div>
      </div>

      {/* Metrics Grid - Clickable KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Test Cases"
          value={summary?.totalCases ?? 0}
          icon={<ListChecks className="w-5 h-5 text-accent-primary" />}
          isLoading={summaryLoading}
          linkTo={preserveParams('/cases')}
        />
        <MetricCard
          title="Pass Rate"
          value={`${summary?.passRate ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5 text-status-success" />}
          trend={summary && summary.passed > 0 ? `${summary.passed} passed` : undefined}
          trendUp={true}
          isLoading={summaryLoading}
          linkTo={preserveParams('/executions', 'status=passed')}
        />
        <MetricCard
          title="Failed"
          value={summary?.failed ?? 0}
          icon={<XCircle className="w-5 h-5 text-status-error" />}
          isLoading={summaryLoading}
          linkTo={preserveParams('/executions', 'status=failed')}
        />
        <MetricCard
          title="Blocked"
          value={summary?.blocked ?? 0}
          icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
          isLoading={summaryLoading}
          linkTo={preserveParams('/executions', 'status=blocked')}
        />
        <MetricCard
          title="Not Run"
          value={summary?.notRun ?? 0}
          icon={<Clock className="w-5 h-5 text-text-tertiary" />}
          isLoading={summaryLoading}
          linkTo={preserveParams('/executions', 'status=not_run')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Cycle Progress */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-text-primary">
                Active Cycle Progress
              </CardTitle>
              <Link 
                to={preserveParams('/cycles')}
                className="text-xs text-accent-primary hover:underline"
              >
                View all cycles
              </Link>
            </div>
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
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => navigate(preserveParams('/cycles'))}
                  className="mt-2"
                >
                  Create a test cycle
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cycleProgress?.map(cycle => (
                  <div 
                    key={cycle.id} 
                    className="p-3 rounded-lg hover:bg-surface-3 cursor-pointer transition-colors"
                    onClick={() => handleCycleClick(cycle.id)}
                  >
                    <div className="flex justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary font-medium">{cycle.name}</span>
                        <Badge variant="outline" className="text-xs">{cycle.key}</Badge>
                      </div>
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

        {/* Recent Failures - Clickable */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-text-primary">
                Recent Failures
              </CardTitle>
              <Link 
                to={preserveParams('/executions', 'status=failed')}
                className="text-xs text-accent-primary hover:underline"
              >
                View all failures
              </Link>
            </div>
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
                <p className="text-xs text-text-quaternary mt-1">All tests are passing</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentFailures?.map(failure => (
                  <div
                    key={failure.id}
                    onClick={() => handleFailureClick(failure)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <XCircle className="h-4 w-4 text-status-error flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {failure.testCaseTitle}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {failure.cycleKey} • {failure.executedAt ? format(new Date(failure.executedAt), 'MMM d, h:mm a') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-status-error border-status-error/30">
                        Failed
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-text-quaternary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Feature - Real joins */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-text-primary">
              Test Coverage by Feature
            </CardTitle>
            <Link 
              to={preserveParams('/cases')}
              className="text-xs text-accent-primary hover:underline"
            >
              View test cases
            </Link>
          </div>
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
              <p className="text-xs text-text-quaternary mt-1">
                Link test cases to features or stories to see coverage
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {coverage?.map(feature => (
                <Link 
                  key={feature.featureId} 
                  to={preserveParams('/cases', `featureId=${feature.featureId}`)}
                  className="block p-3 bg-surface-3 rounded-lg hover:bg-surface-4 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary truncate max-w-[150px]">
                      {feature.featureName}
                    </span>
                    <span className="text-xs text-text-secondary">{feature.totalCases} cases</span>
                  </div>
                  <Progress 
                    value={feature.coverage} 
                    className={cn(
                      "h-1.5",
                      feature.coverage >= 80 && "[&>div]:bg-status-success",
                      feature.coverage >= 40 && feature.coverage < 80 && "[&>div]:bg-status-warning",
                      feature.coverage < 40 && "[&>div]:bg-status-error"
                    )}
                  />
                  <p className={cn(
                    "text-xs mt-1",
                    feature.coverage >= 80 ? "text-status-success" :
                    feature.coverage >= 40 ? "text-status-warning" : "text-status-error"
                  )}>
                    {feature.coverage}% coverage
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run Tests Modal */}
      <RunTestsModal 
        open={runTestsOpen} 
        onOpenChange={setRunTestsOpen}
        scopeType="project"
        scopeId={projectId}
      />
    </div>
  );
}
