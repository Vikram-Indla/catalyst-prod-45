/**
 * GLOBAL TESTS OVERVIEW - EXECUTIVE QA CONTROL SURFACE
 * Catalyst-compliant, intimidating through precision + accountability
 * No gradients, no panic colors - severity via accent bars only
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
  Shield,
  Activity,
  FileText,
  Octagon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestMetrics, useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { useRecentTestActivity } from '../hooks/useRecentTestActivity';
import { useStoryCoverage } from '../hooks/useStoryCoverage';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { RunTestsModal } from '../components/RunTestsModal';

// ═══════════════════════════════════════════════════════════════════
// TYPES
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
  ctaLabel: string;
}

// ═══════════════════════════════════════════════════════════════════
// COMPACT STATUS HEADER - No gradients, accent bar only
// ═══════════════════════════════════════════════════════════════════

function CompactStatusHeader({ 
  status, 
  blockerCount,
  failedCount,
  isLoading,
  onOpenTriage,
  onRefresh,
  onReport,
}: { 
  status: ReleaseStatus; 
  blockerCount: number;
  failedCount: number;
  isLoading: boolean;
  onOpenTriage: () => void;
  onRefresh: () => void;
  onReport: () => void;
}) {
  if (isLoading) {
    return (
      <div className="border-b border-border-default bg-surface-0 px-6 py-4">
        <Skeleton className="h-12 w-full max-w-md" />
      </div>
    );
  }

  if (status === 'BLOCKED') {
    return (
      <div className="border-b border-border-default bg-surface-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            {/* Accent bar */}
            <div className="w-1 self-stretch bg-danger rounded-full" />
            
            {/* Icon */}
            <Octagon className="h-5 w-5 sm:h-6 sm:w-6 text-danger flex-shrink-0" strokeWidth={1.5} />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-danger uppercase tracking-wide">
                  Release Blocked
                </h1>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                <span className="font-mono">{failedCount} failed executions</span>
                <span className="mx-1.5">•</span>
                <span className="font-mono">{blockerCount} blocked</span>
                <span className="mx-1.5 hidden sm:inline">•</span>
                <span className="text-text-tertiary hidden sm:inline">Updated {format(new Date(), 'HH:mm')}</span>
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={onOpenTriage}
                className="h-8 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground"
              >
                Open Triage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReport}
                className="h-8 hidden sm:flex gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Report
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-text-muted hover:text-text-primary"
                  >
                    Escalate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Requires escalation permissions</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'AT_RISK') {
    return (
      <div className="border-b border-border-default bg-surface-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            {/* Accent bar */}
            <div className="w-1 self-stretch bg-warning rounded-full" />
            
            {/* Icon */}
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-warning flex-shrink-0" strokeWidth={1.5} />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-warning uppercase tracking-wide">
                  Release At Risk
                </h1>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                <span className="font-mono">{blockerCount} blocked tests</span>
                <span className="mx-1.5 hidden sm:inline">•</span>
                <span className="text-text-tertiary hidden sm:inline">Updated {format(new Date(), 'HH:mm')}</span>
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={onOpenTriage}
                className="h-8 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground"
              >
                Open Triage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // READY state
  return (
    <div className="border-b border-border-default bg-surface-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-4">
          {/* Accent bar */}
          <div className="w-1 self-stretch bg-success rounded-full" />
          
          {/* Icon */}
          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-success flex-shrink-0" strokeWidth={1.5} />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-success uppercase tracking-wide">
              Ready for Release
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              All checks passed
              <span className="mx-1.5 hidden sm:inline">•</span>
              <span className="text-text-tertiary hidden sm:inline">Updated {format(new Date(), 'HH:mm')}</span>
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BLOCKING ISSUES CARDS - Neutral cards, accent bar only
// ═══════════════════════════════════════════════════════════════════

function BlockingIssuesCards({ 
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
      <div className="border-b border-border-default bg-surface-0 px-6 py-4">
        <div className="max-w-7xl mx-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (causes.length === 0) return null;

  const getAccentColor = (severity: 'critical' | 'high' | 'medium') => {
    switch (severity) {
      case 'critical': return 'bg-danger';
      case 'high': return 'bg-warning';
      case 'medium': return 'bg-info';
    }
  };

  const getIconColor = (severity: 'critical' | 'high' | 'medium') => {
    switch (severity) {
      case 'critical': return 'text-danger';
      case 'high': return 'text-warning';
      case 'medium': return 'text-info';
    }
  };

  const getIcon = (type: string, severity: 'critical' | 'high' | 'medium') => {
    const iconClass = cn('h-5 w-5', getIconColor(severity));
    switch (type) {
      case 'failed': return <XCircle className={iconClass} strokeWidth={1.5} />;
      case 'blocked': return <AlertTriangle className={iconClass} strokeWidth={1.5} />;
      case 'coverage': return <Target className={iconClass} strokeWidth={1.5} />;
      default: return <AlertTriangle className={iconClass} strokeWidth={1.5} />;
    }
  };

  return (
    <div className="border-b border-border-default bg-surface-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {causes.map(cause => (
            <button
              key={cause.id}
              onClick={() => onNavigate(cause.navigateTo)}
              className={cn(
                'w-full flex items-start gap-3 p-4 rounded-md text-left transition-all',
                'bg-surface-1 border border-border-default hover:bg-surface-2',
                'border-l-4',
                cause.severity === 'critical' && 'border-l-danger',
                cause.severity === 'high' && 'border-l-warning',
                cause.severity === 'medium' && 'border-l-info',
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(cause.type, cause.severity)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'text-lg font-bold tabular-nums',
                    getIconColor(cause.severity)
                  )}>
                    {cause.count}
                  </span>
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {cause.title}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1 line-clamp-1">
                  {cause.description}
                </p>
                <div className="mt-2 text-xs font-medium text-brand-primary flex items-center gap-1">
                  {cause.ctaLabel} ({cause.count})
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// METRICS STRIP - Neutral tiles, colored values only
// ═══════════════════════════════════════════════════════════════════

function MetricsStrip({
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
      <div className="border-b border-border-default bg-surface-0">
        <div className="max-w-7xl mx-auto px-6 py-3 flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 flex-1" />
          ))}
        </div>
      </div>
    );
  }

  const strips = [
    {
      label: 'FAILED',
      value: metrics?.failed || 0,
      color: (metrics?.failed || 0) > 0 ? 'text-danger' : 'text-text-muted',
      path: 'executions?status=failed',
    },
    {
      label: 'BLOCKED',
      value: metrics?.blocked || 0,
      color: (metrics?.blocked || 0) > 0 ? 'text-warning' : 'text-text-muted',
      path: 'executions?status=blocked',
    },
    {
      label: 'UNCOVERED',
      value: coverage?.uncoveredCount || 0,
      color: (coverage?.uncoveredCount || 0) > 0 ? 'text-warning' : 'text-text-muted',
      path: 'traceability',
    },
    {
      label: 'PASSED',
      value: metrics?.passed || 0,
      color: (metrics?.passed || 0) > 0 ? 'text-success' : 'text-text-muted',
      path: 'executions?status=passed',
    },
  ];

  return (
    <div className="border-b border-border-default bg-surface-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-stretch gap-1 overflow-x-auto">
          {strips.map((strip, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(strip.path)}
              className={cn(
                'flex-1 min-w-[80px] px-3 py-2 rounded transition-all text-center',
                'bg-surface-1 hover:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-border-focus',
              )}
            >
              <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                {strip.label}
              </div>
              <div className={cn('text-xl font-bold tabular-nums mt-0.5', strip.color)}>
                {strip.value}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION ROW - Clean, no alert backgrounds
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

  const isFailing = failed > 0;
  const isBlocked = blocked > 0 && !isFailing;

  return (
    <button
      onClick={() => onNavigate(`cycles/${cycle.id}/execution`)}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-border-subtle',
        'hover:bg-surface-2',
        // Accent bar via border-left
        isFailing && 'border-l-4 border-l-danger',
        isBlocked && 'border-l-4 border-l-warning',
        !isFailing && !isBlocked && 'border-l-4 border-l-transparent',
      )}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">
        {isFailing ? (
          <XCircle className="h-4 w-4 text-danger" strokeWidth={1.5} />
        ) : isBlocked ? (
          <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.5} />
        ) : pending > 0 ? (
          <Clock className="h-4 w-4 text-info" strokeWidth={1.5} />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />
        )}
      </div>
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary truncate">
            {cycle.name}
          </span>
          {isFailing && (
            <span className="text-[10px] font-semibold text-danger uppercase">
              FAILING
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted">
          <span>{total} tests</span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {cycle.owner_name || 'Unassigned'}
          </span>
          <span className="hidden sm:inline">
            Last run: {cycle.last_run_at ? formatDistanceToNow(new Date(cycle.last_run_at), { addSuffix: true }) : 'Never'}
          </span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
        {failed > 0 && <span className="text-danger font-semibold">{failed} failed</span>}
        {blocked > 0 && <span className="text-warning font-semibold">{blocked} blocked</span>}
        <span className="text-success">{passed} passed</span>
      </div>
      
      {/* Progress */}
      <div className="flex-shrink-0 w-14 text-right">
        <div className="text-xs font-semibold tabular-nums text-text-primary">
          {progress}%
        </div>
        <div className="w-full h-1 bg-surface-3 rounded-full mt-1 overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all',
              isFailing ? 'bg-danger' : isBlocked ? 'bg-warning' : 'bg-success'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0 hidden sm:block" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNTABILITY ITEM - No color emphasis, traceable changes
// ═══════════════════════════════════════════════════════════════════

function AccountabilityItem({ 
  activity,
  onNavigate,
}: { 
  activity: any;
  onNavigate: (path: string) => void;
}) {
  const getAction = () => {
    switch (activity.activity_type) {
      case 'execution_failed': return 'marked as failed';
      case 'execution_completed': return 'completed';
      case 'status_changed': return 'changed status';
      case 'case_updated': return 'updated';
      default: return 'modified';
    }
  };

  const getFieldChange = () => {
    if (activity.field_changed) {
      return `${activity.field_changed}: ${activity.old_value || '—'} → ${activity.new_value || '—'}`;
    }
    return null;
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
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-border-subtle hover:bg-surface-2"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Activity className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">
          <span className="font-medium">{activity.user_name}</span>
          <span className="text-text-muted mx-1">{getAction()}</span>
          <span className="font-medium">{activity.entity_title}</span>
        </p>
        {getFieldChange() && (
          <p className="text-[10px] text-text-muted mt-0.5 font-mono">
            {getFieldChange()}
          </p>
        )}
        <p className="text-[10px] text-text-tertiary mt-0.5">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>
      
      <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0 mt-1" />
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

  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'project';
  const scopeId = searchParams.get('scopeId');

  // Project-level enforcement
  const isProjectScope = scopeType === 'project' && !!scopeId;

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
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity(scopeType, scopeId, 15);
  const { data: coverage, isLoading: coverageLoading } = useStoryCoverage(scopeType, scopeId);

  const isLoading = metricsLoading || cyclesLoading || coverageLoading;

  // Determine release status
  const determineReleaseStatus = (): ReleaseStatus => {
    if (!metrics) return 'READY';
    if ((metrics.failed || 0) > 0) return 'BLOCKED';
    if ((metrics.blocked || 0) > 2) return 'BLOCKED';
    if ((metrics.blocked || 0) > 0) return 'AT_RISK';
    if ((coverage?.coveragePercent || 0) < 40) return 'AT_RISK';
    if ((metrics.passRate || 0) < 70) return 'AT_RISK';
    return 'READY';
  };

  const releaseStatus = determineReleaseStatus();

  // Build blocker causes
  const blockerCauses: BlockerCause[] = [];
  
  if ((metrics?.failed || 0) > 0) {
    blockerCauses.push({
      id: 'failed',
      type: 'failed',
      title: 'Failed Tests',
      count: metrics?.failed || 0,
      severity: 'critical',
      navigateTo: 'executions?status=failed',
      description: 'Critical failures blocking release',
      ctaLabel: 'View failed tests',
    });
  }
  
  if ((metrics?.blocked || 0) > 0) {
    blockerCauses.push({
      id: 'blocked',
      type: 'blocked',
      title: 'Blocked Tests',
      count: metrics?.blocked || 0,
      severity: (metrics?.blocked || 0) > 2 ? 'critical' : 'high',
      navigateTo: 'executions?status=blocked',
      description: 'Awaiting dependencies or environment',
      ctaLabel: 'View blocked tests',
    });
  }
  
  if ((coverage?.uncoveredCount || 0) > 5) {
    blockerCauses.push({
      id: 'coverage',
      type: 'coverage',
      title: 'Uncovered Stories',
      count: coverage?.uncoveredCount || 0,
      severity: (coverage?.uncoveredCount || 0) > 15 ? 'high' : 'medium',
      navigateTo: 'traceability',
      description: 'Requirements without test coverage',
      ctaLabel: 'View uncovered stories',
    });
  }

  // Sort cycles by failure severity
  const sortedCycles = (cycles || [])
    .filter((c: any) => ['active', 'in_progress'].includes(c.status))
    .map((cycle: any) => {
      const execs = cycle.test_cycle_executions || [];
      const failed = execs.filter((e: any) => e.status === 'failed').length;
      const blocked = execs.filter((e: any) => e.status === 'blocked').length;
      return { ...cycle, _failed: failed, _blocked: blocked };
    })
    .sort((a: any, b: any) => {
      if (a._failed !== b._failed) return b._failed - a._failed;
      return b._blocked - a._blocked;
    })
    .slice(0, 10);

  // Run button guardrails
  const canRun = isProjectScope && (metrics?.totalCases || 0) > 0;
  const runDisabledReason = !isProjectScope 
    ? 'Operational testing is available at Project scope' 
    : (metrics?.totalCases || 0) === 0 
    ? 'Create test cases and a cycle first' 
    : '';

  return (
    <div className="flex flex-col h-full -m-6">
      {/* COMPACT STATUS HEADER */}
      <CompactStatusHeader 
        status={releaseStatus}
        blockerCount={metrics?.blocked || 0}
        failedCount={metrics?.failed || 0}
        isLoading={isLoading}
        onOpenTriage={() => handleNavigate('executions?status=failed')}
        onRefresh={refetch}
        onReport={() => handleNavigate('reports')}
      />

      {/* BLOCKING ISSUES CARDS */}
      <BlockingIssuesCards 
        causes={blockerCauses}
        isLoading={isLoading}
        onNavigate={handleNavigate}
      />

      {/* METRICS STRIP */}
      <MetricsStrip
        metrics={metrics}
        coverage={coverage || null}
        isLoading={isLoading}
        onNavigate={handleNavigate}
      />

      {/* CONTEXT BAR */}
      <div className="border-b border-border-default bg-surface-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="font-medium text-text-primary">
              {scopeType === 'project' ? 'Project' : scopeType === 'program' ? 'Program' : 'All Projects'}
            </span>
            <span className="opacity-50">|</span>
            <span>{metrics?.totalCases ?? 0} cases</span>
            <span className="opacity-50 hidden sm:inline">|</span>
            <span className="hidden sm:inline">{metrics?.activeCycles ?? 0} active cycles</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-7 gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    onClick={() => setRunTestsOpen(true)}
                    disabled={!canRun}
                    className="h-7 gap-1.5 text-xs bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </Button>
                </span>
              </TooltipTrigger>
              {runDisabledReason && (
                <TooltipContent>{runDisabledReason}</TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </div>

      {/* SPLIT VIEW - Executions & Accountability */}
      <div className="flex-1 overflow-hidden bg-surface-1">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x divide-border-default">
            
            {/* LEFT: Active Executions */}
            <div className="flex flex-col min-h-[200px] lg:h-full overflow-hidden">
              <div className="px-4 py-3 border-b border-border-default bg-surface-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
                  <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                    Active Executions
                  </h2>
                  {sortedCycles.filter((c: any) => c._failed > 0).length > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-danger border-danger/30">
                      {sortedCycles.filter((c: any) => c._failed > 0).length} failing
                    </Badge>
                  )}
                </div>
                <Link
                  to={buildUrl('cycles')}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-0.5"
                >
                  View all
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto">
                {cyclesLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : sortedCycles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Activity className="h-8 w-8 text-text-muted mb-2" strokeWidth={1} />
                    <p className="text-sm text-text-muted">No active executions</p>
                    <p className="text-xs text-text-tertiary mt-1">Start a test run to see progress here</p>
                  </div>
                ) : (
                  <div>
                    {sortedCycles.map((cycle: any) => (
                      <ExecutionRow 
                        key={cycle.id} 
                        cycle={cycle} 
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Accountability */}
            <div className="flex flex-col min-h-[200px] lg:h-full overflow-hidden">
              <div className="px-4 py-3 border-b border-border-default bg-surface-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
                  <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                    Recent Changes
                  </h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {activitiesLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : !activities || activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Clock className="h-8 w-8 text-text-muted mb-2" strokeWidth={1} />
                    <p className="text-sm text-text-muted">No recent activity</p>
                    <p className="text-xs text-text-tertiary mt-1">Changes will appear here</p>
                  </div>
                ) : (
                  <div>
                    {activities.map((activity: any) => (
                      <AccountabilityItem 
                        key={activity.id} 
                        activity={activity} 
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RUN TESTS MODAL */}
      <RunTestsModal
        open={runTestsOpen}
        onOpenChange={setRunTestsOpen}
        projectId={scopeId || ''}
      />
    </div>
  );
}
