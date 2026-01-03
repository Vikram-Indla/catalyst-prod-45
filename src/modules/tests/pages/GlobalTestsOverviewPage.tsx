/**
 * GLOBAL TESTS OVERVIEW PAGE
 * Dashboard with KPIs, cycle progress, recent failures, coverage
 * All metrics scoped by current scope selection
 */

import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
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
  Package,
  RefreshCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestMetrics, useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { ScopeType } from '../hooks/useGlobalTestScope';
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

export function GlobalTestsOverviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [runTestsOpen, setRunTestsOpen] = useState(false);

  // Get scope from URL
  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'global';
  const scopeId = searchParams.get('scopeId');

  // Build base URL with scope params
  const buildUrl = (path: string, additionalParams?: string) => {
    const base = `/tests/${path}`;
    const params = new URLSearchParams();
    params.set('scopeType', scopeType);
    if (scopeId) params.set('scopeId', scopeId);
    if (additionalParams) {
      additionalParams.split('&').forEach(p => {
        const [k, v] = p.split('=');
        params.set(k, v);
      });
    }
    return `${base}?${params.toString()}`;
  };

  // Fetch data
  const { metrics, isLoading: metricsLoading, refetch } = useGlobalTestMetrics(scopeType, scopeId);
  const { data: cycles, isLoading: cyclesLoading } = useGlobalTestCycles(scopeType, scopeId);

  // Process active cycles for progress widget
  const activeCycles = (cycles || [])
    .filter((c: any) => ['active', 'in_progress'].includes(c.status))
    .slice(0, 5)
    .map((cycle: any) => {
      const execs = cycle.test_cycle_executions || [];
      const total = execs.length;
      const passed = execs.filter((e: any) => e.status === 'passed').length;
      const failed = execs.filter((e: any) => e.status === 'failed').length;
      const blocked = execs.filter((e: any) => e.status === 'blocked').length;
      const notRun = total - passed - failed - blocked;
      const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;
      return { ...cycle, total, passed, failed, blocked, notRun, progress };
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Test Overview</h2>
          <p className="text-sm text-text-tertiary">
            Real-time testing metrics across {scopeType === 'global' ? 'all programs' : `selected ${scopeType}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
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
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Test Cases"
          value={metrics?.totalCases ?? 0}
          icon={<ListChecks className="w-5 h-5 text-accent-primary" />}
          isLoading={metricsLoading}
          linkTo={buildUrl('cases')}
        />
        <MetricCard
          title="Test Sets"
          value={metrics?.totalSets ?? 0}
          icon={<Package className="w-5 h-5 text-text-secondary" />}
          isLoading={metricsLoading}
          linkTo={buildUrl('sets')}
        />
        <MetricCard
          title="Active Cycles"
          value={metrics?.activeCycles ?? 0}
          icon={<RefreshCcw className="w-5 h-5 text-status-info" />}
          isLoading={metricsLoading}
          linkTo={buildUrl('cycles', 'status=active')}
        />
        <MetricCard
          title="Pass Rate"
          value={`${metrics?.passRate ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5 text-status-success" />}
          trend={metrics && metrics.passed > 0 ? `${metrics.passed} passed` : undefined}
          trendUp={true}
          isLoading={metricsLoading}
          linkTo={buildUrl('executions', 'status=passed')}
        />
        <MetricCard
          title="Failed"
          value={metrics?.failed ?? 0}
          icon={<XCircle className="w-5 h-5 text-status-error" />}
          isLoading={metricsLoading}
          linkTo={buildUrl('executions', 'status=failed')}
        />
        <MetricCard
          title="Blocked"
          value={metrics?.blocked ?? 0}
          icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
          isLoading={metricsLoading}
          linkTo={buildUrl('executions', 'status=blocked')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Cycle Progress */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-text-primary">
                Active Cycle Progress
              </CardTitle>
              <Link 
                to={buildUrl('cycles')}
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
            ) : activeCycles.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active cycles</p>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => navigate(buildUrl('cycles'))}
                  className="mt-2"
                >
                  Create a test cycle
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCycles.map((cycle: any) => (
                  <Link 
                    key={cycle.id} 
                    to={buildUrl('cycles', `cycleId=${cycle.id}`)}
                    className="block p-3 rounded-lg hover:bg-surface-3 transition-colors"
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
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to={buildUrl('cases')}
                className="flex items-center gap-3 p-4 bg-surface-3 rounded-lg hover:bg-surface-4 transition-colors"
              >
                <ListChecks className="h-5 w-5 text-accent-primary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Test Cases</p>
                  <p className="text-xs text-text-tertiary">Manage test library</p>
                </div>
              </Link>
              <Link
                to={buildUrl('cycles')}
                className="flex items-center gap-3 p-4 bg-surface-3 rounded-lg hover:bg-surface-4 transition-colors"
              >
                <RefreshCcw className="h-5 w-5 text-status-info" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Test Cycles</p>
                  <p className="text-xs text-text-tertiary">Plan & execute</p>
                </div>
              </Link>
              <Link
                to={buildUrl('executions')}
                className="flex items-center gap-3 p-4 bg-surface-3 rounded-lg hover:bg-surface-4 transition-colors"
              >
                <Play className="h-5 w-5 text-status-success" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Executions</p>
                  <p className="text-xs text-text-tertiary">Run & record</p>
                </div>
              </Link>
              <Link
                to={buildUrl('reports')}
                className="flex items-center gap-3 p-4 bg-surface-3 rounded-lg hover:bg-surface-4 transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-status-warning" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Reports</p>
                  <p className="text-xs text-text-tertiary">Analytics & insights</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Tests Modal */}
      <RunTestsModal 
        open={runTestsOpen} 
        onOpenChange={setRunTestsOpen}
        projectId={scopeType === 'project' ? scopeId || '' : ''}
      />
    </div>
  );
}

export default GlobalTestsOverviewPage;
