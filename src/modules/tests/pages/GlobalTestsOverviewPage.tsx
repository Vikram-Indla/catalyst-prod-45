/**
 * GLOBAL TESTS OVERVIEW PAGE - RELEASE RISK COMMAND CENTER
 * Enterprise-grade decision-enforcing system for CIOs, QA Heads, and Release Managers
 * Declares BLOCKED / AT RISK / READY in under 3 seconds
 */

import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  XCircle, 
  AlertTriangle,
  CheckCircle2,
  Play,
  ChevronRight,
  RefreshCw,
  Target,
  Clock,
  User,
  ExternalLink,
  Ban,
  ShieldAlert,
  Shield,
  Activity,
  Zap,
  ArrowRight,
  Bug,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestMetrics, useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { useRecentTestActivity } from '../hooks/useRecentTestActivity';
import { useStoryCoverage } from '../hooks/useStoryCoverage';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { RunTestsModal } from '../components/RunTestsModal';

// ═══════════════════════════════════════════════════════════════════
// RELEASE STATUS TYPES
// ═══════════════════════════════════════════════════════════════════

type ReleaseStatus = 'BLOCKED' | 'AT_RISK' | 'READY';

interface BlockerCause {
  id: string;
  type: 'failed' | 'blocked' | 'coverage' | 'defect';
  title: string;
  count: number;
  severity: 'critical' | 'high' | 'medium';
  navigateTo: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════
// RELEASE STATUS BANNER - THE VERDICT
// ═══════════════════════════════════════════════════════════════════

function ReleaseStatusBanner({ 
  status, 
  blockerCount,
  failedCount,
  isLoading 
}: { 
  status: ReleaseStatus; 
  blockerCount: number;
  failedCount: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="w-full bg-surface-2 border-b border-border-default p-6">
        <Skeleton className="h-12 w-64 mx-auto" />
      </div>
    );
  }

  const configs = {
    BLOCKED: {
      bg: 'bg-danger/10 dark:bg-danger/20',
      border: 'border-danger/30',
      icon: <Ban className="h-8 w-8 text-danger" />,
      label: 'RELEASE BLOCKED',
      sublabel: `${blockerCount + failedCount} critical issues must be resolved`,
      textColor: 'text-danger',
      pulse: true,
    },
    AT_RISK: {
      bg: 'bg-warning/10 dark:bg-warning/20',
      border: 'border-warning/30',
      icon: <ShieldAlert className="h-8 w-8 text-warning" />,
      label: 'AT RISK',
      sublabel: 'Issues detected that may impact release timeline',
      textColor: 'text-warning',
      pulse: false,
    },
    READY: {
      bg: 'bg-success/10 dark:bg-success/20',
      border: 'border-success/30',
      icon: <Shield className="h-8 w-8 text-success" />,
      label: 'READY FOR RELEASE',
      sublabel: 'All checks passed, no blocking issues',
      textColor: 'text-success',
      pulse: false,
    },
  };

  const config = configs[status];

