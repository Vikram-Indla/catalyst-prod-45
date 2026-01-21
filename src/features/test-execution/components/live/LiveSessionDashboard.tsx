/**
 * Module 4C-2: Live Session Dashboard
 * Real-time dashboard showing execution progress across all assignments in a run
 */

import React, { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRunAssignments } from '../../hooks/useRunAssignments';
import { ExecutionStatusBadge, getStatusColor } from './ExecutionStatusBadge';
import { cn } from '@/lib/utils';

interface LiveSessionDashboardProps {
  runId: string;
  runName: string;
  className?: string;
}

export function LiveSessionDashboard({
  runId,
  runName,
  className,
}: LiveSessionDashboardProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useRunAssignments(runId);

  const assignments = data?.assignments || [];
  const summary = data?.summary || {
    total: 0,
    pending: 0,
    in_progress: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const completed = summary.passed + summary.failed + summary.blocked + summary.skipped;
    const progress = summary.total > 0 ? Math.round((completed / summary.total) * 100) : 0;
    const passRate =
      summary.passed + summary.failed > 0
        ? Math.round((summary.passed / (summary.passed + summary.failed)) * 100)
        : 0;

    // Get active testers (unique testers with in_progress assignments)
    const activeTesters = new Set(
      assignments
        .filter((a) => a.status === 'in_progress')
        .map((a) => a.assigned_tester_id)
        .filter(Boolean)
    );

    return {
      completed,
      progress,
      passRate,
      activeTesters: activeTesters.size,
    };
  }, [summary, assignments]);

  // Real-time subscription for assignment updates
  useEffect(() => {
    const channel = supabase
      .channel(`live-session-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_run_case_assignments',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['run-assignments', runId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, queryClient]);

  // Get recently active assignments (last 5 updates)
  const recentActivity = useMemo(() => {
    return [...assignments]
      .filter((a) => a.status !== 'pending')
      .sort((a, b) => {
        const aTime = a.completed_at || a.started_at || '';
        const bTime = b.completed_at || b.started_at || '';
        return bTime.localeCompare(aTime);
      })
      .slice(0, 5);
  }, [assignments]);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-4', className)}>
        <div className="h-32 bg-muted rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.progress}%</p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.passRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.in_progress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.activeTesters}</p>
                <p className="text-xs text-muted-foreground">Active Testers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Execution Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {metrics.completed} of {summary.total} completed
              </span>
              <span className="font-medium">{metrics.progress}%</span>
            </div>
            <Progress value={metrics.progress} className="h-3" />
          </div>

          {/* Status breakdown */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Passed', value: summary.passed, color: 'text-green-600' },
              { label: 'Failed', value: summary.failed, color: 'text-red-600' },
              { label: 'Blocked', value: summary.blocked, color: 'text-orange-600' },
              { label: 'Skipped', value: summary.skipped, color: 'text-slate-500' },
              { label: 'Pending', value: summary.pending, color: 'text-muted-foreground' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-sm">
                <span className={cn('font-semibold', item.color)}>{item.value}</span>
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet. Start executing test cases!
            </p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {recentActivity.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {assignment.case_key}
                        </Badge>
                        <span className="text-sm truncate">
                          {assignment.case_title}
                        </span>
                      </div>
                      {assignment.assigned_tester_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {assignment.assigned_tester_name}
                        </p>
                      )}
                    </div>
                    <ExecutionStatusBadge status={assignment.status} size="sm" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
