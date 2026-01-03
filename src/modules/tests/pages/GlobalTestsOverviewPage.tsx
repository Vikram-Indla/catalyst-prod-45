/**
 * GLOBAL TESTS OVERVIEW - RELEASE AUTHORITY CONTROL SURFACE
 * Executive-grade decision enforcement system
 * 9.5/10 intimidation score target
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
  Ban,
  ShieldAlert,
  Shield,
  Activity,
  ArrowRight,
  Octagon,
  AlertOctagon,
  Skull,
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
// RELEASE STATUS BANNER - SYSTEM STATE (40% taller, full pressure)
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
      <div className="w-full bg-surface-2 border-b border-border-default py-10">
        <Skeleton className="h-16 w-96 mx-auto" />
      </div>
    );
  }

  if (status === 'BLOCKED') {
    return (
      <div className="w-full bg-gradient-to-b from-[hsl(0,84%,8%)] via-[hsl(0,72%,12%)] to-[hsl(0,60%,15%)] dark:from-[hsl(0,84%,6%)] dark:via-[hsl(0,72%,9%)] dark:to-[hsl(0,60%,12%)] border-b-2 border-danger">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            <div className="flex-shrink-0 animate-pulse hidden sm:block">
              <Octagon className="h-10 w-10 sm:h-14 sm:w-14 text-danger fill-danger/20" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                <div className="flex items-center gap-2 sm:hidden">
                  <Octagon className="h-6 w-6 text-danger fill-danger/20 animate-pulse" strokeWidth={2.5} />
                  <Badge className="bg-danger text-danger-foreground text-[10px] font-bold px-2 py-0.5 animate-pulse">
                    BLOCKED
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-danger uppercase">
                  RELEASE CANNOT PROCEED
                </h1>
                <Badge className="hidden sm:inline-flex bg-danger text-danger-foreground text-xs font-bold px-2 py-0.5 animate-pulse">
                  BLOCKED
                </Badge>
              </div>
              <p className="text-sm sm:text-base text-danger/80 font-medium">
                Executive action required. Shipment is blocked by unresolved risk.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-danger/60">
                <span className="font-mono">{failedCount} failed</span>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono">{blockerCount} blocked</span>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono hidden md:inline">Updated {format(new Date(), 'HH:mm:ss')}</span>
              </div>
            </div>
            <div className="flex-shrink-0 sm:mt-0">
              <Button
                variant="destructive"
                size="default"
                className="w-full sm:w-auto font-bold uppercase tracking-wide text-sm sm:text-base"
              >
                Escalate Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'AT_RISK') {
    return (
      <div className="w-full bg-gradient-to-b from-[hsl(32,95%,8%)] via-[hsl(32,80%,12%)] to-[hsl(32,60%,15%)] dark:from-[hsl(32,95%,5%)] dark:via-[hsl(32,80%,8%)] dark:to-[hsl(32,60%,10%)] border-b-2 border-warning">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
            <div className="flex-shrink-0 hidden sm:block">
              <ShieldAlert className="h-10 w-10 sm:h-12 sm:w-12 text-warning" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-warning sm:hidden" strokeWidth={2} />
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-warning uppercase">
                    RELEASE AT RISK
                  </h1>
                </div>
                <Badge className="w-fit bg-warning/20 text-warning border border-warning/40 text-[10px] sm:text-xs font-semibold px-2 py-0.5">
                  CAUTION
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-warning/70 font-medium">
                Issues detected that may impact release timeline. Review required.
              </p>
            </div>
            <div className="text-[10px] sm:text-xs text-warning/50 font-mono">
              {format(new Date(), 'HH:mm:ss')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // READY state
  return (
    <div className="w-full bg-gradient-to-b from-[hsl(173,58%,8%)] to-[hsl(173,40%,12%)] dark:from-[hsl(173,58%,5%)] dark:to-[hsl(173,40%,8%)] border-b border-success/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-success" strokeWidth={2} />
          <div className="flex-1">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-success uppercase">
              READY FOR RELEASE
            </h1>
            <p className="text-xs sm:text-sm text-success/60">
              All checks passed. No blocking issues detected.
            </p>
          </div>
          <div className="text-[10px] sm:text-xs text-success/40 font-mono hidden sm:block">
            {format(new Date(), 'HH:mm:ss')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// THREAT CARDS - BLOCKING CAUSES (Thicker borders, dominant typography)
// ═══════════════════════════════════════════════════════════════════

function ThreatCards({ 
  causes, 
  isLoading,
  releaseStatus,
  onNavigate 
}: { 
  causes: BlockerCause[];
  isLoading: boolean;
  releaseStatus: ReleaseStatus;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="px-6 py-3 bg-surface-0">
        {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full mb-2" />)}
      </div>
    );
  }

  if (causes.length === 0) return null;

  const riskTint = releaseStatus === 'BLOCKED' ? 'bg-danger/[0.03]' : releaseStatus === 'AT_RISK' ? 'bg-warning/[0.02]' : '';

  return (
    <div className={cn('border-b', releaseStatus === 'BLOCKED' ? 'border-danger/20' : 'border-border-default', riskTint)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertOctagon className={cn(
            'h-3.5 w-3.5 sm:h-4 sm:w-4',
            releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-warning'
          )} />
          <span className={cn(
            'text-[10px] sm:text-xs font-bold uppercase tracking-wider',
            releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-warning'
          )}>
            {causes.length} Blocking {causes.length === 1 ? 'Issue' : 'Issues'}
          </span>
        </div>
        <div className="grid gap-2">
          {causes.map(cause => (
            <button
              key={cause.id}
              onClick={() => onNavigate(cause.navigateTo)}
              className={cn(
                'w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-md text-left transition-all',
                'border-l-4 sm:border-l-[6px]',
                cause.severity === 'critical' && 'bg-danger/10 border-l-danger hover:bg-danger/15 dark:bg-danger/[0.08]',
                cause.severity === 'high' && 'bg-warning/10 border-l-warning hover:bg-warning/15 dark:bg-warning/[0.08]',
                cause.severity === 'medium' && 'bg-info/10 border-l-info hover:bg-info/15 dark:bg-info/[0.08]',
              )}
            >
              <div className="flex items-center gap-3 sm:contents">
                <div className={cn(
                  'flex-shrink-0 p-1.5 sm:p-2 rounded',
                  cause.severity === 'critical' && 'bg-danger/20',
                  cause.severity === 'high' && 'bg-warning/20',
                  cause.severity === 'medium' && 'bg-info/20',
                )}>
                  {cause.severity === 'critical' ? (
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-danger" strokeWidth={2.5} />
                  ) : cause.severity === 'high' ? (
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-warning" strokeWidth={2.5} />
                  ) : (
                    <Target className="h-5 w-5 sm:h-6 sm:w-6 text-info" strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1 min-w-0 sm:hidden">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-xl font-black tabular-nums',
                      cause.severity === 'critical' && 'text-danger',
                      cause.severity === 'high' && 'text-warning',
                      cause.severity === 'medium' && 'text-info',
                    )}>
                      {cause.count}
                    </span>
                    <span className={cn(
                      'text-sm font-bold truncate',
                      cause.severity === 'critical' && 'text-danger',
                      cause.severity === 'high' && 'text-warning',
                      cause.severity === 'medium' && 'text-text-primary',
                    )}>
                      {cause.title}
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:block flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'text-2xl font-black tabular-nums',
                    cause.severity === 'critical' && 'text-danger',
                    cause.severity === 'high' && 'text-warning',
                    cause.severity === 'medium' && 'text-info',
                  )}>
                    {cause.count}
                  </span>
                  <span className={cn(
                    'text-base font-bold',
                    cause.severity === 'critical' && 'text-danger',
                    cause.severity === 'high' && 'text-warning',
                    cause.severity === 'medium' && 'text-text-primary',
                  )}>
                    {cause.title}
                    {cause.severity === 'critical' && ' — Blocking Release'}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 truncate">
                  {cause.description}
                </p>
              </div>
              <p className="text-[10px] text-text-muted sm:hidden pl-10">
                {cause.description}
              </p>
              <div className={cn(
                'flex-shrink-0 flex items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-bold uppercase self-end sm:self-auto',
                cause.severity === 'critical' && 'bg-danger text-danger-foreground',
                cause.severity === 'high' && 'bg-warning text-warning-foreground',
                cause.severity === 'medium' && 'bg-info/20 text-info',
              )}>
                Resolve
                <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// METRICS STRIP - FAILURE-DOMINANT HIERARCHY
// ═══════════════════════════════════════════════════════════════════

function MetricsStrip({
  metrics,
  coverage,
  releaseStatus,
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
  releaseStatus: ReleaseStatus;
  isLoading: boolean;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-surface-1 border-b border-border-default">
        <div className="max-w-7xl mx-auto px-6 py-3 flex gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-14 flex-1" />
          ))}
        </div>
      </div>
    );
  }

  const riskTint = releaseStatus === 'BLOCKED' ? 'bg-danger/[0.02]' : releaseStatus === 'AT_RISK' ? 'bg-warning/[0.01]' : '';
  const borderColor = releaseStatus === 'BLOCKED' ? 'border-danger/10' : releaseStatus === 'AT_RISK' ? 'border-warning/10' : 'border-border-default';

  const totalExecuted = (metrics?.passed || 0) + (metrics?.failed || 0) + (metrics?.blocked || 0);
  const totalPending = metrics?.notRun || 0;
  const executionRate = totalExecuted + totalPending > 0 
    ? Math.round((totalExecuted / (totalExecuted + totalPending)) * 100) 
    : 0;

  // FAILURE-DOMINANT ORDER: Failed → Blocked → Uncovered → Passed → Executed → Coverage
  const strips = [
    {
      label: 'FAILED',
      value: metrics?.failed || 0,
      sublabel: 'blocking release',
      isDanger: (metrics?.failed || 0) > 0,
      isWarning: false,
      isDominant: (metrics?.failed || 0) > 0,
      path: 'executions?status=failed',
    },
    {
      label: 'BLOCKED',
      value: metrics?.blocked || 0,
      sublabel: 'awaiting deps',
      isDanger: (metrics?.blocked || 0) > 3,
      isWarning: (metrics?.blocked || 0) > 0 && (metrics?.blocked || 0) <= 3,
      isDominant: (metrics?.blocked || 0) > 0,
      path: 'executions?status=blocked',
    },
    {
      label: 'UNCOVERED',
      value: coverage?.uncoveredCount || 0,
      sublabel: 'stories at risk',
      isDanger: false,
      isWarning: (coverage?.uncoveredCount || 0) > 5,
      isDominant: false,
      path: 'traceability',
    },
    {
      label: 'PASSED',
      value: metrics?.passed || 0,
      sublabel: `${metrics?.passRate || 0}% rate`,
      isDanger: false,
      isWarning: false,
      isDominant: false,
      isSecondary: releaseStatus !== 'READY', // De-emphasize when not ready
      path: 'executions?status=passed',
    },
    {
      label: 'EXECUTED',
      value: `${executionRate}%`,
      sublabel: `${totalExecuted}/${totalExecuted + totalPending}`,
      isDanger: false,
      isWarning: false,
      isDominant: false,
      isTertiary: true,
      path: 'executions',
    },
    {
      label: 'COVERAGE',
      value: `${coverage?.coveragePercent || 0}%`,
      sublabel: 'requirements',
      isDanger: false,
      isWarning: (coverage?.coveragePercent || 0) < 50,
      isDominant: false,
      isTertiary: releaseStatus !== 'READY',
      path: 'traceability',
    },
  ];

  return (
    <div className={cn('border-b overflow-x-auto', borderColor, riskTint)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-stretch gap-0.5 min-w-max sm:min-w-0 sm:flex-wrap lg:flex-nowrap">
          {strips.map((strip, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(strip.path)}
              className={cn(
                'flex-1 min-w-[70px] sm:min-w-[80px] lg:min-w-[90px] px-2 sm:px-3 py-2 text-left rounded transition-all',
                'hover:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-border-focus',
                strip.isDominant && strip.isDanger && 'bg-danger/10 hover:bg-danger/15',
                strip.isDominant && strip.isWarning && 'bg-warning/10 hover:bg-warning/15',
              )}
            >
              <div className={cn(
                'text-[8px] sm:text-[9px] font-bold uppercase tracking-wider',
                strip.isDanger ? 'text-danger' : strip.isWarning ? 'text-warning' : 'text-text-muted',
                strip.isTertiary && 'opacity-60',
              )}>
                {strip.label}
              </div>
              <div className={cn(
                'tabular-nums',
                strip.isDominant ? 'text-xl sm:text-2xl font-black' : 'text-base sm:text-lg font-bold',
                strip.isDanger ? 'text-danger' : strip.isWarning ? 'text-warning' : 'text-text-primary',
                strip.isSecondary && 'text-text-secondary opacity-70',
                strip.isTertiary && 'text-text-muted opacity-50 text-sm sm:text-base',
              )}>
                {strip.value}
              </div>
              <div className={cn(
                'text-[8px] sm:text-[9px] truncate',
                strip.isDanger ? 'text-danger/70' : strip.isWarning ? 'text-warning/70' : 'text-text-muted',
                (strip.isSecondary || strip.isTertiary) && 'opacity-50',
              )}>
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
// EXECUTION ROW - FAILURE INTERRUPTION STYLING
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
        'w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-all border-b',
        isFailing && 'bg-danger/[0.06] border-l-4 border-l-danger border-b-danger/20 hover:bg-danger/10',
        isBlocked && 'bg-warning/[0.04] border-l-4 border-l-warning border-b-warning/20 hover:bg-warning/[0.08]',
        !isFailing && !isBlocked && 'border-border-subtle hover:bg-surface-2',
      )}
    >
      <div className="flex-shrink-0">
        {isFailing ? (
          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-danger" strokeWidth={2.5} />
        ) : isBlocked ? (
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" strokeWidth={2} />
        ) : pending > 0 ? (
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
        ) : (
          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className={cn(
            'font-semibold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none',
            isFailing ? 'text-danger' : 'text-text-primary'
          )}>
            {cycle.name}
          </span>
          {isFailing && (
            <Badge className="bg-danger text-danger-foreground text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0 uppercase animate-pulse">
              FAILING
            </Badge>
          )}
          {isBlocked && (
            <Badge className="bg-warning/20 text-warning border border-warning/30 text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0 uppercase">
              BLOCKED
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[9px] sm:text-[10px]">
          {isFailing && (
            <span className="text-danger font-bold">{failed} failed</span>
          )}
          {isBlocked && (
            <span className="text-warning font-semibold">{blocked} blocked</span>
          )}
          <span className="text-success">{passed} passed</span>
          <span className="text-text-muted hidden sm:inline">{pending} pending</span>
        </div>
      </div>
      <div className="flex-shrink-0 w-12 sm:w-16 text-right">
        <div className={cn(
          'text-xs sm:text-sm font-bold tabular-nums',
          isFailing ? 'text-danger' : isBlocked ? 'text-warning' : 'text-text-primary'
        )}>
          {progress}%
        </div>
        <div className="w-full h-1 sm:h-1.5 bg-surface-3 rounded-full mt-1 overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all',
              isFailing ? 'bg-danger' : isBlocked ? 'bg-warning' : 'bg-success'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ChevronRight className={cn(
        'h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 hidden sm:block',
        isFailing ? 'text-danger' : 'text-text-muted'
      )} />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNTABILITY ITEM - FAILURE ELEVATION
// ═══════════════════════════════════════════════════════════════════

function AccountabilityItem({ 
  activity,
  onNavigate,
}: { 
  activity: any;
  onNavigate: (path: string) => void;
}) {
  const isFailed = activity.activity_type === 'execution_failed';
  
  const getIcon = () => {
    switch (activity.activity_type) {
      case 'execution_failed':
        return <XCircle className="h-4 w-4 text-danger" strokeWidth={2.5} />;
      case 'execution_completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Activity className="h-4 w-4 text-text-muted" />;
    }
  };

  const getAction = () => {
    switch (activity.activity_type) {
      case 'execution_failed': return 'FAILED';
      case 'execution_completed': return 'completed';
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
      className={cn(
        'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all border-b',
        isFailed && 'bg-danger/[0.04] border-l-4 border-l-danger hover:bg-danger/[0.08]',
        !isFailed && 'border-border-subtle hover:bg-surface-2',
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isFailed && 'font-semibold')}>
          <span className={cn(
            'font-bold',
            isFailed ? 'text-danger' : 'text-text-primary'
          )}>
            {activity.user_name}
          </span>
          <span className={cn(
            'mx-1',
            isFailed ? 'text-danger font-bold' : 'text-text-muted'
          )}>
            {getAction()}
          </span>
          <span className={cn(
            isFailed ? 'text-danger' : 'text-text-primary'
          )}>
            {activity.entity_title}
          </span>
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">
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

  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'global';
  const scopeId = searchParams.get('scopeId');

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

  // Determine release status (aggressive thresholds)
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
      title: 'Test Executions Failed',
      count: metrics?.failed || 0,
      severity: 'critical',
      navigateTo: 'executions?status=failed',
      description: 'Critical failures require immediate resolution before release',
    });
  }
  
  if ((metrics?.blocked || 0) > 0) {
    blockerCauses.push({
      id: 'blocked',
      type: 'blocked',
      title: 'Test Executions Blocked',
      count: metrics?.blocked || 0,
      severity: (metrics?.blocked || 0) > 2 ? 'critical' : 'high',
      navigateTo: 'executions?status=blocked',
      description: 'Tests blocked by dependencies or environment issues',
    });
  }
  
  if ((coverage?.uncoveredCount || 0) > 5) {
    blockerCauses.push({
      id: 'coverage',
      type: 'coverage',
      title: 'Stories Without Coverage',
      count: coverage?.uncoveredCount || 0,
      severity: (coverage?.uncoveredCount || 0) > 15 ? 'high' : 'medium',
      navigateTo: 'traceability',
      description: 'Requirements with no linked test cases',
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

  // Sort activities - failures first
  const sortedActivities = [...(activities || [])].sort((a: any, b: any) => {
    if (a.activity_type === 'execution_failed' && b.activity_type !== 'execution_failed') return -1;
    if (a.activity_type !== 'execution_failed' && b.activity_type === 'execution_failed') return 1;
    return 0;
  });

  const riskBorderClass = releaseStatus === 'BLOCKED' ? 'divide-danger/10' : releaseStatus === 'AT_RISK' ? 'divide-warning/10' : 'divide-border-default';

  return (
    <div className="flex flex-col h-full -m-6">
      {/* SYSTEM STATE BANNER */}
      <ReleaseStatusBanner 
        status={releaseStatus}
        blockerCount={metrics?.blocked || 0}
        failedCount={metrics?.failed || 0}
        isLoading={isLoading}
      />

      {/* THREAT CARDS */}
      <ThreatCards 
        causes={blockerCauses}
        isLoading={isLoading}
        releaseStatus={releaseStatus}
        onNavigate={handleNavigate}
      />

      {/* METRICS STRIP - FAILURE DOMINANT */}
      <MetricsStrip
        metrics={metrics}
        coverage={coverage || null}
        releaseStatus={releaseStatus}
        isLoading={isLoading}
        onNavigate={handleNavigate}
      />

      {/* CONTEXT BAR */}
      <div className={cn(
        'border-b',
        releaseStatus === 'BLOCKED' ? 'bg-danger/[0.02] border-danger/10' : releaseStatus === 'AT_RISK' ? 'bg-warning/[0.01] border-warning/10' : 'bg-surface-0 border-border-default'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-text-muted overflow-hidden">
            <span className="font-semibold text-text-primary truncate">
              {scopeType === 'global' ? 'All Projects' : scopeType === 'program' ? 'Program' : 'Project'}
            </span>
            <span className="opacity-50 hidden sm:inline">|</span>
            <span className="hidden sm:inline">{metrics?.totalCases ?? 0} cases</span>
            <span className="opacity-50 hidden md:inline">|</span>
            <span className="hidden md:inline">{metrics?.activeCycles ?? 0} active</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-6 sm:h-7 gap-1 text-[10px] px-1.5 sm:px-2"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setRunTestsOpen(true)}
              className="h-6 sm:h-7 gap-1 text-[10px] px-2 sm:px-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground"
            >
              <Play className="h-3 w-3" />
              Run
            </Button>
          </div>
        </div>
      </div>

      {/* ACCOUNTABILITY SPLIT VIEW - REDUCED PADDING */}
      <div className="flex-1 overflow-hidden bg-surface-1">
        <div className="max-w-7xl mx-auto h-full">
          <div className={cn('grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x', riskBorderClass)}>
            
            {/* LEFT: Active Executions */}
            <div className="flex flex-col min-h-[200px] lg:h-full overflow-hidden">
              <div className={cn(
                'px-3 sm:px-4 py-2 border-b flex items-center justify-between',
                releaseStatus === 'BLOCKED' ? 'bg-danger/[0.03] border-danger/10' : releaseStatus === 'AT_RISK' ? 'bg-warning/[0.02] border-warning/10' : 'bg-surface-0 border-border-default'
              )}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Activity className={cn(
                    'h-3.5 w-3.5 sm:h-4 sm:w-4',
                    releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-text-muted'
                  )} />
                  <h2 className="text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                    Active Executions
                  </h2>
                  {sortedCycles.filter((c: any) => c._failed > 0).length > 0 && (
                    <Badge variant="destructive" className="text-[8px] sm:text-[9px] px-1 py-0">
                      {sortedCycles.filter((c: any) => c._failed > 0).length} failing
                    </Badge>
                  )}
                </div>
                <Link
                  to={buildUrl('cycles')}
                  className="text-[10px] text-brand-primary hover:underline flex items-center gap-0.5"
                >
                  All
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto bg-surface-0">
                {cyclesLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : sortedCycles.length === 0 ? (
                  <div className="p-4">
                    <div className="text-text-muted text-xs mb-2">
                      No active test cycles
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigate('cycles')}
                      className="h-7 text-[10px]"
                    >
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

            {/* RIGHT: Team Activity */}
            <div className="flex flex-col min-h-[200px] lg:h-full overflow-hidden">
              <div className={cn(
                'px-3 sm:px-4 py-2 border-b flex items-center justify-between',
                releaseStatus === 'BLOCKED' ? 'bg-danger/[0.03] border-danger/10' : releaseStatus === 'AT_RISK' ? 'bg-warning/[0.02] border-warning/10' : 'bg-surface-0 border-border-default'
              )}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User className={cn(
                    'h-3.5 w-3.5 sm:h-4 sm:w-4',
                    releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-text-muted'
                  )} />
                  <h2 className="text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                    Accountability
                  </h2>
                </div>
                <Link
                  to={buildUrl('reports')}
                  className="text-[10px] text-brand-primary hover:underline flex items-center gap-0.5"
                >
                  Report
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto bg-surface-0">
                {activitiesLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : !sortedActivities?.length ? (
                  <div className="p-4 text-text-muted text-xs">
                    No recent activity
                  </div>
                ) : (
                  sortedActivities.map((activity: any) => (
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
