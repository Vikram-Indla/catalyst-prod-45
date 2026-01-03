/**
 * GLOBAL TESTS OVERVIEW - EXECUTIVE MISSION CONTROL
 * Cold, confident, authoritative release authority surface
 * 
 * SCOPE ENFORCEMENT:
 * - Test Management is ONLY available at Project scope
 * - Program/Enterprise scopes show READ-ONLY aggregated dashboards
 * - Operational actions (New Case, New Cycle, Execute) are HIDDEN at non-project scope
 * - Must drill-down to Project for any operational action
 * 
 * Design: Bloomberg/Stripe/Notion executive grade
 * Typography: Catalyst semantic system strictly enforced
 * Color: Danger/warning on metrics only, never backgrounds
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
  Folder,
  Info,
  ArrowRight,
  Activity,
  Lock,
  Building2,
  FolderKanban,
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
import { useTestScopeEnforcement, assertProjectScope } from '../hooks/useTestScopeEnforcement';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type ReleaseStatus = 'BLOCKED' | 'AT_RISK' | 'READY';

interface BlockingIssue {
  id: string;
  type: 'failed' | 'blocked' | 'coverage';
  count: number;
  label: string;
  description: string;
  path: string;
  severity: 1 | 2 | 3; // 1 = highest
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT SELECTOR - LOCKED TO PROJECT LEVEL
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
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-2 border border-border-subtle rounded c-caption text-text-muted cursor-help">
              <Folder className="h-3 w-3" />
              <span>Project</span>
              <Info className="h-3 w-3 opacity-50" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px]">
            <p className="c-caption">Tests are managed at Project level only.</p>
          </TooltipContent>
        </Tooltip>
        
        <Select value={projectId || ''} onValueChange={onProjectChange} disabled={isLoading}>
          <SelectTrigger className="h-8 w-[200px] text-sm bg-surface-0 border-border-default">
            <SelectValue placeholder={isLoading ? "Loading..." : "Select project"} />
          </SelectTrigger>
          <SelectContent className="bg-surface-0 max-h-[300px]">
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  {project.key && (
                    <span className="c-caption font-mono text-text-muted">{project.key}</span>
                  )}
                  <span>{project.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATUS BANNER - FLAT SURFACE + THIN ACCENT BAR
// ═══════════════════════════════════════════════════════════════════

function StatusBanner({ 
  status, 
  projectName,
  failedCount,
  blockedCount,
  isLoading,
  hasProject,
  onResolve,
}: { 
  status: ReleaseStatus; 
  projectName: string | null;
  failedCount: number;
  blockedCount: number;
  isLoading: boolean;
  hasProject: boolean;
  onResolve: () => void;
}) {
  if (!hasProject) {
    return (
      <div className="bg-surface-2 border-b border-border-default py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Folder className="h-8 w-8 text-text-muted mx-auto mb-3" />
          <h1 className="c-title text-text-primary mb-1">Select a Project</h1>
          <p className="c-caption text-text-muted">
            Tests are managed at project level. Select a project to view release status.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-surface-2 border-b border-border-default py-8">
        <div className="max-w-6xl mx-auto px-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  const configs = {
    BLOCKED: {
      accentColor: 'bg-danger',
      statusText: 'BLOCKED',
      statusColor: 'text-danger',
      headline: 'Release Blocked',
      subtext: 'Executive action required before shipment can proceed.',
    },
    AT_RISK: {
      accentColor: 'bg-warning',
      statusText: 'AT RISK',
      statusColor: 'text-warning',
      headline: 'Release At Risk',
      subtext: 'Issues detected that may impact release timeline.',
    },
    READY: {
      accentColor: 'bg-success',
      statusText: 'READY',
      statusColor: 'text-success',
      headline: 'Ready for Release',
      subtext: 'All checks passed. No blocking issues detected.',
    },
  };

  const config = configs[status];

  return (
    <div className="bg-surface-2 border-b border-border-default">
      <div className={cn('h-1', config.accentColor)} />
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            {/* Status line */}
            <div className="flex items-center gap-3 mb-2">
              <span className={cn('c-overline font-bold tracking-widest', config.statusColor)}>
                {config.statusText}
              </span>
              <span className="c-caption text-text-muted font-mono">
                {projectName}
              </span>
            </div>
            
            {/* Headline */}
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight mb-1">
              {config.headline}
            </h1>
            
            {/* Subtext */}
            <p className="c-caption text-text-muted">
              {config.subtext}
            </p>

            {/* Metadata */}
            {status !== 'READY' && (
              <div className="flex items-center gap-4 mt-3 c-caption text-text-muted font-mono">
                {failedCount > 0 && (
                  <span><span className="text-danger font-semibold">{failedCount}</span> failed</span>
                )}
                {blockedCount > 0 && (
                  <span><span className="text-warning font-semibold">{blockedCount}</span> blocked</span>
                )}
                <span>Updated {format(new Date(), 'HH:mm')}</span>
              </div>
            )}
          </div>

          {/* Single Primary CTA */}
          {status === 'BLOCKED' && (
            <Button 
              onClick={onResolve}
              className="bg-danger hover:bg-danger/90 text-danger-foreground font-medium"
            >
              Resolve Blocking Failures
            </Button>
          )}
          {status === 'AT_RISK' && (
            <Button 
              variant="outline"
              onClick={onResolve}
              className="border-warning text-warning hover:bg-warning/10"
            >
              Review Issues
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KPI STRIP - NEUTRAL CONTAINERS, COLOR ON NUMBERS ONLY
// ═══════════════════════════════════════════════════════════════════

function KPIStrip({
  metrics,
  coverage,
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
  isLoading: boolean;
  hasProject: boolean;
  onNavigate: (path: string) => void;
}) {
  if (!hasProject) return null;
  
  if (isLoading) {
    return (
      <div className="bg-surface-0 border-b border-border-default">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="grid grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalExecuted = (metrics?.passed || 0) + (metrics?.failed || 0) + (metrics?.blocked || 0);
  const totalPending = metrics?.notRun || 0;
  const executionRate = totalExecuted + totalPending > 0 
    ? Math.round((totalExecuted / (totalExecuted + totalPending)) * 100) 
    : 0;

  const kpis = [
    {
      label: 'Failed',
      value: metrics?.failed || 0,
      sublabel: 'executions',
      tooltip: 'Test executions that failed and require resolution',
      valueColor: (metrics?.failed || 0) > 0 ? 'text-danger' : 'text-text-primary',
      path: 'executions?status=failed',
    },
    {
      label: 'Blocked',
      value: metrics?.blocked || 0,
      sublabel: 'tests',
      tooltip: 'Tests blocked by dependencies or environment issues',
      valueColor: (metrics?.blocked || 0) > 0 ? 'text-warning' : 'text-text-primary',
      path: 'executions?status=blocked',
    },
    {
      label: 'Uncovered',
      value: coverage?.uncoveredCount || 0,
      sublabel: `of ${coverage?.totalStories || 0} stories`,
      tooltip: 'User stories with no linked test cases',
      valueColor: (coverage?.uncoveredCount || 0) > 5 ? 'text-warning' : 'text-text-primary',
      path: 'traceability',
    },
    {
      label: 'Passed',
      value: metrics?.passed || 0,
      sublabel: 'executions',
      tooltip: 'Test executions that passed successfully',
      valueColor: 'text-text-primary',
      path: 'executions?status=passed',
    },
    {
      label: 'Execution',
      value: `${executionRate}%`,
      sublabel: `${totalExecuted}/${totalExecuted + totalPending}`,
      tooltip: 'Percentage of test executions completed',
      valueColor: 'text-text-secondary',
      path: 'executions',
    },
    {
      label: 'Coverage',
      value: `${coverage?.coveragePercent || 0}%`,
      sublabel: 'requirements',
      tooltip: 'Percentage of user stories with linked test cases',
      valueColor: (coverage?.coveragePercent || 0) < 50 ? 'text-warning' : 'text-text-secondary',
      path: 'traceability',
    },
  ];

  return (
    <TooltipProvider>
      <div className="bg-surface-0 border-b border-border-default">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((kpi, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate(kpi.path)}
                    className="bg-surface-1 border border-border-subtle rounded-md p-4 text-left hover:bg-surface-2 hover:border-border-default transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus"
                  >
                    <div className="c-overline text-text-muted mb-1">{kpi.label}</div>
                    <div className={cn('c-kpi-sm tabular-nums', kpi.valueColor)}>
                      {kpi.value}
                    </div>
                    <div className="c-caption text-text-muted mt-1">{kpi.sublabel}</div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="c-caption">{kpi.tooltip}</p>
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
// BLOCKING ISSUES - SEVERITY HIERARCHY
// ═══════════════════════════════════════════════════════════════════

function BlockingIssues({
  issues,
  isLoading,
  onNavigate,
}: {
  issues: BlockingIssue[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-surface-0 border-b border-border-default">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </div>
      </div>
    );
  }

  if (issues.length === 0) return null;

  // Sort by severity (1 = highest priority)
  const sortedIssues = [...issues].sort((a, b) => a.severity - b.severity);

  return (
    <div className="bg-surface-0 border-b border-border-default">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="c-overline text-text-muted mb-3">
          BLOCKING ISSUES ({issues.length})
        </div>
        <div className="space-y-2">
          {sortedIssues.map((issue, idx) => {
            // Reduce visual intensity as severity decreases
            const isHighest = issue.severity === 1;
            const isMiddle = issue.severity === 2;
            
            return (
              <button
                key={issue.id}
                onClick={() => onNavigate(issue.path)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-md border-l-4 text-left transition-colors',
                  'hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-border-focus',
                  isHighest && 'border-l-danger bg-surface-1',
                  isMiddle && 'border-l-warning bg-surface-1/50',
                  !isHighest && !isMiddle && 'border-l-info/50 bg-transparent',
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'flex-shrink-0',
                  isHighest && 'text-danger',
                  isMiddle && 'text-warning',
                  !isHighest && !isMiddle && 'text-text-muted',
                )}>
                  {issue.type === 'failed' && <XCircle className="h-5 w-5" />}
                  {issue.type === 'blocked' && <AlertTriangle className="h-5 w-5" />}
                  {issue.type === 'coverage' && <Target className="h-5 w-5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'c-kpi-sm tabular-nums',
                      isHighest && 'text-danger',
                      isMiddle && 'text-warning',
                      !isHighest && !isMiddle && 'text-text-secondary',
                    )}>
                      {issue.count}
                    </span>
                    <span className={cn(
                      'font-medium',
                      isHighest ? 'text-text-primary' : 'text-text-secondary',
                    )}>
                      {issue.label}
                    </span>
                  </div>
                  <p className="c-caption text-text-muted mt-0.5">
                    {issue.description}
                  </p>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  <span className={cn(
                    'c-caption font-medium flex items-center gap-1',
                    isHighest ? 'text-danger' : 'text-text-muted',
                  )}>
                    {isHighest ? 'Resolve' : 'View'}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
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
        'w-full flex items-center gap-4 p-3 text-left transition-colors border-b border-border-subtle',
        'hover:bg-surface-2 focus:outline-none',
        isFailing && 'border-l-2 border-l-danger',
        isBlocked && 'border-l-2 border-l-warning',
      )}
    >
      <div className="flex-shrink-0">
        {isFailing ? (
          <XCircle className="h-4 w-4 text-danger" />
        ) : isBlocked ? (
          <AlertTriangle className="h-4 w-4 text-warning" />
        ) : pending > 0 ? (
          <Clock className="h-4 w-4 text-text-muted" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-success" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary truncate">
            {cycle.name}
          </span>
          {isFailing && (
            <Badge variant="outline" className="text-danger border-danger/30 c-caption px-1.5 py-0">
              {failed} failed
            </Badge>
          )}
        </div>
        <div className="c-caption text-text-muted mt-0.5 tabular-nums">
          {passed} passed · {blocked} blocked · {pending} pending
        </div>
      </div>
      <div className="flex-shrink-0 w-16 text-right">
        <div className={cn(
          'text-sm font-semibold tabular-nums',
          isFailing ? 'text-danger' : 'text-text-primary'
        )}>
          {progress}%
        </div>
        <div className="w-full h-1 bg-surface-3 rounded-full mt-1 overflow-hidden">
          <div 
            className={cn('h-full', isFailing ? 'bg-danger' : isBlocked ? 'bg-warning' : 'bg-success')} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY ITEM
// ═══════════════════════════════════════════════════════════════════

function ActivityItem({ activity, onNavigate }: { activity: any; onNavigate: (path: string) => void }) {
  const isFailed = activity.activity_type === 'execution_failed';
  
  return (
    <button
      onClick={() => {
        if (activity.entity_type === 'test_case') onNavigate(`cases?caseId=${activity.entity_id}`);
        else if (activity.entity_type === 'test_cycle') onNavigate(`cycles?cycleId=${activity.entity_id}`);
      }}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-border-subtle',
        'hover:bg-surface-2 focus:outline-none',
        isFailed && 'border-l-2 border-l-danger',
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isFailed ? (
          <XCircle className="h-4 w-4 text-danger" />
        ) : activity.activity_type === 'execution_completed' ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Activity className="h-4 w-4 text-text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className={cn('font-medium', isFailed ? 'text-danger' : 'text-text-primary')}>
            {activity.user_name}
          </span>
          <span className="text-text-muted mx-1">
            {isFailed ? 'failed' : activity.activity_type === 'execution_completed' ? 'completed' : 'modified'}
          </span>
          <span className="text-text-primary">{activity.entity_title}</span>
        </p>
        <p className="c-caption text-text-muted mt-0.5">
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

  // SCOPE ENFORCEMENT - Test management only at project level
  const {
    scopeType,
    scopeId,
    isProjectScope,
    isReadOnlyScope,
    canExecuteTests,
    drillDownMessage,
  } = useTestScopeEnforcement();

  const projectId = isProjectScope ? scopeId : null;

  // Fetch projects
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

  // Fetch data
  const { metrics, isLoading: metricsLoading, refetch } = useGlobalTestMetrics('project', projectId);
  const { data: cycles, isLoading: cyclesLoading } = useGlobalTestCycles('project', projectId);
  const { data: activities, isLoading: activitiesLoading } = useRecentTestActivity('project', projectId, 10);
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

  // Build blocking issues with severity hierarchy
  const blockingIssues: BlockingIssue[] = useMemo(() => {
    if (!hasProject) return [];
    const issues: BlockingIssue[] = [];
    
    if ((metrics?.failed || 0) > 0) {
      issues.push({
        id: 'failed',
        type: 'failed',
        count: metrics?.failed || 0,
        label: 'Failed Executions',
        description: 'Test executions that failed and require immediate resolution',
        path: 'executions?status=failed',
        severity: 1,
      });
    }
    
    if ((metrics?.blocked || 0) > 0) {
      issues.push({
        id: 'blocked',
        type: 'blocked',
        count: metrics?.blocked || 0,
        label: 'Blocked Tests',
        description: 'Tests blocked by dependencies or environment issues',
        path: 'executions?status=blocked',
        severity: 2,
      });
    }
    
    if ((coverage?.uncoveredCount || 0) > 5) {
      issues.push({
        id: 'coverage',
        type: 'coverage',
        count: coverage?.uncoveredCount || 0,
        label: 'Missing Coverage',
        description: 'User stories with no linked test cases',
        path: 'traceability',
        severity: 3,
      });
    }
    
    return issues;
  }, [hasProject, metrics, coverage]);

  // Sort cycles by failure
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
      .slice(0, 8);
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

  const handleResolve = () => {
    if ((metrics?.failed || 0) > 0) {
      handleNavigate('executions?status=failed');
    } else if ((metrics?.blocked || 0) > 0) {
      handleNavigate('executions?status=blocked');
    }
  };

  // Handle opening Run Tests modal with scope assertion
  const handleRunTests = () => {
    assertProjectScope(scopeType); // Will throw if not project scope
    setRunTestsOpen(true);
  };

  // READ-ONLY AGGREGATE VIEW for Program/Enterprise scope
  if (isReadOnlyScope) {
    return (
      <div className="flex flex-col h-full -m-6 bg-surface-1">
        {/* HEADER BAR */}
        <div className="bg-surface-0 border-b border-border-default">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold text-text-primary">Release Readiness</h1>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 border border-warning/30 rounded c-caption text-warning">
                <Lock className="h-3 w-3" />
                <span className="capitalize">{scopeType}</span>
                <span className="text-text-muted">· Read-only</span>
              </div>
            </div>
          </div>
        </div>

        {/* READ-ONLY NOTICE */}
        <div className="bg-warning/5 border-b border-warning/20">
          <div className={cn('h-1 bg-warning/50')} />
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-start gap-4">
              {scopeType === 'enterprise' ? (
                <Building2 className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
              ) : (
                <FolderKanban className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="c-overline font-bold tracking-widest text-warning">
                    AGGREGATED VIEW
                  </span>
                </div>
                <h1 className="text-xl font-semibold text-text-primary tracking-tight mb-1">
                  Test Management Requires Project Scope
                </h1>
                <p className="c-caption text-text-muted mb-4">
                  {drillDownMessage}
                </p>
                <div className="flex items-center gap-3">
                  <Select onValueChange={handleProjectChange} disabled={projectsLoading}>
                    <SelectTrigger className="h-9 w-[250px] bg-surface-0 border-border-default">
                      <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project to continue"} />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-0">
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-3.5 w-3.5 text-text-muted" />
                            {project.key && (
                              <span className="c-caption font-mono text-text-muted">{project.key}</span>
                            )}
                            <span>{project.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AGGREGATE METRICS PLACEHOLDER */}
        <div className="max-w-6xl mx-auto px-6 py-8 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-0 border border-border-default rounded-lg p-6">
              <div className="c-overline text-text-muted mb-2">TOTAL PROJECTS</div>
              <div className="c-kpi-sm tabular-nums text-text-primary">{projects.length}</div>
              <p className="c-caption text-text-muted mt-1">with test suites</p>
            </div>
            <div className="bg-surface-0 border border-border-default rounded-lg p-6 opacity-60">
              <div className="c-overline text-text-muted mb-2">AGGREGATE METRICS</div>
              <div className="c-caption text-text-muted">
                <Lock className="h-4 w-4 inline mr-1" />
                Select project for details
              </div>
            </div>
            <div className="bg-surface-0 border border-border-default rounded-lg p-6 opacity-60">
              <div className="c-overline text-text-muted mb-2">RELEASE STATUS</div>
              <div className="c-caption text-text-muted">
                <Lock className="h-4 w-4 inline mr-1" />
                Select project for status
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 border border-dashed border-border-default rounded-lg text-center">
            <Folder className="h-8 w-8 text-text-muted mx-auto mb-3" />
            <h3 className="font-medium text-text-primary mb-1">Drill Down Required</h3>
            <p className="c-caption text-text-muted max-w-md mx-auto">
              Test cases, cycles, and executions are managed at the project level. 
              Select a project above to view detailed release readiness and manage tests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-6 bg-surface-1">
      {/* HEADER BAR */}
      <div className="bg-surface-0 border-b border-border-default">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-text-primary">Release Readiness</h1>
            <ProjectSelector
              projectId={projectId}
              onProjectChange={handleProjectChange}
              projects={projects}
              isLoading={projectsLoading}
            />
          </div>
          {hasProject && canExecuteTests && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 c-caption">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunTests}
                className="gap-1.5 c-caption"
              >
                <Play className="h-3.5 w-3.5" />
                Run Tests
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* STATUS BANNER */}
      <StatusBanner 
        status={releaseStatus}
        projectName={selectedProject?.name || null}
        failedCount={metrics?.failed || 0}
        blockedCount={metrics?.blocked || 0}
        isLoading={isLoading}
        hasProject={hasProject}
        onResolve={handleResolve}
      />

      {/* KPI STRIP */}
      <KPIStrip
        metrics={metrics}
        coverage={coverage ? { ...coverage, totalStories: coverage.totalStories } : null}
        isLoading={isLoading}
        hasProject={hasProject}
        onNavigate={handleNavigate}
      />

      {/* BLOCKING ISSUES */}
      {hasProject && (
        <BlockingIssues
          issues={blockingIssues}
          isLoading={isLoading}
          onNavigate={handleNavigate}
        />
      )}

      {/* SPLIT VIEW */}
      {hasProject && (
        <div className="flex-1 overflow-hidden">
          <div className="max-w-6xl mx-auto h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-x divide-border-default">
              {/* LEFT: Active Executions */}
              <div className="flex flex-col h-full overflow-hidden bg-surface-0">
                <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-text-muted" />
                    <span className="c-overline text-text-muted">ACTIVE EXECUTIONS</span>
                  </div>
                  <Link to={buildUrl('cycles')} className="c-caption text-brand-primary hover:underline flex items-center gap-1">
                    All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {cyclesLoading ? (
                    <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}</div>
                  ) : sortedCycles.length === 0 ? (
                    <div className="p-4">
                      <p className="c-caption text-text-muted mb-2">No active test cycles</p>
                      <Button variant="outline" size="sm" onClick={() => handleNavigate('cycles')} className="c-caption">
                        Create Cycle
                      </Button>
                    </div>
                  ) : (
                    sortedCycles.map((cycle: any) => <ExecutionRow key={cycle.id} cycle={cycle} onNavigate={handleNavigate} />)
                  )}
                </div>
              </div>

              {/* RIGHT: Team Activity */}
              <div className="flex flex-col h-full overflow-hidden bg-surface-0">
                <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-text-muted" />
                    <span className="c-overline text-text-muted">TEAM ACTIVITY</span>
                  </div>
                  <Link to={buildUrl('reports')} className="c-caption text-brand-primary hover:underline flex items-center gap-1">
                    Report <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {activitiesLoading ? (
                    <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}</div>
                  ) : !sortedActivities?.length ? (
                    <div className="p-4 c-caption text-text-muted">No recent activity</div>
                  ) : (
                    sortedActivities.map((activity: any) => <ActivityItem key={activity.id} activity={activity} onNavigate={handleNavigate} />)
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
