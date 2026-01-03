/**
 * GLOBAL TESTS OVERVIEW - ENTERPRISE CONTROL SURFACE
 * Enterprise-grade density, WCAG contrast, Jira/ServiceNow class
 * Two-column fixed grid, single-row control rail, table-based executions
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
  Shield,
  Activity,
  MoreHorizontal,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// ═══════════════════════════════════════════════════════════════════
// 1. CONTROL RAIL - Single row: Status | Severity | Metrics | CTA
// ═══════════════════════════════════════════════════════════════════

function ControlRail({ 
  status, 
  failedCount,
  blockedCount,
  uncoveredCount,
  passedCount,
  totalCases,
  passRate,
  isLoading,
  onResolve,
  onRefresh,
  onNavigate,
}: { 
  status: ReleaseStatus; 
  failedCount: number;
  blockedCount: number;
  uncoveredCount: number;
  passedCount: number;
  totalCases: number;
  passRate: number;
  isLoading: boolean;
  onResolve: () => void;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="h-11 bg-surface-0 border-b border-border-default flex items-center px-4">
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>
    );
  }

  const statusConfig = {
    BLOCKED: { 
      accent: 'bg-danger', 
      text: 'text-danger', 
      label: 'RELEASE BLOCKED',
      icon: XCircle,
    },
    AT_RISK: { 
      accent: 'bg-warning', 
      text: 'text-warning', 
      label: 'RELEASE AT RISK',
      icon: AlertTriangle,
    },
    READY: { 
      accent: 'bg-success', 
      text: 'text-success', 
      label: 'READY',
      icon: Shield,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="h-11 bg-surface-0 border-b-2 border-border-default flex items-stretch">
      {/* Left accent bar - thick for visibility */}
      <div className={cn('w-1.5 flex-shrink-0', config.accent)} />
      
      {/* Status */}
      <div className="flex items-center gap-2 px-4 border-r border-border-default">
        <StatusIcon className={cn('h-4 w-4', config.text)} strokeWidth={2.5} />
        <span className={cn('text-sm font-extrabold tracking-tight uppercase', config.text)}>
          {config.label}
        </span>
      </div>
      
      {/* Severity Stack - horizontal */}
      <div className="flex items-stretch divide-x divide-border-subtle">
        {/* S1: Failed */}
        {failedCount > 0 && (
          <button
            onClick={() => onNavigate('executions?status=failed')}
            className="flex items-center gap-1.5 px-3 hover:bg-danger/5 transition-colors"
          >
            <span className="text-[10px] font-black tracking-widest text-danger">S1</span>
            <span className="text-lg font-black tabular-nums text-danger leading-none">{failedCount}</span>
            <span className="text-[10px] font-semibold text-text-muted uppercase">Failed</span>
          </button>
        )}
        
        {/* S2: Blocked */}
        {blockedCount > 0 && (
          <button
            onClick={() => onNavigate('executions?status=blocked')}
            className="flex items-center gap-1.5 px-3 hover:bg-warning/5 transition-colors"
          >
            <span className="text-[10px] font-bold tracking-widest text-warning">S2</span>
            <span className="text-base font-bold tabular-nums text-warning leading-none">{blockedCount}</span>
            <span className="text-[10px] font-medium text-text-muted uppercase">Blocked</span>
          </button>
        )}
        
        {/* S3: Uncovered */}
        {uncoveredCount > 0 && (
          <button
            onClick={() => onNavigate('traceability')}
            className="flex items-center gap-1.5 px-3 hover:bg-surface-2 transition-colors"
          >
            <span className="text-[10px] font-medium tracking-widest text-text-muted">S3</span>
            <span className="text-sm font-semibold tabular-nums text-text-secondary leading-none">{uncoveredCount}</span>
            <span className="text-[10px] text-text-muted uppercase">Uncovered</span>
          </button>
        )}
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Metrics - right section */}
      <div className="flex items-stretch divide-x divide-border-subtle border-l border-border-default">
        <button
          onClick={() => onNavigate('executions?status=passed')}
          className="flex items-center gap-1.5 px-3 hover:bg-success/5 transition-colors"
        >
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Passed</span>
          <span className="text-lg font-black tabular-nums text-success leading-none">{passedCount}</span>
        </button>
        
        <div className="flex items-center gap-1.5 px-3">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Total</span>
          <span className="text-lg font-bold tabular-nums text-text-primary leading-none">{totalCases}</span>
        </div>
        
        <div className="flex items-center gap-1.5 px-3">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Rate</span>
          <span className={cn(
            'text-lg font-black tabular-nums leading-none',
            passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-danger'
          )}>
            {passRate}%
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 px-2 border-l border-border-default">
        {status !== 'READY' && (
          <Button
            size="sm"
            onClick={onResolve}
            className="h-7 px-3 text-xs font-bold bg-brand-primary hover:bg-brand-primary-hover text-white"
          >
            Resolve Blocking Failures
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-elevated border-border-default">
            <DropdownMenuItem onClick={onRefresh} className="text-xs font-medium">
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('reports')} className="text-xs font-medium">
              Report
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs font-medium text-text-muted">
              Escalate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. EXECUTION TABLE - Dense grid, no cards
// ═══════════════════════════════════════════════════════════════════

function ExecutionTable({ 
  cycles, 
  isLoading,
  onNavigate,
  onJumpToFailing,
}: { 
  cycles: any[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
  onJumpToFailing: (cycleId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-2 space-y-0.5">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-8" />)}
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="h-5 w-5 text-text-muted mb-2" strokeWidth={1.5} />
        <p className="text-xs font-semibold text-text-muted">No active executions</p>
      </div>
    );
  }

  return (
    <div className="text-xs">
      {/* Table header - dark, dense */}
      <div className="grid grid-cols-[1fr_90px_80px_50px_50px] gap-1 px-3 py-1.5 bg-surface-3 border-b border-border-default text-[10px] font-black tracking-widest text-text-muted uppercase sticky top-0">
        <span>Cycle</span>
        <span>Owner</span>
        <span className="text-right">F / B / P</span>
        <span className="text-right">Prog</span>
        <span></span>
      </div>
      
      {/* Rows - tight, no card styling */}
      <div className="divide-y divide-border-subtle">
        {cycles.map((cycle: any) => {
          const execs = cycle.test_cycle_executions || [];
          const total = execs.length;
          const passed = execs.filter((e: any) => e.status === 'passed').length;
          const failed = execs.filter((e: any) => e.status === 'failed').length;
          const blocked = execs.filter((e: any) => e.status === 'blocked').length;
          const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;
          
          const isFailing = failed > 0;
          const isBlocked = blocked > 0 && !isFailing;
          const hasOwner = !!cycle.owner_name;

          return (
            <div
              key={cycle.id}
              className={cn(
                'grid grid-cols-[1fr_90px_80px_50px_50px] gap-1 px-3 py-1.5 items-center hover:bg-surface-2 transition-colors',
                isFailing && 'bg-danger/[0.03] border-l-4 border-l-danger',
                isBlocked && !isFailing && 'border-l-4 border-l-warning',
                !isFailing && !isBlocked && 'border-l-4 border-l-transparent',
              )}
            >
              {/* Cycle name + icon */}
              <button
                onClick={() => onNavigate(`cycles/${cycle.id}/execution`)}
                className="flex items-center gap-1.5 text-left truncate group"
              >
                {isFailing ? (
                  <XCircle className="h-3.5 w-3.5 text-danger flex-shrink-0" strokeWidth={2.5} />
                ) : isBlocked ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" strokeWidth={2.5} />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" strokeWidth={2.5} />
                )}
                <span className="font-bold text-text-primary truncate group-hover:underline">
                  {cycle.name}
                </span>
              </button>
              
              {/* Owner - danger if none */}
              <div className={cn(
                'truncate font-medium',
                hasOwner ? 'text-text-secondary' : 'text-danger'
              )}>
                {hasOwner ? cycle.owner_name : 'Unassigned'}
              </div>
              
              {/* Status counts - tabular */}
              <div className="flex items-center justify-end gap-1 font-bold tabular-nums">
                <span className={cn(failed > 0 ? 'text-danger' : 'text-text-muted')}>{failed}</span>
                <span className="text-text-muted">/</span>
                <span className={cn(blocked > 0 ? 'text-warning' : 'text-text-muted')}>{blocked}</span>
                <span className="text-text-muted">/</span>
                <span className={cn(passed > 0 ? 'text-success' : 'text-text-muted')}>{passed}</span>
              </div>
              
              {/* Progress */}
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <span className="font-bold tabular-nums text-text-primary">{progress}%</span>
                </div>
                <div className="w-full h-1 bg-surface-3 rounded-sm mt-0.5 overflow-hidden">
                  <div 
                    className={cn(
                      'h-full',
                      isFailing ? 'bg-danger' : isBlocked ? 'bg-warning' : 'bg-success'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              {/* Jump CTA */}
              <div className="text-right">
                {isFailing && (
                  <button
                    onClick={() => onJumpToFailing(cycle.id)}
                    className="text-[10px] font-bold text-brand-primary hover:underline whitespace-nowrap"
                  >
                    Jump →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. ACCOUNTABILITY LOG - Audit-grade, dense, no color emphasis
// ═══════════════════════════════════════════════════════════════════

function AccountabilityLog({ 
  activities,
  isLoading,
  onNavigate,
}: { 
  activities: any[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-2 space-y-0.5">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-7" />)}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-5 w-5 text-text-muted mb-2" strokeWidth={1.5} />
        <p className="text-xs font-semibold text-text-muted">No activity recorded</p>
      </div>
    );
  }

  const getAction = (type: string) => {
    switch (type) {
      case 'execution_failed': return 'failed';
      case 'execution_completed': return 'completed';
      case 'status_changed': return 'changed';
      case 'case_updated': return 'updated';
      default: return 'modified';
    }
  };

  return (
    <div className="divide-y divide-border-subtle text-xs">
      {activities.map((activity: any) => (
        <button
          key={activity.id}
          onClick={() => {
            if (activity.entity_type === 'test_case') {
              onNavigate(`cases?caseId=${activity.entity_id}`);
            } else if (activity.entity_type === 'test_cycle') {
              onNavigate(`cycles?cycleId=${activity.entity_id}`);
            }
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-2 transition-colors group"
        >
          {/* Actor - BOLD */}
          <span className="font-black text-text-primary truncate max-w-[70px] flex-shrink-0">
            {activity.user_name}
          </span>
          
          {/* Action */}
          <span className="text-text-muted font-medium flex-shrink-0">
            {getAction(activity.activity_type)}
          </span>
          
          {/* Entity */}
          <span className="font-semibold text-text-secondary truncate flex-1 min-w-0">
            {activity.entity_title}
          </span>
          
          {/* Time */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-text-muted tabular-nums flex-shrink-0 font-medium">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: false })}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {format(new Date(activity.created_at), 'PPpp')}
            </TooltipContent>
          </Tooltip>
          
          <ExternalLink className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </button>
      ))}
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

  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'project';
  const scopeId = searchParams.get('scopeId');

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

  const handleJumpToFailing = (cycleId: string) => {
    navigate(buildUrl(`cycles/${cycleId}/execution`, 'filter=failed'));
  };

  // Fetch data
  const { metrics, isLoading: metricsLoading, refetch } = useGlobalTestMetrics(scopeType, scopeId);
  const { data: cycles, isLoading: cyclesLoading } = useGlobalTestCycles(scopeType, scopeId);
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity(scopeType, scopeId, 25);
  const { data: coverage, isLoading: coverageLoading } = useStoryCoverage(scopeType, scopeId);

  const isLoading = metricsLoading || coverageLoading;

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
    .slice(0, 15);

  // Run button guardrails
  const canRun = isProjectScope && (metrics?.totalCases || 0) > 0;
  const runDisabledReason = !isProjectScope 
    ? 'Operational testing is available at Project scope' 
    : (metrics?.totalCases || 0) === 0 
    ? 'Create test cases and a cycle first' 
    : '';

  return (
    <div className="flex flex-col h-full -m-6 bg-surface-1">
      {/* 1. CONTROL RAIL */}
      <ControlRail 
        status={releaseStatus}
        failedCount={metrics?.failed || 0}
        blockedCount={metrics?.blocked || 0}
        uncoveredCount={coverage?.uncoveredCount || 0}
        passedCount={metrics?.passed || 0}
        totalCases={metrics?.totalCases || 0}
        passRate={metrics?.passRate || 0}
        isLoading={isLoading}
        onResolve={() => handleNavigate('executions?status=failed&status=blocked')}
        onRefresh={refetch}
        onNavigate={handleNavigate}
      />

      {/* Context bar - minimal */}
      <div className="flex items-center justify-between px-4 py-1 bg-surface-0 border-b border-border-subtle">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-text-primary uppercase tracking-wide">
            {scopeType === 'project' ? 'Project Scope' : 'All Scopes'}
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-secondary tabular-nums font-semibold">{metrics?.activeCycles ?? 0} active cycles</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                onClick={() => setRunTestsOpen(true)}
                disabled={!canRun}
                className="h-6 px-2.5 text-xs font-bold bg-brand-primary hover:bg-brand-primary-hover text-white disabled:opacity-50 gap-1"
              >
                <Play className="h-3 w-3" />
                Run
              </Button>
            </span>
          </TooltipTrigger>
          {runDisabledReason && (
            <TooltipContent className="text-xs">{runDisabledReason}</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* 2. SPLIT VIEW - 70/30 fixed grid */}
      <div className="flex-1 grid grid-cols-[1fr_280px] divide-x divide-border-default overflow-hidden">
        
        {/* LEFT: ACTIVE EXECUTIONS (70%) */}
        <div className="flex flex-col min-h-0 overflow-hidden bg-surface-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-default bg-surface-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-text-muted" strokeWidth={2.5} />
              <h2 className="text-[10px] font-black tracking-widest text-text-primary uppercase">
                Active Executions
              </h2>
            </div>
            <Link
              to={buildUrl('cycles')}
              className="text-[10px] font-bold text-brand-primary hover:underline flex items-center"
            >
              All cycles <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ExecutionTable 
              cycles={sortedCycles}
              isLoading={cyclesLoading}
              onNavigate={handleNavigate}
              onJumpToFailing={handleJumpToFailing}
            />
          </div>
        </div>

        {/* RIGHT: ACCOUNTABILITY (30%) */}
        <div className="flex flex-col min-h-0 overflow-hidden bg-surface-0">
          <div className="flex items-center px-3 py-1.5 border-b border-border-default bg-surface-2">
            <Clock className="h-3.5 w-3.5 text-text-muted mr-2" strokeWidth={2.5} />
            <h2 className="text-[10px] font-black tracking-widest text-text-primary uppercase">
              Accountability
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AccountabilityLog 
              activities={activities || []}
              isLoading={activitiesLoading}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      </div>

      {/* Run Tests Modal */}
      <RunTestsModal 
        open={runTestsOpen} 
        onOpenChange={setRunTestsOpen}
        projectId={scopeId || ''}
      />
    </div>
  );
}
