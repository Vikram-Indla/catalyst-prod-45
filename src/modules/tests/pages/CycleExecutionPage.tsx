/**
 * CYCLE EXECUTION PAGE
 * Full-screen execution workspace for a specific test cycle
 * Route: /projects/:projectId/tests/cycles/:cycleId/execution
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ExecutionDrawer } from '../components/ExecutionDrawer';
import { TestsEmptyState } from '../components/TestsEmptyState';

export function CycleExecutionPage() {
  const { projectId, cycleId } = useParams<{ projectId: string; cycleId: string }>();
  const navigate = useNavigate();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch cycle details
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['test-cycle-detail', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  // Fetch executions for this cycle
  const { data: executions, isLoading: executionsLoading, refetch } = useQuery({
    queryKey: ['cycle-executions', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_case:test_cases(id, title, priority, test_type),
          assigned_user:profiles!test_cycle_executions_assigned_to_fkey(id, full_name)
        `)
        .eq('cycle_id', cycleId)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!cycleId,
  });

  const filteredExecutions = useMemo(() => {
    if (!executions) return [];
    if (statusFilter === 'all') return executions;
    
    return executions.filter((exec: any) => {
      if (statusFilter === 'not_run') {
        return exec.status === 'not_executed' || !exec.status;
      }
      return exec.status === statusFilter;
    });
  }, [executions, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = executions?.length || 0;
    const passed = executions?.filter((e: any) => e.status === 'passed').length || 0;
    const failed = executions?.filter((e: any) => e.status === 'failed').length || 0;
    const blocked = executions?.filter((e: any) => e.status === 'blocked').length || 0;
    const notRun = total - passed - failed - blocked;
    const executed = total - notRun;
    const progress = total > 0 ? Math.round((executed / total) * 100) : 0;
    const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;
    return { total, passed, failed, blocked, notRun, progress, passRate };
  }, [executions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-status-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-status-error" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-status-warning" />;
      default: return <Clock className="h-4 w-4 text-text-tertiary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-status-success bg-status-success/10';
      case 'failed': return 'text-status-error bg-status-error/10';
      case 'blocked': return 'text-status-warning bg-status-warning/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  const handleExecute = (executionId: string) => {
    setSelectedExecutionId(executionId);
    setDrawerOpen(true);
  };

  const isLoading = cycleLoading || executionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (!cycle) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Cycle not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/tests/cycles`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cycles
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{cycle.key}</Badge>
            <h1 className="text-xl font-semibold text-text-primary">{cycle.name}</h1>
          </div>
          <p className="text-text-tertiary text-sm">
            {cycle.environment || 'No environment'} • {cycle.build_version || 'No build'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Progress Summary */}
      <Card className="bg-surface-2 border-border-default p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary">{stats.total} test cases</span>
          <span className="text-text-primary font-semibold">{stats.progress}% complete</span>
        </div>
        <Progress value={stats.progress} className="h-3 mb-3" />
        <div className="grid grid-cols-4 gap-4 text-center">
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('passed')}
          >
            <p className="text-2xl font-bold text-status-success">{stats.passed}</p>
            <p className="text-xs text-text-tertiary">Passed</p>
          </div>
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('failed')}
          >
            <p className="text-2xl font-bold text-status-error">{stats.failed}</p>
            <p className="text-xs text-text-tertiary">Failed</p>
          </div>
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('blocked')}
          >
            <p className="text-2xl font-bold text-status-warning">{stats.blocked}</p>
            <p className="text-xs text-text-tertiary">Blocked</p>
          </div>
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('not_run')}
          >
            <p className="text-2xl font-bold text-text-tertiary">{stats.notRun}</p>
            <p className="text-xs text-text-tertiary">Not Run</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-surface-2 border-border-default">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-border-default">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_run">Not Run</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-text-tertiary">
          {filteredExecutions.length} of {stats.total} tests
        </span>
      </div>

      {/* Execution List */}
      {filteredExecutions.length === 0 ? (
        <TestsEmptyState type="executions" />
      ) : (
        <div className="space-y-2">
          {filteredExecutions.map((exec: any) => (
            <Card
              key={exec.id}
              className={cn(
                'bg-surface-2 border-border-default p-4 hover:bg-surface-hover cursor-pointer transition-colors',
                'flex items-center justify-between'
              )}
              onClick={() => handleExecute(exec.id)}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(exec.status || 'not_executed')}
                <div>
                  <p className="font-medium text-text-primary">
                    {exec.test_case?.title || 'Unknown Test'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">
                      {exec.test_case?.test_type || 'manual'}
                    </Badge>
                    {exec.test_case?.priority && (
                      <Badge variant="outline" className="text-xs">
                        {exec.test_case.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={cn('text-xs capitalize', getStatusColor(exec.status || 'not_executed'))}>
                  {(exec.status || 'not_executed').replace('_', ' ')}
                </Badge>
                <Button variant="ghost" size="sm" className="gap-1">
                  Execute
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Execution Drawer */}
      <ExecutionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        executionId={selectedExecutionId}
        projectId={projectId || ''}
      />
    </div>
  );
}

export default CycleExecutionPage;
