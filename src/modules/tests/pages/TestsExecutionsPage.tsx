/**
 * TEST EXECUTIONS PAGE
 * View and manage test execution runs with filters and execution workspace
 */

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter,
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectExecutions, useProjectTestCycles } from '@/hooks/useProjectTestMetrics';
import { ExecutionDrawer } from '../components/ExecutionDrawer';
import { RunTestsModal } from '../components/RunTestsModal';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function TestsExecutionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  
  // Get filter from URL if present (for deep-links from overview)
  const urlStatus = searchParams.get('status');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || 'all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [runTestsOpen, setRunTestsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    executions,
    isLoading,
    error,
  } = useProjectExecutions(projectId || '', cycleFilter !== 'all' ? cycleFilter : undefined);

  const { cycles } = useProjectTestCycles(projectId || '');

  // Fetch assignees for filter
  const { data: assignees } = useQuery({
    queryKey: ['project-execution-assignees', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from('test_cycle_executions')
        .select('assigned_to, assigned_user:profiles!test_cycle_executions_assigned_to_fkey(id, full_name)')
        .not('assigned_to', 'is', null);
      
      // Dedupe by user id
      const uniqueUsers = new Map<string, string>();
      data?.forEach((e: any) => {
        if (e.assigned_user?.id) {
          uniqueUsers.set(e.assigned_user.id, e.assigned_user.full_name);
        }
      });
      
      return Array.from(uniqueUsers.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!projectId,
  });

  const filteredExecutions = useMemo(() => {
    let result = executions;
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((exec: any) =>
        exec.test_case?.title?.toLowerCase().includes(q) ||
        exec.test_cycle?.key?.toLowerCase().includes(q)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((exec: any) => {
        if (statusFilter === 'not_run' || statusFilter === 'not_executed') {
          return exec.status === 'not_executed' || exec.status === 'not_run' || !exec.status;
        }
        return exec.status === statusFilter;
      });
    }
    
    // Assignee filter
    if (assigneeFilter !== 'all') {
      result = result.filter((exec: any) => exec.assigned_to === assigneeFilter);
    }
    
    return result;
  }, [executions, searchQuery, statusFilter, assigneeFilter]);

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

  const handleRowClick = (execId: string) => {
    setSelectedExecutionId(execId);
    setDrawerOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredExecutions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExecutions.map((e: any) => e.id)));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCycleFilter('all');
    setAssigneeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || cycleFilter !== 'all' || assigneeFilter !== 'all';

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load executions: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search executions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default"
            />
          </div>
          
          {/* Cycle Filter */}
          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="w-[160px] bg-surface-2 border-border-default">
              <SelectValue placeholder="All Cycles" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="all">All Cycles</SelectItem>
              {cycles.map((cycle: any) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.key} - {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-surface-2 border-border-default">
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

          {/* Assignee Filter */}
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px] bg-surface-2 border-border-default">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="all">All Assignees</SelectItem>
              {assignees?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
        
        <Button onClick={() => setRunTestsOpen(true)}>
          <Play className="h-4 w-4 mr-1.5" />
          Run Tests
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          {filteredExecutions.length} execution{filteredExecutions.length !== 1 ? 's' : ''}
          {hasActiveFilters && ` (filtered)`}
        </span>
        {selectedIds.size > 0 && (
          <span className="text-accent-primary font-medium">
            {selectedIds.size} selected
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filteredExecutions.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <Play className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Test Executions</h3>
          <p className="text-text-secondary mb-4">
            {hasActiveFilters 
              ? 'No executions match your filters.' 
              : 'Run tests to see execution results here.'}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => setRunTestsOpen(true)}>
              <Play className="h-4 w-4 mr-1.5" />
              Run Tests
            </Button>
          )}
        </Card>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border-default">
              <tr className="text-left text-xs text-text-tertiary uppercase tracking-wide">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={selectedIds.size === filteredExecutions.length && filteredExecutions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Test Case</th>
                <th className="px-4 py-3 font-medium w-28">Status</th>
                <th className="px-4 py-3 font-medium w-32">Cycle</th>
                <th className="px-4 py-3 font-medium w-36">Assignee</th>
                <th className="px-4 py-3 font-medium w-36">Executed At</th>
                <th className="px-4 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filteredExecutions.map((exec: any) => (
                <tr
                  key={exec.id}
                  className={cn(
                    'hover:bg-surface-hover cursor-pointer transition-colors',
                    selectedIds.has(exec.id) && 'bg-accent-subtle/30'
                  )}
                  onClick={() => handleRowClick(exec.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(exec.id)}
                      onCheckedChange={() => toggleSelect(exec.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(exec.status)}
                      <p className="text-sm font-medium text-text-primary truncate max-w-[300px]">
                        {exec.test_case?.title || '—'}
                      </p>
                    </div>
                    {exec.test_case?.priority && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {exec.test_case.priority}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('capitalize text-xs', getStatusColor(exec.status || 'not_executed'))}>
                      {(exec.status || 'not_executed').replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {exec.test_cycle?.key || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {exec.assigned_user ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent-subtle flex items-center justify-center text-xs font-medium text-accent-primary">
                          {(exec.assigned_user as any)?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm text-text-secondary truncate">
                          {(exec.assigned_user as any)?.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-text-tertiary">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {exec.executed_at ? format(new Date(exec.executed_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                        <DropdownMenuItem onClick={() => handleRowClick(exec.id)}>
                          Execute
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            if (exec.test_case?.id) {
                              // Open test case in a new tab or navigate
                              window.open(`/projects/${projectId}/tests/cases?caseId=${exec.test_case.id}`, '_blank');
                            }
                          }}
                          disabled={!exec.test_case?.id}
                        >
                          View Test Case
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Execution Drawer */}
      <ExecutionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        executionId={selectedExecutionId}
        projectId={projectId || ''}
      />

      {/* Run Tests Modal */}
      <RunTestsModal
        open={runTestsOpen}
        onOpenChange={setRunTestsOpen}
        scopeType="project"
        scopeId={projectId}
      />
    </div>
  );
}
