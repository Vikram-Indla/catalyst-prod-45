/**
 * GLOBAL TESTS OVERVIEW - PROJECT-LEVEL RELEASE AUTHORITY
 * Enterprise-grade decision enforcement system
 * 
 * TRUTH: Tests exist ONLY at Project level
 * No fake scope controls. No decorative inputs.
 */

import React, { useState, useMemo } from 'react';
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
  Folder,
  Info,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestMetrics, useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { useRecentTestActivity } from '../hooks/useRecentTestActivity';
import { useStoryCoverage } from '../hooks/useStoryCoverage';
import { RunTestsModal } from '../components/RunTestsModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT SELECTOR - LOCKED TO PROJECT LEVEL (NO FAKE SCOPE)
// ═══════════════════════════════════════════════════════════════════

function ProjectSelector({
  projectId,
  onProjectChange,
  projects,
  isLoading,
}: {
  projectId: string | null;
  onProjectChange: (id: string) => void;
  projects: Array<{ id: string; name: string; key?: string }>;
  isLoading: boolean;
}) {
  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-2 border border-border-default rounded text-xs text-text-muted cursor-help">
              <Folder className="h-3 w-3" />
              <span>Project</span>
              <Info className="h-3 w-3 opacity-60" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px]">
            <p className="text-xs">
              <strong>Tests are managed at Project level only.</strong>
              <br />
              Enterprise and Program aggregation is not available.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Select value={projectId || ''} onValueChange={onProjectChange} disabled={isLoading}>
        <SelectTrigger className="h-8 w-[200px] text-xs bg-surface-0 border-border-default">
          <SelectValue placeholder={isLoading ? "Loading..." : "Select project"} />
        </SelectTrigger>
        <SelectContent className="bg-surface-0 max-h-[300px]">
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                {project.key && (
                  <Badge variant="outline" className="text-[9px] px-1 font-mono">
                    {project.key}
                  </Badge>
                )}
                <span className="truncate">{project.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RELEASE STATUS BANNER - SYSTEM STATE
// ═══════════════════════════════════════════════════════════════════

function ReleaseStatusBanner({ 
  status, 
  blockerCount,
  failedCount,
  projectName,
  isLoading,
  hasProject,
}: { 
  status: ReleaseStatus; 
  blockerCount: number;
  failedCount: number;
  projectName: string | null;
  isLoading: boolean;
  hasProject: boolean;
}) {
  if (!hasProject) {
    return (
      <div className="w-full bg-surface-2 border-b border-border-default py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Folder className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-text-primary mb-1">
            Select a Project
          </h1>
          <p className="text-sm text-text-muted">
            Tests are managed at the project level. Select a project above to view release status.
          </p>
        </div>
      </div>
    );
  }

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
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 animate-pulse">
              <Octagon className="h-14 w-14 text-danger fill-danger/20" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black tracking-tight text-danger uppercase">
                  RELEASE CANNOT PROCEED
                </h1>
                <Badge className="bg-danger text-danger-foreground text-xs font-bold px-2 py-0.5 animate-pulse">
                  BLOCKED
                </Badge>
              </div>
              <p className="text-base text-danger/80 font-medium">
                Executive action required. Shipment is blocked by unresolved risk.
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-danger/60">
                <span className="font-semibold text-danger/80">{projectName}</span>
                <span>•</span>
                <span className="font-mono">{failedCount} failed</span>
                <span>•</span>
                <span className="font-mono">{blockerCount} blocked</span>
                <span>•</span>
                <span className="font-mono">{format(new Date(), 'HH:mm:ss')}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button variant="destructive" size="lg" className="font-bold uppercase tracking-wide">
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
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <ShieldAlert className="h-12 w-12 text-warning" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-warning uppercase">
                  RELEASE AT RISK
                </h1>
                <Badge className="bg-warning/20 text-warning border border-warning/40 text-xs font-semibold px-2 py-0.5">
                  CAUTION
                </Badge>
              </div>
              <p className="text-sm text-warning/70 font-medium">
                Issues detected that may impact release timeline. Review required.
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-warning/50">
                <span className="font-semibold text-warning/70">{projectName}</span>
                <span>•</span>
                <span className="font-mono">{format(new Date(), 'HH:mm:ss')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // READY state
  return (
    <div className="w-full bg-gradient-to-b from-[hsl(173,58%,8%)] to-[hsl(173,40%,12%)] dark:from-[hsl(173,58%,5%)] dark:to-[hsl(173,40%,8%)] border-b border-success/30">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-4">
          <Shield className="h-10 w-10 text-success" strokeWidth={2} />
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-success uppercase">
              READY FOR RELEASE
            </h1>
            <p className="text-sm text-success/60">
              All checks passed. No blocking issues detected.
            </p>
          </div>
          <div className="text-xs text-success/40">
            <span className="font-semibold text-success/60 mr-2">{projectName}</span>
            <span className="font-mono">{format(new Date(), 'HH:mm:ss')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// THREAT CARDS
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
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertOctagon className={cn(
            'h-4 w-4',
            releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-warning'
          )} />
          <span className={cn(
            'text-xs font-bold uppercase tracking-wider',
            releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-warning'
          )}>
            {causes.length} Blocking {causes.length === 1 ? 'Issue' : 'Issues'} — Action Required
          </span>
        </div>
        <div className="grid gap-2">
          {causes.map(cause => (
            <button
              key={cause.id}
              onClick={() => onNavigate(cause.navigateTo)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-md text-left transition-all border-l-[6px]',
                cause.severity === 'critical' && 'bg-danger/10 border-l-danger hover:bg-danger/15',
                cause.severity === 'high' && 'bg-warning/10 border-l-warning hover:bg-warning/15',
                cause.severity === 'medium' && 'bg-info/10 border-l-info hover:bg-info/15',
              )}
            >
              <div className={cn(
                'flex-shrink-0 p-2 rounded',
                cause.severity === 'critical' && 'bg-danger/20',
                cause.severity === 'high' && 'bg-warning/20',
                cause.severity === 'medium' && 'bg-info/20',
              )}>
                {cause.severity === 'critical' ? (
                  <XCircle className="h-6 w-6 text-danger" strokeWidth={2.5} />
                ) : cause.severity === 'high' ? (
                  <AlertTriangle className="h-6 w-6 text-warning" strokeWidth={2.5} />
                ) : (
                  <Target className="h-6 w-6 text-info" strokeWidth={2} />
                )}
              </div>
              <div className="flex-1 min-w-0">
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
              <div className={cn(
                'flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold uppercase',
                cause.severity === 'critical' && 'bg-danger text-danger-foreground',
                cause.severity === 'high' && 'bg-warning text-warning-foreground',
                cause.severity === 'medium' && 'bg-info/20 text-info',
              )}>
                Resolve
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// METRICS STRIP WITH EXPLANATIONS
// ═══════════════════════════════════════════════════════════════════

function MetricsStrip({
  metrics,
  coverage,
  releaseStatus,
  isLoading,
  hasProject,
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
  coverage: { uncoveredCount: number; coveragePercent: number; totalStories: number } | null;
  releaseStatus: ReleaseStatus;
  isLoading: boolean;
  hasProject: boolean;
  onNavigate: (path: string) => void;
}) {
  if (!hasProject) return null;
  
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

  // Check for metric contradictions
  const hasCoverageContradiction = (coverage?.coveragePercent || 0) === 0 && totalExecuted > 0;

  const strips = [
    {
      label: 'FAILED',
      value: metrics?.failed || 0,
      sublabel: 'blocking release',
      tooltip: 'Test executions that failed and require resolution',
      isDanger: (metrics?.failed || 0) > 0,
      isWarning: false,
      isDominant: (metrics?.failed || 0) > 0,
      path: 'executions?status=failed',
    },
    {
      label: 'BLOCKED',
      value: metrics?.blocked || 0,
      sublabel: 'awaiting deps',
      tooltip: 'Tests blocked by dependencies or environment issues',
      isDanger: (metrics?.blocked || 0) > 3,
      isWarning: (metrics?.blocked || 0) > 0 && (metrics?.blocked || 0) <= 3,
      isDominant: (metrics?.blocked || 0) > 0,
      path: 'executions?status=blocked',
    },
    {
      label: 'UNCOVERED',
      value: coverage?.uncoveredCount || 0,
      sublabel: `of ${coverage?.totalStories || 0} stories`,
      tooltip: 'User stories with no linked test cases. Coverage tracks requirements, not executions.',
      isDanger: false,
      isWarning: (coverage?.uncoveredCount || 0) > 5,
      isDominant: false,
      hasContradiction: hasCoverageContradiction,
      path: 'traceability',
    },
    {
      label: 'PASSED',
      value: metrics?.passed || 0,
      sublabel: `${metrics?.passRate || 0}% rate`,
      tooltip: 'Test executions that passed successfully',
      isDanger: false,
      isWarning: false,
      isDominant: false,
      isSecondary: releaseStatus !== 'READY',
      path: 'executions?status=passed',
    },
    {
      label: 'EXECUTED',
      value: `${executionRate}%`,
      sublabel: `${totalExecuted}/${totalExecuted + totalPending}`,
      tooltip: 'Percentage of test executions completed (passed + failed + blocked)',
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
      tooltip: hasCoverageContradiction 
        ? 'Coverage tracks story→test links, not execution results. 0% means no stories have linked tests.'
        : 'Percentage of user stories with linked test cases',
      isDanger: false,
      isWarning: (coverage?.coveragePercent || 0) < 50,
      isDominant: false,
      isTertiary: releaseStatus !== 'READY',
      hasContradiction: hasCoverageContradiction,
      path: 'traceability',
    },
  ];

  return (
    <TooltipProvider>
      <div className={cn('border-b overflow-x-auto', borderColor, riskTint)}>
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-stretch gap-0.5 min-w-max">
            {strips.map((strip, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate(strip.path)}
                    className={cn(
                      'flex-1 min-w-[90px] px-3 py-2 text-left rounded transition-all relative',
                      'hover:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-border-focus',
                      strip.isDominant && strip.isDanger && 'bg-danger/10 hover:bg-danger/15',
                      strip.isDominant && strip.isWarning && 'bg-warning/10 hover:bg-warning/15',
                      strip.hasContradiction && 'ring-1 ring-warning/50',
                    )}
                  >
                    {strip.hasContradiction && (
                      <HelpCircle className="absolute top-1 right-1 h-3 w-3 text-warning" />
                    )}
                    <div className={cn(
                      'text-[9px] font-bold uppercase tracking-wider',
                      strip.isDanger ? 'text-danger' : strip.isWarning ? 'text-warning' : 'text-text-muted',
                      strip.isTertiary && 'opacity-60',
                    )}>
                      {strip.label}
                    </div>
                    <div className={cn(
                      'tabular-nums',
                      strip.isDominant ? 'text-2xl font-black' : 'text-lg font-bold',
                      strip.isDanger ? 'text-danger' : strip.isWarning ? 'text-warning' : 'text-text-primary',
                      strip.isSecondary && 'text-text-secondary opacity-70',
                      strip.isTertiary && 'text-text-muted opacity-50 text-base',
                    )}>
                      {strip.value}
                    </div>
                    <div className={cn(
                      'text-[9px] truncate',
                      strip.isDanger ? 'text-danger/70' : strip.isWarning ? 'text-warning/70' : 'text-text-muted',
                      (strip.isSecondary || strip.isTertiary) && 'opacity-50',
                    )}>
                      {strip.sublabel}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">{strip.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION ROW
// ═══════════════════════════════════════════════════════════════════

function ExecutionRow({ cycle, onNavigate }: { cycle: any; onNavigate: (path: string) => void }) {
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
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b',
        isFailing && 'bg-danger/[0.06] border-l-4 border-l-danger border-b-danger/20 hover:bg-danger/10',
        isBlocked && 'bg-warning/[0.04] border-l-4 border-l-warning border-b-warning/20 hover:bg-warning/[0.08]',
        !isFailing && !isBlocked && 'border-border-subtle hover:bg-surface-2',
      )}
    >
      <div className="flex-shrink-0">
        {isFailing ? (
          <XCircle className="h-5 w-5 text-danger" strokeWidth={2.5} />
        ) : isBlocked ? (
          <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={2} />
        ) : pending > 0 ? (
          <Clock className="h-5 w-5 text-info" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-success" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold text-sm truncate', isFailing ? 'text-danger' : 'text-text-primary')}>
            {cycle.name}
          </span>
          {isFailing && (
            <Badge className="bg-danger text-danger-foreground text-[9px] font-black px-1.5 py-0 uppercase animate-pulse">
              FAILING
            </Badge>
          )}
          {isBlocked && (
            <Badge className="bg-warning/20 text-warning border border-warning/30 text-[9px] font-bold px-1.5 py-0 uppercase">
              BLOCKED
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
          {isFailing && <span className="text-danger font-bold">{failed} failed</span>}
          {isBlocked && <span className="text-warning font-semibold">{blocked} blocked</span>}
          <span className="text-success">{passed} passed</span>
          <span className="text-text-muted">{pending} pending</span>
        </div>
      </div>
      <div className="flex-shrink-0 w-16 text-right">
        <div className={cn('text-sm font-bold tabular-nums', isFailing ? 'text-danger' : isBlocked ? 'text-warning' : 'text-text-primary')}>
          {progress}%
        </div>
        <div className="w-full h-1.5 bg-surface-3 rounded-full mt-1 overflow-hidden">
          <div className={cn('h-full transition-all', isFailing ? 'bg-danger' : isBlocked ? 'bg-warning' : 'bg-success')} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <ChevronRight className={cn('h-4 w-4 flex-shrink-0', isFailing ? 'text-danger' : 'text-text-muted')} />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNTABILITY ITEM
// ═══════════════════════════════════════════════════════════════════

function AccountabilityItem({ activity, onNavigate }: { activity: any; onNavigate: (path: string) => void }) {
  const isFailed = activity.activity_type === 'execution_failed';
  
  const getIcon = () => {
    switch (activity.activity_type) {
      case 'execution_failed': return <XCircle className="h-4 w-4 text-danger" strokeWidth={2.5} />;
      case 'execution_completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      default: return <Activity className="h-4 w-4 text-text-muted" />;
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
        if (activity.entity_type === 'test_case') onNavigate(`cases?caseId=${activity.entity_id}`);
        else if (activity.entity_type === 'test_cycle') onNavigate(`cycles?cycleId=${activity.entity_id}`);
      }}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all border-b',
        isFailed && 'bg-danger/[0.04] border-l-4 border-l-danger hover:bg-danger/[0.08]',
        !isFailed && 'border-border-subtle hover:bg-surface-2',
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isFailed && 'font-semibold')}>
          <span className={cn('font-bold', isFailed ? 'text-danger' : 'text-text-primary')}>{activity.user_name}</span>
          <span className={cn('mx-1', isFailed ? 'text-danger font-bold' : 'text-text-muted')}>{getAction()}</span>
          <span className={isFailed ? 'text-danger' : 'text-text-primary'}>{activity.entity_title}</span>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [runTestsOpen, setRunTestsOpen] = useState(false);

  // LOCKED TO PROJECT SCOPE - No fake multi-scope
  const projectId = searchParams.get('scopeId');

  // Fetch projects for selector
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Array<{ id: string; name: string; key?: string }>>({
    queryKey: ['test-projects-list'],
    queryFn: async (): Promise<Array<{ id: string; name: string; key?: string }>> => {
      const { data } = await (supabase.from('projects').select('id, name, key') as any);
      return (data || [])
        .filter((p: any) => p.is_active !== false)
        .map((p: any) => ({
          id: String(p.id),
          name: String(p.name),
          key: p.key ? String(p.key) : undefined,
        }));
    },
  });

  const selectedProject = projects.find((p: any) => p.id === projectId);
  const hasProject = !!projectId;

  const handleProjectChange = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('scopeType', 'project');
    params.set('scopeId', id);
    setSearchParams(params);
  };

  const buildUrl = (path: string, additionalParams?: string) => {
    const base = `/tests/${path}`;
    const params = new URLSearchParams();
    params.set('scopeType', 'project');
    if (projectId) params.set('scopeId', projectId);
    if (additionalParams) {
      additionalParams.split('&').forEach(p => {
        const [k, v] = p.split('=');
        if (k && v) params.set(k, v);
      });
    }
    return `${base}?${params.toString()}`;
  };

  const handleNavigate = (path: string) => navigate(buildUrl(path));

  // Fetch data - only when project selected
  const { metrics, isLoading: metricsLoading, refetch } = useGlobalTestMetrics('project', projectId);
  const { data: cycles, isLoading: cyclesLoading } = useGlobalTestCycles('project', projectId);
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity('project', projectId, 15);
  const { data: coverage, isLoading: coverageLoading } = useStoryCoverage('project', projectId);

  const isLoading = hasProject && (metricsLoading || cyclesLoading || coverageLoading);

  // Determine release status
  const releaseStatus: ReleaseStatus = useMemo(() => {
    if (!hasProject || !metrics) return 'READY';
    if ((metrics.failed || 0) > 0) return 'BLOCKED';
    if ((metrics.blocked || 0) > 2) return 'BLOCKED';
    if ((metrics.blocked || 0) > 0) return 'AT_RISK';
    if ((coverage?.coveragePercent || 0) < 40) return 'AT_RISK';
    if ((metrics.passRate || 0) < 70) return 'AT_RISK';
    return 'READY';
  }, [hasProject, metrics, coverage]);

  // Build blocker causes
  const blockerCauses: BlockerCause[] = useMemo(() => {
    if (!hasProject) return [];
    const causes: BlockerCause[] = [];
    
    if ((metrics?.failed || 0) > 0) {
      causes.push({
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
      causes.push({
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
      causes.push({
        id: 'coverage',
        type: 'coverage',
        title: 'Stories Without Coverage',
        count: coverage?.uncoveredCount || 0,
        severity: (coverage?.uncoveredCount || 0) > 15 ? 'high' : 'medium',
        navigateTo: 'traceability',
        description: 'Requirements with no linked test cases',
      });
    }
    
    return causes;
  }, [hasProject, metrics, coverage]);

  // Sort cycles by failure severity
  const sortedCycles = useMemo(() => {
    if (!hasProject) return [];
    return (cycles || [])
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
  }, [hasProject, cycles]);

  // Sort activities - failures first
  const sortedActivities = useMemo(() => {
    if (!hasProject) return [];
    return [...(activities || [])].sort((a: any, b: any) => {
      if (a.activity_type === 'execution_failed' && b.activity_type !== 'execution_failed') return -1;
      if (a.activity_type !== 'execution_failed' && b.activity_type === 'execution_failed') return 1;
      return 0;
    });
  }, [hasProject, activities]);

  const riskBorderClass = releaseStatus === 'BLOCKED' ? 'divide-danger/10' : releaseStatus === 'AT_RISK' ? 'divide-warning/10' : 'divide-border-default';

  return (
    <div className="flex flex-col h-full -m-6">
      {/* PROJECT SELECTOR - LOCKED TO PROJECT LEVEL */}
      <div className="bg-surface-0 border-b border-border-default">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold text-text-primary">Release Readiness</h1>
            <ProjectSelector
              projectId={projectId}
              onProjectChange={handleProjectChange}
              projects={projects}
              isLoading={projectsLoading}
            />
          </div>
          {hasProject && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 gap-1 text-[10px] px-2">
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setRunTestsOpen(true)}
                className="h-7 gap-1 text-[10px] px-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground"
              >
                <Play className="h-3 w-3" />
                Run Tests
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SYSTEM STATE BANNER */}
      <ReleaseStatusBanner 
        status={releaseStatus}
        blockerCount={metrics?.blocked || 0}
        failedCount={metrics?.failed || 0}
        projectName={selectedProject?.name || null}
        isLoading={isLoading}
        hasProject={hasProject}
      />

      {/* THREAT CARDS */}
      {hasProject && (
        <ThreatCards 
          causes={blockerCauses}
          isLoading={isLoading}
          releaseStatus={releaseStatus}
          onNavigate={handleNavigate}
        />
      )}

      {/* METRICS STRIP */}
      <MetricsStrip
        metrics={metrics}
        coverage={coverage ? { ...coverage, totalStories: coverage.totalStories } : null}
        releaseStatus={releaseStatus}
        isLoading={isLoading}
        hasProject={hasProject}
        onNavigate={handleNavigate}
      />

      {/* SPLIT VIEW */}
      {hasProject && (
        <div className="flex-1 overflow-hidden bg-surface-1">
          <div className="max-w-7xl mx-auto h-full">
            <div className={cn('grid grid-cols-1 lg:grid-cols-2 h-full divide-x', riskBorderClass)}>
              {/* LEFT: Active Executions */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className={cn(
                  'px-4 py-2 border-b flex items-center justify-between',
                  releaseStatus === 'BLOCKED' ? 'bg-danger/[0.03] border-danger/10' : releaseStatus === 'AT_RISK' ? 'bg-warning/[0.02] border-warning/10' : 'bg-surface-0 border-border-default'
                )}>
                  <div className="flex items-center gap-2">
                    <Activity className={cn('h-4 w-4', releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-text-muted')} />
                    <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Active Executions</h2>
                    {sortedCycles.filter((c: any) => c._failed > 0).length > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0">
                        {sortedCycles.filter((c: any) => c._failed > 0).length} failing
                      </Badge>
                    )}
                  </div>
                  <Link to={buildUrl('cycles')} className="text-[10px] text-brand-primary hover:underline flex items-center gap-0.5">
                    All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto bg-surface-0">
                  {cyclesLoading ? (
                    <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                  ) : sortedCycles.length === 0 ? (
                    <div className="p-4">
                      <div className="text-text-muted text-xs mb-2">No active test cycles</div>
                      <Button variant="outline" size="sm" onClick={() => handleNavigate('cycles')} className="h-7 text-[10px]">
                        Create Cycle
                      </Button>
                    </div>
                  ) : (
                    sortedCycles.map((cycle: any) => <ExecutionRow key={cycle.id} cycle={cycle} onNavigate={handleNavigate} />)
                  )}
                </div>
              </div>

              {/* RIGHT: Team Activity */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className={cn(
                  'px-4 py-2 border-b flex items-center justify-between',
                  releaseStatus === 'BLOCKED' ? 'bg-danger/[0.03] border-danger/10' : releaseStatus === 'AT_RISK' ? 'bg-warning/[0.02] border-warning/10' : 'bg-surface-0 border-border-default'
                )}>
                  <div className="flex items-center gap-2">
                    <User className={cn('h-4 w-4', releaseStatus === 'BLOCKED' ? 'text-danger' : 'text-text-muted')} />
                    <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Accountability</h2>
                  </div>
                  <Link to={buildUrl('reports')} className="text-[10px] text-brand-primary hover:underline flex items-center gap-0.5">
                    Report <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto bg-surface-0">
                  {activitiesLoading ? (
                    <div className="p-4 space-y-2">{[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : !sortedActivities?.length ? (
                    <div className="p-4 text-text-muted text-xs">No recent activity</div>
                  ) : (
                    sortedActivities.map((activity: any) => <AccountabilityItem key={activity.id} activity={activity} onNavigate={handleNavigate} />)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <RunTestsModal open={runTestsOpen} onOpenChange={setRunTestsOpen} scopeType="project" scopeId={projectId} />
    </div>
  );
}

export default GlobalTestsOverviewPage;
