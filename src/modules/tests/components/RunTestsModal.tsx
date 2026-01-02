/**
 * RUN TESTS MODAL
 * Select a cycle and launch test execution queue
 */

import React, { useState } from 'react';
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
import { Play, Clock, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestCycle {
  id: string;
  name: string;
  key?: string;
  status?: string;
  test_cycle_executions?: { id: string; status: string }[];
}

interface RunTestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  cycles: TestCycle[];
  onLaunch: (cycleId: string) => void;
  isLoading?: boolean;
}

export function RunTestsModal({
  open,
  onOpenChange,
  projectId,
  cycles,
  onLaunch,
  isLoading,
}: RunTestsModalProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const activeCycles = cycles.filter(c => 
    c.status === 'active' || c.status === 'in_progress' || c.status === 'planned'
  );

  const getExecutionStats = (cycle: TestCycle) => {
    const execs = cycle.test_cycle_executions || [];
    const total = execs.length;
    const passed = execs.filter(e => e.status === 'passed').length;
    const failed = execs.filter(e => e.status === 'failed').length;
    const notRun = total - passed - failed - execs.filter(e => e.status === 'blocked').length;
    return { total, passed, failed, notRun };
  };

  const handleLaunch = () => {
    if (selectedCycleId) {
      onLaunch(selectedCycleId);
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
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : activeCycles.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 mx-auto mb-3 text-text-quaternary" />
              <p className="text-sm text-text-secondary mb-2">No active test cycles</p>
              <p className="text-xs text-text-tertiary mb-4">
                Create a test cycle first to run tests
              </p>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Test Cycle
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm text-text-secondary">Select Cycle</Label>
              <RadioGroup value={selectedCycleId} onValueChange={setSelectedCycleId}>
                {activeCycles.map(cycle => {
                  const stats = getExecutionStats(cycle);
                  return (
                    <div
                      key={cycle.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedCycleId === cycle.id 
                          ? "border-accent-primary bg-accent-primary/5" 
                          : "border-border-default hover:bg-surface-2"
                      )}
                      onClick={() => setSelectedCycleId(cycle.id)}
                    >
                      <RadioGroupItem value={cycle.id} id={cycle.id} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">
                            {cycle.name}
                          </span>
                          {cycle.key && (
                            <Badge variant="outline" className="text-xs">
                              {cycle.key}
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              cycle.status === 'active' && "bg-status-success/10 text-status-success",
                              cycle.status === 'in_progress' && "bg-status-info/10 text-status-info",
                              cycle.status === 'planned' && "bg-text-tertiary/10 text-text-tertiary"
                            )}
                          >
                            {cycle.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                          <span>{stats.total} test cases</span>
                          {stats.passed > 0 && (
                            <span className="flex items-center gap-1 text-status-success">
                              <CheckCircle2 className="h-3 w-3" />
                              {stats.passed} passed
                            </span>
                          )}
                          {stats.failed > 0 && (
                            <span className="flex items-center gap-1 text-status-error">
                              <AlertTriangle className="h-3 w-3" />
                              {stats.failed} failed
                            </span>
                          )}
                          {stats.notRun > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {stats.notRun} pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLaunch}
            disabled={!selectedCycleId || activeCycles.length === 0}
            className="bg-accent-primary hover:bg-accent-primary-hover gap-2"
          >
            <Play className="h-4 w-4" />
            Launch Execution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
