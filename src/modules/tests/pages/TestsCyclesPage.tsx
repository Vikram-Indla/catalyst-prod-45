/**
 * TEST CYCLES PAGE
 * Full CRUD table for test cycles
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectTestCycles } from '@/hooks/useProjectTestMetrics';

export function TestsCyclesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    cycles: testCycles,
    isLoading,
    error,
    createCycle: createTestCycle,
    isCreating,
  } = useProjectTestCycles(projectId || '');

  const filteredCycles = useMemo(() => {
    if (!searchQuery) return testCycles;
    const q = searchQuery.toLowerCase();
    return testCycles.filter((cycle: any) =>
      cycle.name?.toLowerCase().includes(q)
    );
  }, [testCycles, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-status-success bg-status-success/10';
      case 'completed': return 'text-accent-primary bg-accent-subtle';
      case 'draft': return 'text-text-tertiary bg-surface-3';
      case 'blocked': return 'text-status-error bg-status-error/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  const calculateProgress = (cycle: any) => {
    const execs = cycle.test_cycle_executions || [];
    const total = execs.length;
    const executed = execs.filter((e: any) => e.status && e.status !== 'not_run').length;
    if (total === 0) return 0;
    return Math.round((executed / total) * 100);
  };

  const getExecutionCounts = (cycle: any) => {
    const execs = cycle.test_cycle_executions || [];
    return {
      passed: execs.filter((e: any) => e.status === 'passed').length,
      failed: execs.filter((e: any) => e.status === 'failed').length,
      blocked: execs.filter((e: any) => e.status === 'blocked').length,
      notRun: execs.filter((e: any) => e.status === 'not_run' || !e.status).length,
      total: execs.length,
    };
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
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search test cycles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => {/* TODO: Open create modal */}}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Test Cycle
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredCycles.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <RefreshCcw className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Test Cycles</h3>
          <p className="text-text-secondary mb-4">
            {searchQuery ? 'No test cycles match your search.' : 'Create your first test cycle to organize your test runs.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => {/* TODO: Open create modal */}}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Cycle
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCycles.map((cycle: any) => {
            const progress = calculateProgress(cycle);
            const counts = getExecutionCounts(cycle);
            
            return (
              <Card 
                key={cycle.id} 
                className="bg-surface-2 border-border-default p-4 hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-3 rounded-lg">
                      <RefreshCcw className="h-5 w-5 text-accent-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{cycle.name}</h3>
                      <p className="text-sm text-text-tertiary">{cycle.notes || 'No description'}</p>
                    </div>
                  </div>
                  <Badge className={cn('text-xs', getStatusColor(cycle.status))}>
                    {cycle.status}
                  </Badge>
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
                      <span>{format(new Date(cycle.start_date), 'MMM d')} - {cycle.end_date ? format(new Date(cycle.end_date), 'MMM d, yyyy') : 'Ongoing'}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
