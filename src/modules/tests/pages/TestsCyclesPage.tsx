/**
 * TEST CYCLES PAGE
 * Full CRUD table for test cycles with create modal and drawer
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  RefreshCcw,
  AlertCircle,
  Calendar,
  Lock,
  MoreHorizontal,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useProjectTestCycles } from '@/hooks/useProjectTestMetrics';
import { CreateCycleModal } from '../components/CreateCycleModal';
import { CycleDrawer } from '../components/CycleDrawer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function TestsCyclesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    cycles: testCycles,
    isLoading,
    error,
  } = useProjectTestCycles(projectId || '');

  // Archive mutation for dropdown menu
  const archiveMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('test_cycles')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq('id', cycleId);

      if (error) throw error;

      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'archived',
        entity_type: 'test_cycle',
        entity_id: cycleId,
        description: 'Archived test cycle from list',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-test-cycles', projectId] });
      toast.success('Cycle archived');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleArchive = (e: React.MouseEvent, cycleId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to archive this cycle?')) {
      archiveMutation.mutate(cycleId);
    }
  };

  const filteredCycles = useMemo(() => {
    let result = testCycles;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((cycle: any) =>
        cycle.name?.toLowerCase().includes(q) ||
        cycle.key?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter((cycle: any) => cycle.status === statusFilter);
    }
    
    return result;
  }, [testCycles, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-status-success bg-status-success/10';
      case 'completed': return 'text-accent-primary bg-accent-subtle';
      case 'not_started': return 'text-text-tertiary bg-surface-3';
      case 'blocked': return 'text-status-error bg-status-error/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  const calculateProgress = (cycle: any) => {
    const execs = cycle.test_cycle_executions || [];
    const total = execs.length;
    const executed = execs.filter((e: any) => e.status && e.status !== 'not_executed').length;
    if (total === 0) return 0;
    return Math.round((executed / total) * 100);
  };

  const getExecutionCounts = (cycle: any) => {
    const execs = cycle.test_cycle_executions || [];
    return {
      passed: execs.filter((e: any) => e.status === 'passed').length,
      failed: execs.filter((e: any) => e.status === 'failed').length,
      blocked: execs.filter((e: any) => e.status === 'blocked').length,
      notRun: execs.filter((e: any) => e.status === 'not_executed' || !e.status).length,
      total: execs.length,
    };
  };

  const handleCycleClick = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setDrawerOpen(true);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test cycles: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search test cycles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-surface-2 border-border-default">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Test Cycle
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredCycles.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <RefreshCcw className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Test Cycles</h3>
          <p className="text-text-secondary mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'No test cycles match your filters.' 
              : 'Create your first test cycle to organize your test runs.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Cycle
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredCycles.map((cycle: any) => {
            const progress = calculateProgress(cycle);
            const counts = getExecutionCounts(cycle);
            
            return (
              <Card 
                key={cycle.id} 
                className="bg-surface-2 border-border-default p-4 hover:bg-surface-hover cursor-pointer transition-colors"
                onClick={() => handleCycleClick(cycle.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-3 rounded-lg">
                      <RefreshCcw className="h-5 w-5 text-accent-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {cycle.key}
                        </Badge>
                        <h3 className="font-medium text-text-primary">{cycle.name}</h3>
                        {cycle.scope_locked && (
                          <Lock className="h-3.5 w-3.5 text-status-warning" />
                        )}
                      </div>
                      <p className="text-sm text-text-tertiary">
                        {cycle.environment || 'No environment'} • {cycle.build_version || 'No build'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', getStatusColor(cycle.status))}>
                      {cycle.status?.replace('_', ' ')}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCycleClick(cycle.id); }}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-status-error"
                          onClick={(e) => handleArchive(e, cycle.id)}
                          disabled={archiveMutation.isPending}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">{counts.total} test cases</span>
                    <span className="text-text-primary font-medium">{progress}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-status-success">{counts.passed} Passed</span>
                    <span className="text-status-error">{counts.failed} Failed</span>
                    <span className="text-status-warning">{counts.blocked} Blocked</span>
                    <span className="text-text-tertiary">{counts.notRun} Not Run</span>
                  </div>
                  {cycle.start_date && (
                    <div className="flex items-center gap-1 text-text-tertiary">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(cycle.start_date), 'MMM d')} - {cycle.end_date ? format(new Date(cycle.end_date), 'MMM d, yyyy') : 'Ongoing'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateCycleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={projectId || ''}
      />

      {/* Cycle Drawer */}
      <CycleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        cycleId={selectedCycleId}
        projectId={projectId || ''}
      />
    </div>
  );
}
