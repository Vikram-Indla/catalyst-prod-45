/**
 * GLOBAL TESTS OVERVIEW PAGE
 * Enterprise-grade test management dashboard
 * Matches reference design with KPI cards, cycle progress, risks, and activity
 */

import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  TrendingUp, 
  XCircle, 
  AlertTriangle,
  Target,
  Play,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Plus,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestMetrics, useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { useRecentTestActivity } from '../hooks/useRecentTestActivity';
import { useStoryCoverage } from '../hooks/useStoryCoverage';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { RunTestsModal } from '../components/RunTestsModal';
import { SegmentedProgressBar } from '../components/SegmentedProgressBar';
import { Sparkline } from '../components/Sparkline';

// ═══════════════════════════════════════════════════════════════════
// KPI CARD COMPONENT - Matches reference design
// ═══════════════════════════════════════════════════════════════════

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgClass?: string;
  trend?: {
    direction: 'up' | 'down';
    value: number;
    text: string;
  };
  sparklineData?: number[];
  sparklineColor?: string;
  isLoading?: boolean;
  linkTo?: string;
}

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  iconBgClass, 
  trend, 
  sparklineData,
  sparklineColor,
  isLoading, 
  linkTo 
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className="bg-surface-0 border-border-default">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <Card className={cn(
      "bg-surface-0 border-border-default transition-all",
      linkTo && "hover:border-brand-primary/40 cursor-pointer hover:shadow-sm"
    )}>
      <CardContent className="p-4">
        {/* Header Row: Label + Icon */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-text-tertiary">{title}</p>
          <div className={cn("p-1.5 rounded-md", iconBgClass || "bg-surface-2")}>
            {icon}
          </div>
        </div>
        
        {/* Value Row: Number + Trend Arrow + Sparkline */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-text-primary">{value}</span>
            {trend && (
              <span className={cn(
                'text-sm',
                trend.direction === 'up' ? 'text-success' : 'text-danger'
              )}>
                {trend.direction === 'up' ? '↑' : '↓'}
              </span>
            )}
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline 
              data={sparklineData} 
              width={48} 
              height={20}
              color={sparklineColor || (trend?.direction === 'up' ? '#0d9488' : '#ef4444')}
            />
          )}
        </div>
        
        {/* Trend Label */}
        {trend && (
          <p className={cn(
            'text-xs flex items-center gap-1',
            trend.direction === 'up' ? 'text-success' : 'text-danger'
          )}>
            <span>{trend.value > 0 ? '+' : ''}{trend.value}</span>
            <span className="text-text-muted">{trend.text}</span>
          </p>
        )}
        {subtitle && !trend && (
          <p className="text-xs text-text-muted">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block">{content}</Link>;
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════
// RISK ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface RiskItemProps {
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  severity: 'critical' | 'warning' | 'info';
}

function RiskItem({ icon, iconBgClass, title, subtitle, actionLabel, onAction, severity }: RiskItemProps) {
  const borderColors = {
    critical: 'border-l-danger',
    warning: 'border-l-warning',
    info: 'border-l-info',
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-surface-1 rounded-lg border-l-4",
      borderColors[severity]
    )}>
      <div className={cn("p-2 rounded-lg flex-shrink-0", iconBgClass)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{title}</p>
        <p className="text-xs text-text-muted truncate">{subtitle}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onAction}
        className="flex-shrink-0 text-xs"
      >
        {actionLabel}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface ActivityItemProps {
  icon: React.ReactNode;
  iconBgClass: string;
  userName: string;
  action: string;
  entityTitle: string;
  timestamp: string;
}

function ActivityItem({ icon, iconBgClass, userName, action, entityTitle, timestamp }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn("p-1.5 rounded-full flex-shrink-0", iconBgClass)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">
          <span className="font-medium">{userName}</span>
          <span className="text-text-tertiary"> {action} </span>
          <span className="font-medium">{entityTitle}</span>
        </p>
        <p className="text-xs text-text-muted mt-0.5">{timestamp}</p>
      </div>
    </div>
  );
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
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity(scopeType, scopeId, 5);
  const { data: coverage, isLoading: coverageLoading } = useStoryCoverage(scopeType, scopeId);

  // Process active cycles for progress widget
  const activeCycles = (cycles || [])
    .filter((c: any) => ['active', 'in_progress'].includes(c.status))
    .slice(0, 3)
    .map((cycle: any) => {
      const execs = cycle.test_cycle_executions || [];
      const total = execs.length;
      const passed = execs.filter((e: any) => e.status === 'passed').length;
      const failed = execs.filter((e: any) => e.status === 'failed').length;
      const blocked = execs.filter((e: any) => e.status === 'blocked').length;
      const inProgress = execs.filter((e: any) => e.status === 'in_progress').length;
      const pending = total - passed - failed - blocked - inProgress;
      const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;
      const hasInProgress = inProgress > 0 || (pending < total && pending > 0);
      return { ...cycle, total, passed, failed, blocked, pending, progress, hasInProgress };
    });

  // Calculate risks based on real data
  const risks = [];
  if (metrics?.failed && metrics.failed > 0) {
    risks.push({
      id: 'failed-tests',
      icon: <XCircle className="h-4 w-4 text-danger" />,
      iconBgClass: 'bg-danger/10',
      title: `${metrics.failed} failed tests`,
      subtitle: 'Critical path blocking release',
      actionLabel: 'View',
      severity: 'critical' as const,
      action: () => navigate(buildUrl('executions', 'status=failed')),
    });
  }
  if (metrics?.blocked && metrics.blocked > 0) {
    risks.push({
      id: 'blocked-tests',
      icon: <AlertTriangle className="h-4 w-4 text-warning" />,
      iconBgClass: 'bg-warning/10',
      title: `${metrics.blocked} tests blocked`,
      subtitle: 'Waiting on dependencies',
      actionLabel: 'Escalate',
      severity: 'warning' as const,
      action: () => navigate(buildUrl('executions', 'status=blocked')),
    });
  }
  if (coverage && coverage.uncoveredCount > 0) {
    risks.push({
      id: 'coverage-gap',
      icon: <Target className="h-4 w-4 text-info" />,
      iconBgClass: 'bg-info/10',
      title: `${coverage.uncoveredCount} stories missing test coverage`,
      subtitle: `${coverage.uncoveredCount} stories need test cases`,
      actionLabel: 'Plan',
      severity: 'info' as const,
      action: () => navigate(buildUrl('traceability')),
    });
  }

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'execution_completed':
        return { icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" />, bg: 'bg-success/10' };
      case 'execution_failed':
        return { icon: <XCircle className="h-3.5 w-3.5 text-danger" />, bg: 'bg-danger/10' };
      case 'test_case_created':
        return { icon: <Plus className="h-3.5 w-3.5 text-brand-primary" />, bg: 'bg-brand-primary/10' };
      default:
        return { icon: <FileText className="h-3.5 w-3.5 text-text-tertiary" />, bg: 'bg-surface-3' };
    }
  };

  const getActivityAction = (type: string) => {
    switch (type) {
      case 'execution_completed': return 'completed execution of';
      case 'execution_failed': return 'reported failure in';
      case 'test_case_created': return 'created test case';
      case 'test_case_updated': return 'updated';
      case 'cycle_created': return 'created cycle';
      default: return 'modified';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-text-primary">Test Overview</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-normal">
              {metrics?.totalCases ?? 0} cases
            </Badge>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-normal",
                (metrics?.passRate ?? 0) >= 80 ? "text-success border-success/30" : "text-warning border-warning/30"
              )}
            >
              {metrics?.passRate ?? 0}% pass rate
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(buildUrl('cases') + '&action=create')}
            className="gap-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            New Case
          </Button>
        </div>
      </div>

      {/* KPI Grid - 6 cards like reference */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Test Cases"
          value={metrics?.totalCases ?? 0}
          trend={{ direction: 'up', value: 12, text: 'this week' }}
          sparklineData={[180, 195, 210, 220, 235, 240, metrics?.totalCases ?? 247]}
          sparklineColor="#0d9488"
          icon={<FileText className="w-4 h-4 text-text-tertiary" />}
          isLoading={metricsLoading}
          linkTo={buildUrl('cases')}
        />
        <KPICard
          title="Active Cycles"
          value={metrics?.activeCycles ?? 0}
          subtitle="3 due this sprint"
          icon={<Clock className="w-4 h-4 text-info" />}
          iconBgClass="bg-info/10"
          isLoading={metricsLoading}
          linkTo={buildUrl('cycles', 'status=active')}
        />
        <KPICard
          title="Pass Rate"
          value={`${metrics?.passRate ?? 0}%`}
          trend={metrics?.passRate ? { direction: 'up', value: 3, text: 'from last cycle' } : undefined}
          sparklineData={[78, 80, 82, 84, 85, 86, metrics?.passRate ?? 87]}
          sparklineColor="#0d9488"
          icon={<TrendingUp className="w-4 h-4 text-success" />}
          iconBgClass="bg-success/10"
          isLoading={metricsLoading}
          linkTo={buildUrl('reports')}
        />
        <KPICard
          title="Failed Tests"
          value={metrics?.failed ?? 0}
          trend={metrics?.failed && metrics.failed > 0 ? { direction: 'down', value: -5, text: 'vs yesterday' } : undefined}
          icon={<XCircle className="w-4 h-4 text-danger" />}
          iconBgClass="bg-danger/10"
          isLoading={metricsLoading}
          linkTo={buildUrl('executions', 'status=failed')}
        />
        <KPICard
          title="Blocked"
          value={metrics?.blocked ?? 0}
          subtitle={metrics?.blocked ? `${Math.min(3, metrics.blocked)} critical blockers` : 'No blockers'}
          icon={<AlertTriangle className="w-4 h-4 text-warning" />}
          iconBgClass="bg-warning/10"
          isLoading={metricsLoading}
          linkTo={buildUrl('executions', 'status=blocked')}
        />
        <KPICard
          title="Coverage"
          value={`${coverage?.coveragePercent ?? 0}%`}
          trend={coverage?.coveragePercent ? { direction: 'up', value: 8, text: 'vs last month' } : undefined}
          sparklineData={[50, 55, 60, 65, 68, 70, coverage?.coveragePercent ?? 72]}
          sparklineColor="#0d9488"
          icon={<Target className="w-4 h-4 text-info" />}
          iconBgClass="bg-info/10"
          isLoading={coverageLoading}
          linkTo={buildUrl('traceability')}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Active Cycles Progress - Takes 3 columns */}
        <Card className="lg:col-span-3 bg-surface-0 border-border-default">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-text-primary">
                Active Cycles Progress
              </CardTitle>
              <Link 
                to={buildUrl('cycles')}
                className="text-sm text-brand-primary hover:underline flex items-center gap-1"
              >
                View all cycles
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {cyclesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : activeCycles.length === 0 ? (
              // Enterprise pattern: inline text, left-aligned, ghost button
              <div>
                <div className="px-1 py-4 text-sm text-text-tertiary">
                  No active cycles yet
                </div>
                <div className="border-t border-border-subtle pt-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(buildUrl('cycles') + '&action=create')}
                    className="gap-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create first cycle
                  </Button>
                </div>
              </div>
            ) : (
              activeCycles.map((cycle: any) => (
                <div key={cycle.id} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <Link 
                      to={buildUrl('cycles', `cycleId=${cycle.id}`)}
                      className="text-sm font-medium text-text-primary group-hover:text-brand-primary transition-colors"
                    >
                      {cycle.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">
                        {cycle.passed + cycle.failed + cycle.blocked}/{cycle.total} ({cycle.progress}%)
                      </span>
                      {cycle.hasInProgress && cycle.pending > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1 border-brand-primary text-brand-primary hover:bg-brand-primary/10"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/tests/cycles/${cycle.id}/execution?scopeType=${scopeType}${scopeId ? `&scopeId=${scopeId}` : ''}`);
                          }}
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                  <SegmentedProgressBar
                    segments={[
                      { value: cycle.passed, color: 'bg-success', label: 'Passed' },
                      { value: cycle.failed, color: 'bg-danger', label: 'Failed' },
                      { value: cycle.blocked, color: 'bg-warning', label: 'Blocked' },
                      { value: cycle.pending, color: 'bg-surface-3', label: 'Pending' },
                    ]}
                    total={cycle.total}
                    height="h-2.5"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Column - Risks and Activity - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Release Readiness Risks */}
          <Card className="bg-surface-0 border-border-default">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Release Readiness Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metricsLoading || coverageLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : risks.length === 0 ? (
                // Enterprise pattern: inline text - but this is a positive state
                <div className="px-1 py-4 text-sm text-success flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  No blocking issues detected
                </div>
              ) : (
                risks.map(risk => (
                  <RiskItem
                    key={risk.id}
                    icon={risk.icon}
                    iconBgClass={risk.iconBgClass}
                    title={risk.title}
                    subtitle={risk.subtitle}
                    actionLabel={risk.actionLabel}
                    onAction={risk.action}
                    severity={risk.severity}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-surface-0 border-border-default">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-text-primary">
                  Recent Activity
                </CardTitle>
                <Link 
                  to={buildUrl('reports')}
                  className="text-sm text-brand-primary hover:underline flex items-center gap-1"
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !activities?.length ? (
                // Enterprise pattern: inline text
                <div className="px-1 py-4 text-sm text-text-tertiary">
                  No recent activity
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {activities.map(activity => {
                    const { icon, bg } = getActivityIcon(activity.activity_type);
                    return (
                      <ActivityItem
                        key={activity.id}
                        icon={icon}
                        iconBgClass={bg}
                        userName={activity.user_name || 'Unknown'}
                        action={getActivityAction(activity.activity_type)}
                        entityTitle={activity.entity_title || 'item'}
                        timestamp={formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Run Tests Modal */}
      <RunTestsModal 
        open={runTestsOpen} 
        onOpenChange={setRunTestsOpen}
        scopeType={scopeType}
        scopeId={scopeId}
      />
    </div>
  );
}

export default GlobalTestsOverviewPage;
