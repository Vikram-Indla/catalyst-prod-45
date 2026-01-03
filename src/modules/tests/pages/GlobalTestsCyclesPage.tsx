/**
 * GLOBAL TESTS CYCLES PAGE
 * Test cycle management with scope filtering, full CRUD, bulk actions
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  RefreshCcw,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Play,
  Calendar,
  Edit,
  Copy,
  Archive,
  Layers,
  Eye,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { CreateCycleModal } from '../components/CreateCycleModal';
import { TestCycleDetailDrawer } from '../components/TestCycleDetailDrawer';
import { AddToSetModal } from '../components/AddToSetModal';
import { ExecutionRunDrawer } from '../components/ExecutionRunDrawer';
import { TestFolderTree } from '../components/TestFolderTree';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { runMutationWithAudit, createPipelineContext } from '../lib/actionPipeline';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
    case 'in_progress': return 'text-status-success bg-status-success/10 border-status-success/20';
    case 'planned': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'completed': return 'text-text-tertiary bg-surface-3 border-border-default';
    case 'cancelled': return 'text-status-error bg-status-error/10 border-status-error/20';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GlobalTestsCyclesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'global';
  const scopeId = searchParams.get('scopeId');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // SCOPE ENFORCEMENT: Test Cycles are ONLY manageable at project level
  const isProjectScope = scopeType === 'project';

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [executionDrawerOpen, setExecutionDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderPanelOpen, setFolderPanelOpen] = useState(true);

  // Extract programId for folder tree
  const programId = scopeType === 'program' ? scopeId : searchParams.get('programId');

  // SCOPE ENFORCEMENT: Block non-project scope
  if (!isProjectScope) {
    const { ProjectScopeRequired } = require('../components/ProjectScopeRequired');
    return <ProjectScopeRequired featureName="Test Cycles" />;
  }

  // Data - only fetch if project scope
  const { data: cycles, isLoading, error, refetch } = useGlobalTestCycles(scopeType, scopeId);

  // Process cycles with execution stats
  const processedCycles = useMemo(() => {
    let result = (cycles || []).map((cycle: any) => {
      const execs = cycle.test_cycle_executions || [];
      const total = execs.length;
      const passed = execs.filter((e: any) => e.status === 'passed').length;
      const failed = execs.filter((e: any) => e.status === 'failed').length;
      const blocked = execs.filter((e: any) => e.status === 'blocked').length;
      const notRun = total - passed - failed - blocked;
      const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;
      return { ...cycle, total, passed, failed, blocked, notRun, progress };
    });

    // Filter by folder
    if (selectedFolderId) {
      result = result.filter((c: any) => c.folder_id === selectedFolderId);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.key?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((c: any) => c.status === statusFilter);
    }
    
    return result;
  }, [cycles, searchQuery, statusFilter, selectedFolderId]);

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      if (!user) throw new Error('Not authenticated');

      const context = createPipelineContext(
        user.id,
        scopeType === 'project' ? 'project' : scopeType === 'program' ? 'program' : 'global',
        scopeId
      );

      for (const cycleId of cycleIds) {
        await runMutationWithAudit(
          { cycleId },
          {
            context,
            action: 'delete',
            entityType: 'test_cycles',
            mutationFn: async () => {
              const { error } = await supabase
                .from('test_cycles')
                .update({ 
                  archived: true, 
                  archived_at: new Date().toISOString(),
                  archived_by: user.id,
                })
                .eq('id', cycleId);
              if (error) throw error;
              return { id: cycleId };
            },
            getAuditInfo: () => ({
              entityId: cycleId,
              description: 'Archived test cycle',
            }),
            activityType: 'archived',
            queryClient,
            invalidateKeys: [['global-test-cycles', scopeType, scopeId]],
            successMessage: cycleIds.length === 1 ? 'Test cycle archived' : undefined,
          }
        );
      }

      return cycleIds;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      if (selectedIds.size > 1) {
        toast.success(`${selectedIds.size} cycles archived`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get original cycle
      const { data: original, error: fetchError } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new key
      const { data: existing } = await supabase
        .from('test_cycles')
        .select('key')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastNum = existing?.[0]?.key?.match(/CYC-(\d+)/)?.[1];
      const nextNum = lastNum ? parseInt(lastNum) + 1 : 1;
      const newKey = `CYC-${nextNum.toString().padStart(3, '0')}`;

      // Create clone
      const { data: newCycle, error: createError } = await supabase
        .from('test_cycles')
        .insert({
          key: newKey,
          name: `${original.name} (Copy)`,
          objective: original.objective,
          environment: original.environment,
          build_version: original.build_version,
          program_id: original.program_id,
          project_id: original.project_id,
          status: 'planned',
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Clone executions
      const { data: executions } = await supabase
        .from('test_cycle_executions')
        .select('case_id, case_version, assigned_to')
        .eq('cycle_id', cycleId);

      if (executions && executions.length > 0) {
        await supabase.from('test_cycle_executions').insert(
          executions.map((e: any) => ({
            cycle_id: newCycle.id,
            case_id: e.case_id,
            case_version: e.case_version,
            assigned_to: e.assigned_to,
            status: 'not_executed',
          }))
        );
      }

      // Audit log
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'created',
        entity_type: 'test_cycles',
        entity_id: newCycle.id,
        entity_title: newCycle.name,
        description: `Cloned from ${original.name}`,
      });

      return newCycle;
    },
    onSuccess: (newCycle) => {
      queryClient.invalidateQueries({ queryKey: ['global-test-cycles'] });
      toast.success(`Cycle cloned: ${newCycle.name}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const buildExecuteUrl = (cycleId: string) => {
    const params = new URLSearchParams();
    params.set('scopeType', scopeType);
    if (scopeId) params.set('scopeId', scopeId);
    params.set('cycleId', cycleId);
    return `/tests/executions?${params.toString()}`;
  };

  const handleViewDetails = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setDetailDrawerOpen(true);
  };

  const handleExecuteFromDrawer = (executionId: string) => {
    setSelectedExecutionId(executionId);
    setExecutionDrawerOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processedCycles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedCycles.map((c: any) => c.id)));
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test cycles: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-full">
      {/* Folder Tree Panel */}
      <div
        className={cn(
          'border-r border-border-default bg-surface-1 transition-all duration-200 flex flex-col shrink-0',
          folderPanelOpen ? 'w-56' : 'w-0 overflow-hidden'
        )}
      >
        {folderPanelOpen && (
          programId ? (
            <TestFolderTree
              programId={programId}
              entityType="test_cycles"
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              className="flex-1"
            />
          ) : (
            <div className="p-4 text-center text-text-muted text-sm">
              <p>Folders available in program scope</p>
              <p className="text-xs mt-1 text-text-tertiary">Switch to a program to organize cycles</p>
            </div>
          )
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4 p-4">
        {/* Folder toggle */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setFolderPanelOpen(!folderPanelOpen)}
          >
            {folderPanelOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          {selectedFolderId && (
            <span className="text-xs text-text-tertiary">Filtered by folder</span>
          )}
        </div>
        
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search cycles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 bg-surface-2 border-border-default">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">{processedCycles.length} cycles</span>
          <Button
            size="sm"
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Cycle
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent-subtle/30 rounded-lg border border-accent-primary/20">
          <span className="text-sm font-medium text-text-primary">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="text-status-error hover:bg-status-error/10"
            onClick={() => archiveMutation.mutate(Array.from(selectedIds))}
            disabled={archiveMutation.isPending}
          >
            <Archive className="h-4 w-4 mr-1.5" />
            Archive
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Cycles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-surface-2 border-border-default">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-4" />
                <Skeleton className="h-2 w-full mb-3" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : processedCycles.length === 0 ? (
        <div className="text-center py-16 text-text-tertiary">
          <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No test cycles found</h3>
          <p className="text-sm mb-4">Create your first test cycle to start organizing test executions</p>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Cycle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedCycles.map((cycle: any) => (
            <Card 
              key={cycle.id} 
              className={cn(
                'bg-surface-2 border-border-default hover:border-accent-primary/30 transition-colors',
                selectedIds.has(cycle.id) && 'border-accent-primary bg-accent-subtle/20'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(cycle.id)}
                      onCheckedChange={() => toggleSelect(cycle.id)}
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewDetails(cycle.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{cycle.key}</Badge>
                        <Badge variant="outline" className={cn('text-xs', getStatusColor(cycle.status))}>
                          {cycle.status}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-text-primary truncate">{cycle.name}</h3>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                      <DropdownMenuItem onClick={() => handleViewDetails(cycle.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewDetails(cycle.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => cloneMutation.mutate(cycle.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewDetails(cycle.id)}>
                        <Layers className="h-4 w-4 mr-2" />
                        Add Cases
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border-default" />
                      <DropdownMenuItem 
                        className="text-status-error"
                        onClick={() => archiveMutation.mutate([cycle.id])}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {cycle.description && (
                  <p className="text-sm text-text-tertiary mb-3 line-clamp-2">
                    {cycle.description}
                  </p>
                )}

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-tertiary">Progress</span>
                    <span className="text-text-primary font-medium">{cycle.progress}%</span>
                  </div>
                  <Progress value={cycle.progress} className="h-1.5" />
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
                  <div>
                    <p className="text-status-success font-medium">{cycle.passed}</p>
                    <p className="text-text-quaternary">Pass</p>
                  </div>
                  <div>
                    <p className="text-status-error font-medium">{cycle.failed}</p>
                    <p className="text-text-quaternary">Fail</p>
                  </div>
                  <div>
                    <p className="text-status-warning font-medium">{cycle.blocked}</p>
                    <p className="text-text-quaternary">Block</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary font-medium">{cycle.notRun}</p>
                    <p className="text-text-quaternary">Pend</p>
                  </div>
                </div>

                {(cycle.start_date || cycle.end_date) && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mb-3">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {cycle.start_date && format(new Date(cycle.start_date), 'MMM d')}
                      {cycle.start_date && cycle.end_date && ' - '}
                      {cycle.end_date && format(new Date(cycle.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link to={buildExecuteUrl(cycle.id)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Play className="h-3 w-3" />
                      Execute
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals & Drawers */}
      <CreateCycleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={scopeType === 'project' ? scopeId || '' : ''}
      />

      <TestCycleDetailDrawer
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        cycleId={selectedCycleId}
        scopeType={scopeType === 'project' ? 'project' : scopeType === 'program' ? 'program' : 'global'}
        scopeId={scopeId}
        onExecute={handleExecuteFromDrawer}
      />

      <ExecutionRunDrawer
        open={executionDrawerOpen}
        onOpenChange={setExecutionDrawerOpen}
        executionId={selectedExecutionId}
        onComplete={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['test-cycle-detail'] });
        }}
      />
      </div>
    </div>
  );
}

export default GlobalTestsCyclesPage;
