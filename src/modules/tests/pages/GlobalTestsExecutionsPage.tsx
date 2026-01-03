/**
 * GLOBAL TESTS EXECUTIONS PAGE
 * Execution management with run drawer and step-by-step capture
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  MoreHorizontal,
  RefreshCw,
  Filter,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { ExecutionRunDrawer } from '../components/ExecutionRunDrawer';
import { ImportResultsModal } from '../components/ImportResultsModal';

export function GlobalTestsExecutionsPage() {
  const [searchParams] = useSearchParams();
  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'global';
  const scopeId = searchParams.get('scopeId');
  const urlCycleId = searchParams.get('cycleId');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // SCOPE ENFORCEMENT: Test Executions are ONLY manageable at project level
  const isProjectScope = scopeType === 'project';

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>(urlCycleId || 'all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // SCOPE ENFORCEMENT: Block non-project scope
  if (!isProjectScope) {
    const { ProjectScopeRequired } = require('../components/ProjectScopeRequired');
    return <ProjectScopeRequired featureName="Test Executions" />;
  }

  // Fetch cycles for filter (always project scope after enforcement)
  const { data: cycles } = useQuery({
    queryKey: ['global-test-cycles-filter', 'project', scopeId],
    queryFn: async () => {
      let query = supabase
        .from('test_cycles')
        .select('id, key, name')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (scopeId) {
        query = query.eq('project_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!scopeId,
  });

  // Fetch executions (always project scope after enforcement)
  const { data: executions, isLoading, error, refetch } = useQuery({
    queryKey: ['global-test-executions', 'project', scopeId, cycleFilter],
    queryFn: async () => {
      let query = supabase
        .from('test_cycle_executions')
        .select(`
          id, status, executed_at, assigned_to, executed_by, comments, effort_minutes, cycle_id, case_id,
          test_case:case_id(id, title, priority, test_type),
          test_cycle:cycle_id(id, key, name, program_id, project_id)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (cycleFilter !== 'all') {
        query = query.eq('cycle_id', cycleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by project scope
      return (data || []).filter((exec: any) => {
        if (!scopeId) return true;
        return exec.test_cycle?.project_id === scopeId;
      });
    },
    enabled: !!user && !!scopeId,
  });

  // Filter executions
  const filteredExecutions = useMemo(() => {
    let result = executions || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((exec: any) =>
        exec.test_case?.title?.toLowerCase().includes(q) ||
        exec.test_cycle?.key?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((exec: any) => {
        if (statusFilter === 'not_run') {
          return exec.status === 'not_executed' || !exec.status;
        }
        return exec.status === statusFilter;
      });
    }

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

  // Get unique assignees for filter
  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    (executions || []).forEach((e: any) => {
      if (e.assigned_user?.id) {
        map.set(e.assigned_user.id, e.assigned_user.full_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [executions]);

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
          Failed to load executions: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search executions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default h-9"
            />
          </div>

          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="w-[160px] h-9 bg-surface-2 border-border-default">
              <SelectValue placeholder="All Cycles" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="all">All Cycles</SelectItem>
              {(cycles || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.key} - {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 bg-surface-2 border-border-default">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_run">Not Run</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[150px] h-9 bg-surface-2 border-border-default">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="all">All Assignees</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">{filteredExecutions.length} runs</span>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="text-center py-16 text-text-tertiary">
          <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No executions found</h3>
          <p className="text-sm mb-4">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Create a test cycle to start executing tests'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
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
                <th className="px-4 py-3 font-medium w-36">Executed</th>
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
                          {exec.assigned_user.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm text-text-secondary truncate">
                          {exec.assigned_user.full_name}
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
                          <Play className="h-4 w-4 mr-2" />
                          Execute
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

      {/* Drawers & Modals */}
      <ExecutionRunDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        executionId={selectedExecutionId}
        onComplete={() => refetch()}
      />

      <ImportResultsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        scopeType={scopeType}
        scopeId={scopeId}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default GlobalTestsExecutionsPage;
