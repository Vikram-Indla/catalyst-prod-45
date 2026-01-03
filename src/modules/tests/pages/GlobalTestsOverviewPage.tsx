/**
 * GLOBAL TESTS OVERVIEW - ENTERPRISE COMMAND CONSOLE
 * Bloomberg / Jira Align class - Mission-critical release authority
 * Dense, intimidating, audit-grade, WCAG AA+ dark mode
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
  MoreHorizontal,
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

type ReleaseStatus = 'BLOCKED' | 'AT_RISK' | 'READY';

// ═══════════════════════════════════════════════════════════════════
// COMMAND RAIL - Heavy, dominant, single-row authority bar
// ═══════════════════════════════════════════════════════════════════

function CommandRail({ 
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
      <div className="h-12 bg-surface-3 border-b-2 border-border-strong flex items-center px-4">
        <Skeleton className="h-7 w-full max-w-3xl" />
      </div>
    );
  }

  const isBlocked = status === 'BLOCKED';
  const isAtRisk = status === 'AT_RISK';

  return (
    <div className={cn(
      "h-12 flex items-stretch border-b-2",
      isBlocked ? "bg-danger/5 border-danger" : isAtRisk ? "bg-warning/5 border-warning" : "bg-success/5 border-success"
    )}>
      {/* 6px left accent bar - ABSOLUTE BLOCK */}
      <div className={cn(
        'w-1.5 flex-shrink-0',
        isBlocked ? 'bg-danger' : isAtRisk ? 'bg-warning' : 'bg-success'
      )} />
      
      {/* Status label - DOMINANT */}
      <div className={cn(
        "flex items-center gap-2 px-4 border-r-2",
        isBlocked ? "border-danger/30" : isAtRisk ? "border-warning/30" : "border-success/30"
      )}>
        {isBlocked ? (
          <XCircle className="h-5 w-5 text-danger" strokeWidth={3} />
        ) : isAtRisk ? (
          <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={3} />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-success" strokeWidth={3} />
        )}
        <span className={cn(
          "text-sm font-black tracking-tight uppercase",
          isBlocked ? "text-danger" : isAtRisk ? "text-warning" : "text-success"
        )}>
          {isBlocked ? '⛔ RELEASE BLOCKED' : isAtRisk ? '⚠ RELEASE AT RISK' : '✓ READY'}
        </span>
      </div>
      
      {/* Severity metrics - NUMBERS OVERPOWER LABELS */}
      <div className="flex items-stretch">
        {/* S1 Failed - Always show */}
        <button
          onClick={() => failedCount > 0 && onNavigate('executions?status=failed')}
          className={cn(
            "flex items-center gap-2 px-4 border-r border-border-strong transition-colors",
            failedCount > 0 ? "hover:bg-danger/10 cursor-pointer" : "cursor-default"
          )}
        >
          <span className="text-xs font-black tracking-widest text-text-muted">S1 FAIL:</span>
          <span className={cn(
            "text-xl font-black tabular-nums leading-none",
            failedCount > 0 ? "text-danger" : "text-text-muted"
          )}>
            {failedCount}
          </span>
        </button>
        
        {/* S2 Blocked */}
        <button
          onClick={() => blockedCount > 0 && onNavigate('executions?status=blocked')}
          className={cn(
            "flex items-center gap-2 px-4 border-r border-border-strong transition-colors",
            blockedCount > 0 ? "hover:bg-warning/10 cursor-pointer" : "cursor-default"
          )}
        >
          <span className="text-xs font-black tracking-widest text-text-muted">S2 BLOCK:</span>
          <span className={cn(
            "text-xl font-black tabular-nums leading-none",
            blockedCount > 0 ? "text-warning" : "text-text-muted"
          )}>
            {blockedCount}
          </span>
        </button>
        
        {/* S3 Uncovered */}
        <button
          onClick={() => uncoveredCount > 0 && onNavigate('traceability')}
          className={cn(
            "flex items-center gap-2 px-4 border-r border-border-strong transition-colors",
            uncoveredCount > 0 ? "hover:bg-surface-3 cursor-pointer" : "cursor-default"
          )}
        >
          <span className="text-xs font-bold tracking-widest text-text-muted">S3 UNCOVERED:</span>
          <span className="text-lg font-bold tabular-nums leading-none text-text-secondary">
            {uncoveredCount}
          </span>
        </button>
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Right metrics - PASS / TOTAL / RATE */}
      <div className="flex items-stretch border-l-2 border-border-strong">
        <button
          onClick={() => onNavigate('executions?status=passed')}
          className="flex items-center gap-2 px-4 border-r border-border-default hover:bg-success/10 transition-colors"
        >
          <span className="text-xs font-bold tracking-wide text-text-muted uppercase">PASS:</span>
          <span className="text-xl font-black tabular-nums leading-none text-success">
            {passedCount}
          </span>
        </button>
        
        <div className="flex items-center gap-2 px-4 border-r border-border-default">
          <span className="text-xs font-bold tracking-wide text-text-muted uppercase">TOTAL:</span>
          <span className="text-xl font-black tabular-nums leading-none text-text-primary">
            {totalCases}
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-4 border-r border-border-default">
          <span className="text-xs font-bold tracking-wide text-text-muted uppercase">RATE:</span>
          <span className={cn(
            "text-xl font-black tabular-nums leading-none",
            passRate >= 80 ? "text-success" : passRate >= 60 ? "text-warning" : "text-danger"
          )}>
            {passRate}%
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 px-3">
        {status !== 'READY' && (
          <Button
            size="sm"
            onClick={onResolve}
            className="h-8 px-4 text-xs font-black uppercase tracking-wide bg-danger hover:bg-danger/90 text-white"
          >
            Resolve Failures
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-elevated border-border-strong">
            <DropdownMenuItem onClick={onRefresh} className="text-xs font-bold">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('reports')} className="text-xs font-bold">
              Export Report
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs font-bold text-danger">
              Escalate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION TABLE - Dense grid, ≤40px rows, no cards, no whitespace
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
      <div className="divide-y divide-border-default">
        {[1,2,3,4,5,6,7,8,9,10].map(i => (
          <div key={i} className="h-10 px-3 flex items-center">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-2">
        <div className="text-center py-8">
          <span className="text-sm font-black text-text-muted uppercase tracking-widest">
            NO ACTIVE EXECUTIONS
          </span>
          <p className="text-xs text-text-muted mt-1">Create a test cycle to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      {/* Table header - HEAVY, dark */}
      <div className="grid grid-cols-[1fr_100px_100px_70px_60px] gap-0 bg-surface-3 border-b-2 border-border-strong sticky top-0 z-10">
        <div className="px-3 py-2 text-[11px] font-black tracking-widest text-text-primary uppercase">CYCLE</div>
        <div className="px-3 py-2 text-[11px] font-black tracking-widest text-text-primary uppercase">OWNER</div>
        <div className="px-3 py-2 text-[11px] font-black tracking-widest text-text-primary uppercase text-right">FAIL / BLOCK / PASS</div>
        <div className="px-3 py-2 text-[11px] font-black tracking-widest text-text-primary uppercase text-right">PROG</div>
        <div className="px-3 py-2 text-[11px] font-black tracking-widest text-text-primary uppercase text-right">ACTION</div>
      </div>
      
      {/* Rows - TIGHT, no card styling, strong borders */}
      <div className="divide-y divide-border-default">
        {cycles.map((cycle: any) => {
          const execs = cycle.test_cycle_executions || [];
          const total = execs.length;
          const passed = execs.filter((e: any) => e.status === 'passed').length;
          const failed = execs.filter((e: any) => e.status === 'failed').length;
          const blocked = execs.filter((e: any) => e.status === 'blocked').length;
          const executed = passed + failed + blocked;
          const progress = total > 0 ? Math.round((executed / total) * 100) : 0;
          
          const isFailing = failed > 0;
          const isBlocked = blocked > 0 && !isFailing;
          const hasOwner = !!cycle.owner_name;

          return (
            <div
              key={cycle.id}
              className={cn(
                'grid grid-cols-[1fr_100px_100px_70px_60px] gap-0 items-center h-10 hover:bg-surface-2 transition-colors',
                isFailing && 'bg-danger/[0.04] border-l-4 border-l-danger',
                isBlocked && !isFailing && 'bg-warning/[0.03] border-l-4 border-l-warning',
                !isFailing && !isBlocked && 'border-l-4 border-l-transparent',
              )}
            >
              {/* Cycle name */}
              <button
                onClick={() => onNavigate(`cycles/${cycle.id}/execution`)}
                className="flex items-center gap-2 px-3 text-left truncate group h-full"
              >
                {isFailing ? (
                  <XCircle className="h-4 w-4 text-danger flex-shrink-0" strokeWidth={2.5} />
                ) : isBlocked ? (
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" strokeWidth={2.5} />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" strokeWidth={2.5} />
                )}
                <span className="font-black text-text-primary truncate group-hover:underline">
                  {cycle.name}
                </span>
              </button>
              
              {/* Owner - SEVERE if unassigned */}
              <div className={cn(
                'px-3 truncate font-bold',
                hasOwner ? 'text-text-secondary' : 'text-danger font-black'
              )}>
                {hasOwner ? cycle.owner_name : '⚠ UNASSIGNED'}
              </div>
              
              {/* Status counts - tabular, numbers dominant */}
              <div className="px-3 flex items-center justify-end gap-1 font-black tabular-nums">
                <span className={cn(
                  "text-sm",
                  failed > 0 ? 'text-danger' : 'text-text-muted'
                )}>{failed}</span>
                <span className="text-text-muted text-xs">/</span>
                <span className={cn(
                  "text-sm",
                  blocked > 0 ? 'text-warning' : 'text-text-muted'
                )}>{blocked}</span>
                <span className="text-text-muted text-xs">/</span>
                <span className={cn(
                  "text-sm",
                  passed > 0 ? 'text-success' : 'text-text-muted'
                )}>{passed}</span>
              </div>
              
              {/* Progress */}
              <div className="px-3 text-right">
                <span className={cn(
                  "text-sm font-black tabular-nums",
                  progress === 100 ? "text-success" : "text-text-primary"
                )}>
                  {progress}%
                </span>
              </div>
              
              {/* Action */}
              <div className="px-3 text-right">
                {isFailing ? (
                  <button
                    onClick={() => onJumpToFailing(cycle.id)}
                    className="text-[11px] font-black text-danger hover:underline uppercase tracking-wide"
                  >
                    FIX →
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate(`cycles/${cycle.id}/execution`)}
                    className="text-[11px] font-bold text-brand-primary hover:underline uppercase tracking-wide"
                  >
                    VIEW
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
// ACCOUNTABILITY LOG - Forensic audit trail, monospace, no decoration
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
      <div className="divide-y divide-border-strong">
        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => (
          <div key={i} className="h-8 px-3 flex items-center">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-2">
        <span className="text-sm font-black text-text-muted uppercase tracking-widest">
          NO ACTIVITY
        </span>
      </div>
    );
  }

  const getAction = (type: string) => {
    switch (type) {
      case 'execution_failed': return 'FAILED';
      case 'execution_completed': return 'COMPLETED';
      case 'status_changed': return 'CHANGED';
      case 'case_updated': return 'UPDATED';
      case 'case_created': return 'CREATED';
      default: return 'MODIFIED';
    }
  };

  return (
    <div className="divide-y divide-border-strong text-xs">
      {/* Header */}
      <div className="grid grid-cols-[70px_60px_1fr_50px] gap-0 bg-surface-3 border-b-2 border-border-strong sticky top-0 z-10">
        <div className="px-2 py-1.5 text-[10px] font-black tracking-widest text-text-primary uppercase">ACTOR</div>
        <div className="px-2 py-1.5 text-[10px] font-black tracking-widest text-text-primary uppercase">ACTION</div>
        <div className="px-2 py-1.5 text-[10px] font-black tracking-widest text-text-primary uppercase">ENTITY</div>
        <div className="px-2 py-1.5 text-[10px] font-black tracking-widest text-text-primary uppercase text-right">TIME</div>
      </div>
      
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
          className="w-full grid grid-cols-[70px_60px_1fr_50px] gap-0 items-center h-8 text-left hover:bg-surface-2 transition-colors group"
        >
          {/* Actor - BOLD, truncate */}
          <span className="px-2 font-black text-text-primary truncate">
            {activity.user_name?.split(' ')[0] || 'System'}
          </span>
          
          {/* Action */}
          <span className={cn(
            "px-2 font-bold uppercase tracking-wide text-[10px]",
            activity.activity_type === 'execution_failed' ? 'text-danger' : 'text-text-muted'
          )}>
            {getAction(activity.activity_type)}
          </span>
          
          {/* Entity */}
          <span className="px-2 font-semibold text-text-secondary truncate group-hover:underline">
            {activity.entity_title}
          </span>
          
          {/* Time - MONOSPACE */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-2 text-[10px] text-text-muted tabular-nums font-mono text-right">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: false }).replace(' minutes', 'm').replace(' hours', 'h').replace(' days', 'd').replace('about ', '').replace('less than a minute', '<1m')}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs font-mono">
              {format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss')}
            </TooltipContent>
          </Tooltip>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE - Zero whitespace, packed, scrolling required
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
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity(scopeType, scopeId, 30);
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

  // Sort cycles by failure severity - show more
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
    .slice(0, 25); // More rows

  // Run button guardrails
  const canRun = isProjectScope && (metrics?.totalCases || 0) > 0;
  const runDisabledReason = !isProjectScope 
    ? 'Operational testing is available at Project scope' 
    : (metrics?.totalCases || 0) === 0 
    ? 'Create test cases and a cycle first' 
    : '';

  return (
    <div className="flex flex-col h-full -m-6 bg-surface-1">
      {/* 1. COMMAND RAIL - Dominant status bar */}
      <CommandRail 
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

      {/* Context bar - Compact, operational */}
      <div className="flex items-center justify-between px-4 h-8 bg-surface-3 border-b-2 border-border-strong">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-black text-text-primary uppercase tracking-widest">
            {scopeType === 'project' ? 'PROJECT SCOPE' : 'PROGRAM SCOPE'}
          </span>
          <span className="text-border-strong">|</span>
          <span className="text-text-secondary font-bold tabular-nums">{metrics?.activeCycles ?? 0} ACTIVE CYCLES</span>
          <span className="text-border-strong">|</span>
          <span className="text-text-secondary font-bold tabular-nums">{sortedCycles.length} DISPLAYED</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                onClick={() => setRunTestsOpen(true)}
                disabled={!canRun}
                className="h-6 px-3 text-[11px] font-black uppercase tracking-wide bg-brand-primary hover:bg-brand-primary-hover text-white disabled:opacity-50 gap-1"
              >
                <Play className="h-3 w-3" strokeWidth={3} />
                RUN TESTS
              </Button>
            </span>
          </TooltipTrigger>
          {runDisabledReason && (
            <TooltipContent className="text-xs font-bold">{runDisabledReason}</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* 2. SPLIT VIEW - 65/35 fixed grid, no gaps */}
      <div className="flex-1 grid grid-cols-[1fr_320px] divide-x-2 divide-border-strong overflow-hidden">
        
        {/* LEFT: ACTIVE EXECUTIONS */}
        <div className="flex flex-col min-h-0 overflow-hidden bg-surface-0">
          <div className="flex items-center justify-between px-3 h-9 border-b-2 border-border-strong bg-surface-3">
            <h2 className="text-[11px] font-black tracking-widest text-text-primary uppercase">
              ACTIVE EXECUTIONS
            </h2>
            <Link
              to={buildUrl('cycles')}
              className="text-[11px] font-black text-brand-primary hover:underline flex items-center uppercase tracking-wide"
            >
              ALL CYCLES <ChevronRight className="h-4 w-4" />
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

        {/* RIGHT: ACCOUNTABILITY LOG */}
        <div className="flex flex-col min-h-0 overflow-hidden bg-surface-0">
          <div className="flex items-center px-3 h-9 border-b-2 border-border-strong bg-surface-3">
            <h2 className="text-[11px] font-black tracking-widest text-text-primary uppercase">
              ACCOUNTABILITY LOG
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