  return (
    <div className={cn(
      'w-full border-b py-4 px-6',
      config.bg,
      config.border,
    )}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className={cn(config.pulse && 'animate-pulse')}>
            {config.icon}
          </div>
          <div>
            <h1 className={cn(
              'text-2xl font-bold tracking-tight',
              config.textColor
            )}>
              {config.label}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {config.sublabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-mono">
            Last updated: {format(new Date(), 'HH:mm:ss')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BLOCKER CAUSE STACK - WHAT'S STOPPING US
// ═══════════════════════════════════════════════════════════════════

function BlockerCauseStack({ 
  causes, 
  isLoading,
  onNavigate 
}: { 
  causes: BlockerCause[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 px-6 py-4 bg-surface-0 border-b border-border-default">
        {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (causes.length === 0) return null;

  const severityStyles = {
    critical: 'bg-danger/5 border-l-danger hover:bg-danger/10',
    high: 'bg-warning/5 border-l-warning hover:bg-warning/10',
    medium: 'bg-info/5 border-l-info hover:bg-info/10',
  };

  const severityIcons = {
    critical: <XCircle className="h-4 w-4 text-danger" />,
    high: <AlertTriangle className="h-4 w-4 text-warning" />,
    medium: <Target className="h-4 w-4 text-info" />,
  };

  return (
    <div className="bg-surface-0 border-b border-border-default">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Blocking Causes ({causes.length})
        </div>
        <div className="space-y-1.5">
          {causes.map(cause => (
            <button
              key={cause.id}
              onClick={() => onNavigate(cause.navigateTo)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded border-l-4 transition-all text-left',
                severityStyles[cause.severity]
              )}
            >
              {severityIcons[cause.severity]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-text-primary">
                    {cause.count}
                  </span>
                  <span className="text-sm text-text-primary">
                    {cause.title}
                  </span>
                </div>
                <p className="text-xs text-text-muted truncate">
                  {cause.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION PRESSURE STRIP - THE NUMBERS
// ═══════════════════════════════════════════════════════════════════

function ExecutionPressureStrip({
  metrics,
  coverage,
  isLoading,
  onNavigate,
}: {
  metrics: {
    totalCases: number;
    passed: number;
    failed: number;
    blocked: number;
    notRun: number;
    passRate: number;
  } | null;
  coverage: { uncoveredCount: number; coveragePercent: number } | null;
  isLoading: boolean;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-surface-1 border-b border-border-default">
        <div className="max-w-7xl mx-auto px-6 py-4 flex gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-12 w-24" />
          ))}
        </div>
      </div>
    );
  }

  const totalExecuted = (metrics?.passed || 0) + (metrics?.failed || 0) + (metrics?.blocked || 0);
  const totalPending = metrics?.notRun || 0;
  const executionRate = totalExecuted + totalPending > 0 
    ? Math.round((totalExecuted / (totalExecuted + totalPending)) * 100) 
    : 0;

  const strips = [
    {
      label: 'EXECUTED',
      value: `${executionRate}%`,
      sublabel: `${totalExecuted} of ${totalExecuted + totalPending}`,
      color: executionRate >= 80 ? 'text-success' : executionRate >= 50 ? 'text-warning' : 'text-danger',
      path: 'executions',
    },
    {
      label: 'PASSED',
      value: metrics?.passed || 0,
      sublabel: `${metrics?.passRate || 0}% pass rate`,
      color: 'text-success',
      path: 'executions?status=passed',
    },
    {
      label: 'FAILED',
      value: metrics?.failed || 0,
      sublabel: 'require attention',
      color: (metrics?.failed || 0) > 0 ? 'text-danger font-bold' : 'text-text-muted',
      path: 'executions?status=failed',
      critical: (metrics?.failed || 0) > 0,
    },
    {
      label: 'BLOCKED',
      value: metrics?.blocked || 0,
      sublabel: 'awaiting deps',
      color: (metrics?.blocked || 0) > 0 ? 'text-warning font-bold' : 'text-text-muted',
      path: 'executions?status=blocked',
      critical: (metrics?.blocked || 0) > 0,
    },
    {
      label: 'UNCOVERED',
      value: coverage?.uncoveredCount || 0,
      sublabel: 'stories at risk',
      color: (coverage?.uncoveredCount || 0) > 0 ? 'text-warning' : 'text-text-muted',
      path: 'traceability',
    },
    {
      label: 'COVERAGE',
      value: `${coverage?.coveragePercent || 0}%`,
      sublabel: 'requirements mapped',
      color: (coverage?.coveragePercent || 0) >= 80 ? 'text-success' : (coverage?.coveragePercent || 0) >= 50 ? 'text-warning' : 'text-danger',
      path: 'traceability',
    },
  ];

  return (
    <div className="bg-surface-1 border-b border-border-default overflow-x-auto">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-stretch gap-1 min-w-max">
          {strips.map((strip, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(strip.path)}
              className={cn(
                'flex-1 min-w-[100px] px-4 py-2 text-left rounded transition-colors',
                'hover:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-border-focus',
                strip.critical && 'bg-surface-2'
              )}
            >
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {strip.label}
              </div>
              <div className={cn('text-xl font-bold tabular-nums', strip.color)}>
                {strip.value}
              </div>
              <div className="text-[10px] text-text-muted truncate">
                {strip.sublabel}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION ROW - FAILING/RUNNING EXECUTIONS
// ═══════════════════════════════════════════════════════════════════

function ExecutionRow({ 
  cycle, 
  onNavigate 
}: { 
  cycle: any;
  onNavigate: (path: string) => void;
}) {
  const execs = cycle.test_cycle_executions || [];
  const total = execs.length;
  const passed = execs.filter((e: any) => e.status === 'passed').length;
  const failed = execs.filter((e: any) => e.status === 'failed').length;
  const blocked = execs.filter((e: any) => e.status === 'blocked').length;
  const pending = total - passed - failed - blocked;
  const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;

  const getStatusBadge = () => {
    if (failed > 0) return <Badge variant="destructive" className="text-[10px] px-1.5">FAILING</Badge>;
    if (blocked > 0) return <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5">BLOCKED</Badge>;
    if (pending > 0) return <Badge variant="secondary" className="text-[10px] px-1.5">IN PROGRESS</Badge>;
    return <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-1.5">COMPLETE</Badge>;
  };

  return (
    <button
      onClick={() => onNavigate(`cycles/${cycle.id}/execution`)}
      className="w-full flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors border-b border-border-subtle text-left"
    >
      <div className="flex-shrink-0">
        {failed > 0 ? (
          <XCircle className="h-5 w-5 text-danger" />
        ) : blocked > 0 ? (
          <AlertTriangle className="h-5 w-5 text-warning" />
        ) : pending > 0 ? (
          <Clock className="h-5 w-5 text-info" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-success" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary truncate">
            {cycle.name}
          </span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          <span className="text-success">{passed} passed</span>
          {failed > 0 && <span className="text-danger font-semibold">{failed} failed</span>}
          {blocked > 0 && <span className="text-warning">{blocked} blocked</span>}
          <span>{pending} pending</span>
        </div>
      </div>
      <div className="flex-shrink-0 w-20 text-right">
        <div className="text-sm font-bold text-text-primary">{progress}%</div>
        <div className="w-full h-1.5 bg-surface-3 rounded-full mt-1 overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all',
              failed > 0 ? 'bg-danger' : blocked > 0 ? 'bg-warning' : 'bg-success'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNTABILITY ITEM - WHO IS RESPONSIBLE
// ═══════════════════════════════════════════════════════════════════

function AccountabilityItem({ 
  activity,
  onNavigate,
}: { 
  activity: any;
  onNavigate: (path: string) => void;
}) {
  const getIcon = () => {
    switch (activity.activity_type) {
      case 'execution_failed':
        return <XCircle className="h-4 w-4 text-danger" />;
      case 'execution_completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'test_case_created':
        return <Zap className="h-4 w-4 text-info" />;
      default:
        return <Activity className="h-4 w-4 text-text-muted" />;
    }
  };

  const getAction = () => {
    switch (activity.activity_type) {
      case 'execution_failed': return 'failed';
      case 'execution_completed': return 'completed';
      case 'test_case_created': return 'created';
      case 'test_case_updated': return 'updated';
      case 'cycle_created': return 'started cycle';
      default: return 'modified';
    }
  };

  return (
    <button
      onClick={() => {
        if (activity.entity_type === 'test_case') {
          onNavigate(`cases?caseId=${activity.entity_id}`);
        } else if (activity.entity_type === 'test_cycle') {
          onNavigate(`cycles?cycleId=${activity.entity_id}`);
        }
      }}
      className="w-full flex items-start gap-3 p-3 hover:bg-surface-2 transition-colors border-b border-border-subtle text-left"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">
          <span className="font-medium">{activity.user_name}</span>
          <span className="text-text-muted"> {getAction()} </span>
          <span className="font-medium">{activity.entity_title}</span>
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>
    </button>
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
        if (k && v) params.set(k, v);
      });
    }
    return `${base}?${params.toString()}`;
  };

  const handleNavigate = (path: string) => {
    navigate(buildUrl(path));
  };

  // Fetch data
  const { metrics, isLoading: metricsLoading, refetch } = useGlobalTestMetrics(scopeType, scopeId);
  const { data: cycles, isLoading: cyclesLoading } = useGlobalTestCycles(scopeType, scopeId);
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity(scopeType, scopeId, 10);
  const { data: coverage, isLoading: coverageLoading } = useStoryCoverage(scopeType, scopeId);

  const isLoading = metricsLoading || cyclesLoading || coverageLoading;

  // Determine release status
  const determineReleaseStatus = (): ReleaseStatus => {
    if (!metrics) return 'READY';
    
    // BLOCKED: Any failed tests or critical blockers
    if ((metrics.failed || 0) > 0) return 'BLOCKED';
    if ((metrics.blocked || 0) > 3) return 'BLOCKED';
    
    // AT RISK: Low coverage, some blockers, or low pass rate
    if ((metrics.blocked || 0) > 0) return 'AT_RISK';
    if ((coverage?.coveragePercent || 0) < 50) return 'AT_RISK';
    if ((metrics.passRate || 0) < 80) return 'AT_RISK';
    if ((coverage?.uncoveredCount || 0) > 10) return 'AT_RISK';
    
    return 'READY';
  };

  const releaseStatus = determineReleaseStatus();

  // Build blocker causes
  const blockerCauses: BlockerCause[] = [];
  
  if ((metrics?.failed || 0) > 0) {
    blockerCauses.push({
      id: 'failed',
      type: 'failed',
      title: 'Failed Test Executions',
      count: metrics?.failed || 0,
      severity: 'critical',
      navigateTo: 'executions?status=failed',
      description: 'Tests that failed during execution and require immediate attention',
    });
  }
  
  if ((metrics?.blocked || 0) > 0) {
    blockerCauses.push({
      id: 'blocked',
      type: 'blocked',
      title: 'Blocked Test Executions',
      count: metrics?.blocked || 0,
      severity: (metrics?.blocked || 0) > 3 ? 'critical' : 'high',
      navigateTo: 'executions?status=blocked',
      description: 'Tests blocked by dependencies or environment issues',
    });
  }
  
  if ((coverage?.uncoveredCount || 0) > 0) {
    blockerCauses.push({
      id: 'coverage',
      type: 'coverage',
      title: 'Stories Without Test Coverage',
      count: coverage?.uncoveredCount || 0,
      severity: (coverage?.uncoveredCount || 0) > 10 ? 'high' : 'medium',
      navigateTo: 'traceability',
      description: 'User stories that have no linked test cases',
    });
  }

  // Process cycles - prioritize failing/blocked ones
  const sortedCycles = (cycles || [])
    .filter((c: any) => ['active', 'in_progress'].includes(c.status))
    .map((cycle: any) => {
      const execs = cycle.test_cycle_executions || [];
      const failed = execs.filter((e: any) => e.status === 'failed').length;
      const blocked = execs.filter((e: any) => e.status === 'blocked').length;
      return { ...cycle, _failed: failed, _blocked: blocked };
    })
    .sort((a: any, b: any) => {
      // Sort by failed first, then blocked
      if (a._failed !== b._failed) return b._failed - a._failed;
      return b._blocked - a._blocked;
    })
    .slice(0, 8);

  return (
    <div className="flex flex-col h-full -m-6">
      {/* DOMINANT RELEASE STATUS BANNER */}
      <ReleaseStatusBanner 
        status={releaseStatus}
        blockerCount={metrics?.blocked || 0}
        failedCount={metrics?.failed || 0}
        isLoading={isLoading}
      />

      {/* BLOCKER CAUSE STACK */}
      <BlockerCauseStack 
        causes={blockerCauses}
        isLoading={isLoading}
        onNavigate={handleNavigate}
      />

      {/* EXECUTION PRESSURE STRIP */}
      <ExecutionPressureStrip
        metrics={metrics}
        coverage={coverage || null}
        isLoading={isLoading}
        onNavigate={handleNavigate}
      />

      {/* ACTION BAR */}
      <div className="bg-surface-0 border-b border-border-default">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="font-medium text-text-primary">
              {scopeType === 'global' ? 'All Projects' : scopeType === 'program' ? 'Program' : 'Project'}
            </span>
            <span>•</span>
            <span>{metrics?.totalCases ?? 0} test cases</span>
            <span>•</span>
            <span>{metrics?.activeCycles ?? 0} active cycles</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setRunTestsOpen(true)}
              className="gap-1.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground"
            >
              <Play className="h-3.5 w-3.5" />
              Run Tests
            </Button>
          </div>
        </div>
      </div>

      {/* ACCOUNTABILITY SPLIT VIEW */}
      <div className="flex-1 overflow-hidden bg-surface-1">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-x divide-border-default">
            
            {/* LEFT: Failing / Running Executions */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-6 py-3 bg-surface-0 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    Active Executions
                  </h2>
                  {sortedCycles.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {sortedCycles.length}
                    </Badge>
                  )}
                </div>
                <Link
                  to={buildUrl('cycles')}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                >
                  All cycles
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto bg-surface-0">
                {cyclesLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : sortedCycles.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-text-muted text-sm mb-3">
                      No active test cycles
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigate('cycles')}
                      className="gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Create Cycle
                    </Button>
                  </div>
                ) : (
                  sortedCycles.map((cycle: any) => (
                    <ExecutionRow 
                      key={cycle.id} 
                      cycle={cycle} 
                      onNavigate={handleNavigate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: Human Activity & Responsibility */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-6 py-3 bg-surface-0 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    Team Activity
                  </h2>
                </div>
                <Link
                  to={buildUrl('reports')}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                >
                  Full report
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto bg-surface-0">
                {activitiesLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !activities?.length ? (
                  <div className="p-6 text-center">
                    <div className="text-text-muted text-sm">
                      No recent activity
                    </div>
                  </div>
                ) : (
                  activities.map((activity: any) => (
                    <AccountabilityItem
                      key={activity.id}
                      activity={activity}
                      onNavigate={handleNavigate}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
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
