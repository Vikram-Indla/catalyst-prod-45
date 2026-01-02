/**
 * RUN TESTS MODAL
 * Select a cycle and launch test execution queue
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Clock, CheckCircle2, AlertTriangle, Plus, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectTestCycles } from '@/hooks/useProjectTestMetrics';

interface RunTestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function RunTestsModal({
  open,
  onOpenChange,
  projectId,
}: RunTestsModalProps) {
  const navigate = useNavigate();
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  
  const { cycles, isLoading } = useProjectTestCycles(projectId);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCycleId('');
    }
  }, [open]);

  const activeCycles = cycles.filter((c: any) => 
    c.status === 'active' || c.status === 'in_progress' || c.status === 'not_started'
  );

  const getExecutionStats = (cycle: any) => {
    const execs = cycle.test_cycle_executions || [];
    const total = execs.length;
    const passed = execs.filter((e: any) => e.status === 'passed').length;
    const failed = execs.filter((e: any) => e.status === 'failed').length;
    const blocked = execs.filter((e: any) => e.status === 'blocked').length;
    const notRun = total - passed - failed - blocked;
    return { total, passed, failed, notRun, blocked };
  };

  const handleLaunch = () => {
    if (selectedCycleId) {
      // Navigate to executions page with cycle filter
      onOpenChange(false);
      navigate(`/projects/${projectId}/tests/executions?cycle=${selectedCycleId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-status-success bg-status-success/10';
      case 'in_progress': return 'text-accent-primary bg-accent-subtle';
      case 'not_started': return 'text-text-tertiary bg-surface-3';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-surface-1 border-border-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <Play className="h-5 w-5 text-accent-primary" />
            Run Tests
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            Select a test cycle to launch the execution queue
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activeCycles.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCcw className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No Active Cycles</h3>
              <p className="text-text-secondary mb-4">
                Create a test cycle first to run tests
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/projects/${projectId}/tests/cycles`);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create Cycle
              </Button>
            </div>
          ) : (
            <RadioGroup 
              value={selectedCycleId} 
              onValueChange={setSelectedCycleId}
              className="space-y-3"
            >
              {activeCycles.map((cycle: any) => {
                const stats = getExecutionStats(cycle);
                const progress = stats.total > 0 
                  ? Math.round(((stats.passed + stats.failed + stats.blocked) / stats.total) * 100) 
                  : 0;
                
                return (
                  <Label
                    key={cycle.id}
                    htmlFor={cycle.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                      selectedCycleId === cycle.id
                        ? 'border-accent-primary bg-accent-subtle/30'
                        : 'border-border-default bg-surface-2 hover:bg-surface-hover'
                    )}
                  >
                    <RadioGroupItem value={cycle.id} id={cycle.id} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {cycle.key}
                        </Badge>
                        <span className="font-medium text-text-primary truncate">
                          {cycle.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn('text-xs', getStatusColor(cycle.status))}>
                          {cycle.status?.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-text-tertiary">
                          {stats.total} test cases
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-status-success" />
                          <span className="text-text-secondary">{stats.passed}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-status-error" />
                          <span className="text-text-secondary">{stats.failed}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-text-tertiary" />
                          <span className="text-text-secondary">{stats.notRun} remaining</span>
                        </span>
                        <span className="text-text-tertiary ml-auto">
                          {progress}% complete
                        </span>
                      </div>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="border-t border-border-default pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLaunch}
            disabled={!selectedCycleId || activeCycles.length === 0}
          >
            <Play className="h-4 w-4 mr-1.5" />
            Launch Execution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
