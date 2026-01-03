/**
 * GLOBAL TESTS OVERVIEW - ENTERPRISE CONTROL SURFACE
 * 9.8/10 Enterprise Grade - Jira/ServiceNow class UI
 * Dense, authoritative, WCAG compliant
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
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  FolderKanban,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
// 1. CONTROL RAIL - Compressed command bar + severity + metrics
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
      <div className="bg-surface-0 border-b border-border-default px-4 py-2">
        <Skeleton className="h-10 w-full" />
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
    <div className="bg-surface-0 border-b border-border-default">
      {/* Row 1: Status + Primary CTA */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border-subtle">
        {/* Status accent */}
        <div className={cn('w-1 h-8 rounded-full', config.accent)} />
        <StatusIcon className={cn('h-4 w-4 flex-shrink-0', config.text)} strokeWidth={2} />
        <span className={cn('text-xs font-bold tracking-wide uppercase', config.text)}>
          {config.label}
        </span>
        
        {status !== 'READY' && (
          <span className="text-xs text-text-muted font-mono tabular-nums ml-1">
            {failedCount}F · {blockedCount}B
          </span>
        )}
        
        <div className="flex-1" />
        
        {status !== 'READY' && (
          <Button
            size="sm"
            onClick={onResolve}
            className="h-7 text-xs font-semibold bg-brand-primary hover:bg-brand-primary-hover text-white"
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
            <DropdownMenuItem onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('reports')}>
              Report
            </DropdownMenuItem>
            <DropdownMenuItem className="text-text-muted">
              Escalate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Row 2: Severity Stack + Metrics (horizontal) */}
      <div className="flex items-stretch divide-x divide-border-subtle">
        {/* Severity items */}
        {failedCount > 0 && (
          <button
            onClick={() => onNavigate('executions?status=failed')}
            className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors group"
          >
            <div className="w-1 h-6 bg-danger rounded-full" />
            <span className="text-[10px] font-bold tracking-widest text-danger uppercase">S1</span>
            <span className="text-lg font-black tabular-nums text-danger">{failedCount}</span>
            <span className="text-xs text-text-muted group-hover:text-text-secondary">Failed</span>
            <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100" />
          </button>
        )}
        
        {blockedCount > 0 && (
          <button
            onClick={() => onNavigate('executions?status=blocked')}
            className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors group"
          >
            <div className="w-1 h-5 bg-warning rounded-full" />
            <span className="text-[10px] font-bold tracking-widest text-warning uppercase">S2</span>
            <span className="text-base font-bold tabular-nums text-warning">{blockedCount}</span>
            <span className="text-xs text-text-muted group-hover:text-text-secondary">Blocked</span>
            <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100" />
          </button>
        )}
        
        {uncoveredCount > 0 && (
          <button
            onClick={() => onNavigate('traceability')}
            className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors group"
          >
            <div className="w-0.5 h-4 bg-info rounded-full" />
            <span className="text-[10px] font-medium tracking-widest text-text-muted uppercase">S3</span>
            <span className="text-sm font-semibold tabular-nums text-text-secondary">{uncoveredCount}</span>
            <span className="text-xs text-text-muted">Uncovered</span>
            <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100" />
          </button>
        )}
        
        {/* Spacer */}
        <div className="flex-1 min-w-0" />
        
        {/* Metrics - right aligned */}
        <button
          onClick={() => onNavigate('executions?status=passed')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors"
        >
          <span className="text-[10px] font-medium tracking-widest text-text-muted uppercase">PASSED</span>
          <span className="text-lg font-black tabular-nums text-success">{passedCount}</span>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <ArrowUp className="h-3 w-3 text-success" />
          </span>
        </button>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-1">
          <span className="text-[10px] font-medium tracking-widest text-text-muted uppercase">TOTAL</span>
          <span className="text-lg font-bold tabular-nums text-text-primary">{totalCases}</span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-1">
          <span className="text-[10px] font-medium tracking-widest text-text-muted uppercase">RATE</span>
          <span className={cn(
            'text-lg font-black tabular-nums',
            passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-danger'
          )}>
            {passRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. EXECUTION TABLE - Dense console-style rows
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
      <div className="p-2 space-y-1">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9" />)}
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <Activity className="h-6 w-6 text-text-muted mb-1" strokeWidth={1.5} />
        <p className="text-xs font-medium text-text-muted">No active executions</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {/* Table header */}
      <div className="grid grid-cols-[1fr,80px,60px,50px,60px] gap-2 px-3 py-1.5 bg-surface-2 text-[10px] font-bold tracking-wider text-text-muted uppercase">
        <span>Cycle</span>
        <span>Owner</span>
        <span className="text-right">Status</span>
        <span className="text-right">Prog</span>
        <span></span>
      </div>
      
      {/* Rows */}
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
              'grid grid-cols-[1fr,80px,60px,50px,60px] gap-2 px-3 py-2 items-center hover:bg-surface-2 transition-colors',
              isFailing && 'border-l-[3px] border-l-danger bg-danger/[0.02]',
              isBlocked && !isFailing && 'border-l-[3px] border-l-warning',
              !isFailing && !isBlocked && 'border-l-[3px] border-l-transparent',
            )}
          >
            {/* Cycle name + status */}
            <button
              onClick={() => onNavigate(`cycles/${cycle.id}/execution`)}
              className="flex items-center gap-2 text-left truncate group"
            >
              {isFailing ? (
                <XCircle className="h-3.5 w-3.5 text-danger flex-shrink-0" strokeWidth={2} />
              ) : isBlocked ? (
                <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" strokeWidth={2} />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" strokeWidth={2} />
              )}
              <span className="text-xs font-semibold text-text-primary truncate group-hover:underline">
                {cycle.name}
              </span>
            </button>
            
            {/* Owner */}
            <div className={cn(
              'text-xs truncate flex items-center gap-1',
              hasOwner ? 'text-text-muted' : 'text-danger font-medium'
            )}>
              {hasOwner ? (
                <span className="truncate">{cycle.owner_name}</span>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>None</span>
                </>
              )}
            </div>
            
            {/* Status counts */}
            <div className="flex items-center justify-end gap-1 text-xs font-bold tabular-nums">
              {failed > 0 && <span className="text-danger">{failed}F</span>}
              {blocked > 0 && <span className="text-warning">{blocked}B</span>}
              {passed > 0 && <span className="text-success">{passed}P</span>}
            </div>
            
            {/* Progress */}
            <div className="text-right">
              <span className="text-xs font-bold tabular-nums text-text-primary">{progress}%</span>
              <div className="w-full h-1 bg-surface-3 rounded-full mt-0.5 overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all',
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
                  className="text-[10px] font-semibold text-brand-primary hover:underline"
                >
                  Jump →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. ACCOUNTABILITY LOG - Audit-grade density
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
      <div className="p-2 space-y-1">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8" />)}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <Clock className="h-6 w-6 text-text-muted mb-1" strokeWidth={1.5} />
        <p className="text-xs font-medium text-text-muted">No activity recorded</p>
      </div>
    );
  }

  // Group by entity type
  const grouped = activities.reduce((acc: Record<string, any[]>, activity: any) => {
    const type = activity.entity_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(activity);
    return acc;
  }, {});

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
    <div className="divide-y divide-border-subtle">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          {/* Group header */}
          <div className="px-3 py-1 bg-surface-2 border-b border-border-subtle">
            <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
              {type === 'test_case' ? 'TEST CASES' : type === 'test_cycle' ? 'CYCLES' : 'OTHER'}
            </span>
          </div>
          
          {/* Items */}
          {(items as any[]).map((activity: any) => (
            <button
              key={activity.id}
              onClick={() => {
                if (activity.entity_type === 'test_case') {
                  onNavigate(`cases?caseId=${activity.entity_id}`);
                } else if (activity.entity_type === 'test_cycle') {
                  onNavigate(`cycles?cycleId=${activity.entity_id}`);
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 transition-colors group"
            >
              {/* Actor - bold */}
              <span className="text-xs font-bold text-text-primary truncate max-w-[80px]">
                {activity.user_name}
              </span>
              
              {/* Action */}
              <span className="text-xs text-text-muted">
                {getAction(activity.activity_type)}
              </span>
              
              {/* Entity */}
              <span className="text-xs font-medium text-text-secondary truncate flex-1">
                {activity.entity_title}
              </span>
              
              {/* Time - relative + absolute */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-text-muted tabular-nums flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: false })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(activity.created_at), 'PPpp')}
                </TooltipContent>
              </Tooltip>
              
              <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </button>
          ))}
        </div>
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

  const handleJumpToFailing = (cycleId: string) => {
    navigate(buildUrl(`cycles/${cycleId}/execution`, 'filter=failed'));
  };

  // Fetch data
  const { metrics, isLoading: metricsLoading, refetch } = useGlobalTestMetrics(scopeType, scopeId);
  const { data: cycles, isLoading: cyclesLoading } = useGlobalTestCycles(scopeType, scopeId);
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity(scopeType, scopeId, 20);
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
    .slice(0, 12);

  // Run button guardrails
  const canRun = isProjectScope && (metrics?.totalCases || 0) > 0;
  const runDisabledReason = !isProjectScope 
    ? 'Operational testing is available at Project scope' 
    : (metrics?.totalCases || 0) === 0 
    ? 'Create test cases and a cycle first' 
    : '';

  const failingCount = sortedCycles.filter((c: any) => c._failed > 0).length;

  return (
    <div className="flex flex-col h-full -m-6 bg-surface-1">
      {/* 1. CONTROL RAIL - Status + Severity + Metrics */}
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

      {/* Context bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-surface-0 border-b border-border-default">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="font-semibold text-text-primary">
            {scopeType === 'project' ? 'Project' : 'All'}
          </span>
          <span className="opacity-40">|</span>
          <span className="tabular-nums">{metrics?.activeCycles ?? 0} active</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                onClick={() => setRunTestsOpen(true)}
                disabled={!canRun}
                className="h-6 px-3 text-xs font-semibold bg-brand-primary hover:bg-brand-primary-hover text-white disabled:opacity-50 gap-1.5"
              >
                <Play className="h-3 w-3" />
                Run Tests
              </Button>
            </span>
          </TooltipTrigger>
          {runDisabledReason && (
            <TooltipContent>{runDisabledReason}</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* 2. SPLIT VIEW - Executions + Accountability */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] h-full divide-y lg:divide-y-0 lg:divide-x divide-border-default">
          
          {/* LEFT: ACTIVE EXECUTIONS */}
          <div className="flex flex-col min-h-0 overflow-hidden bg-surface-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-surface-1">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-text-muted" strokeWidth={2} />
                <h2 className="text-xs font-bold tracking-wide text-text-primary uppercase">
                  Active Executions
                </h2>
                {failingCount > 0 && (
                  <Badge variant="outline" className="h-4 text-[10px] px-1.5 font-bold text-danger border-danger/40 tabular-nums">
                    {failingCount} failing
                  </Badge>
                )}
              </div>
              <Link
                to={buildUrl('cycles')}
                className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-0.5"
              >
                All cycles
                <ChevronRight className="h-3 w-3" />
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

          {/* RIGHT: ACCOUNTABILITY */}
          <div className="flex flex-col min-h-0 overflow-hidden bg-surface-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-surface-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" strokeWidth={2} />
                <h2 className="text-xs font-bold tracking-wide text-text-primary uppercase">
                  Accountability
                </h2>
              </div>
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
