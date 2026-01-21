/**
 * Module 3B-1: Main parallel runner orchestration container
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  Settings2, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { useParallelRunner } from '../../hooks/useParallelRunner';
import { useWorkerPool } from '../../hooks/useWorkerPool';
import { WorkerPool } from './WorkerPool';
import { ExecutionProgress } from './ExecutionProgress';
import { RunControls } from './RunControls';
import { TestQueue } from './TestQueue';
import { ResultsStream } from './ResultsStream';
import { WorkerCountControl } from './WorkerCountControl';
import type { PriorityMode } from '../../types/parallel-runner';

interface ParallelRunnerProps {
  runId: string;
  className?: string;
}

export function ParallelRunner({ runId, className }: ParallelRunnerProps) {
  const [workerCount, setWorkerCount] = useState(3);
  const [priorityMode, setPriorityMode] = useState<PriorityMode>('priority');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const runner = useParallelRunner(runId);
  const workerPool = useWorkerPool(runId);

  const handleInitialize = useCallback(async () => {
    try {
      setInitError(null);
      await runner.initialize({
        runId,
        maxWorkers: workerCount,
        priorityMode,
      });
      setIsInitialized(true);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Failed to initialize');
    }
  }, [runId, workerCount, priorityMode, runner]);

  const handleStart = useCallback(async () => {
    if (!isInitialized) {
      await handleInitialize();
    }
    runner.start();
  }, [isInitialized, handleInitialize, runner]);

  const hasErrorWorkers = runner.workers.some(w => w.status === 'error');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Parallel Test Runner
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Execute tests concurrently with configurable workers
          </p>
        </div>

        <RunControls
          isRunning={runner.isRunning}
          isPaused={runner.isPaused}
          hasTests={runner.queue.length > 0 || !isInitialized}
          hasFailedWorkers={hasErrorWorkers}
          onStart={handleStart}
          onPause={runner.pause}
          onResume={runner.resume}
          onStop={runner.stop}
          onRequeueAbandoned={runner.requeueAbandoned}
        />
      </div>

      {/* Error Alert */}
      {initError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      )}

      {/* Configuration (before initialized) */}
      {!isInitialized && !runner.isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Configuration
            </CardTitle>
            <CardDescription>
              Configure parallel execution settings before starting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorkerCountControl
                count={workerCount}
                minCount={1}
                maxCount={5}
                onChange={setWorkerCount}
              />

              <div className="space-y-3">
                <label className="text-sm font-medium">Priority Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['priority', 'fifo', 'random'] as PriorityMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPriorityMode(mode)}
                      className={cn(
                        'px-3 py-2 rounded-md text-sm capitalize transition-colors',
                        priorityMode === mode
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {mode === 'fifo' ? 'FIFO' : mode}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {priorityMode === 'priority' && 'Execute high priority tests first'}
                  {priorityMode === 'fifo' && 'Execute in queue order'}
                  {priorityMode === 'random' && 'Random execution order'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      {(isInitialized || runner.progress) && (
        <ExecutionProgress progress={runner.progress} />
      )}

      {/* Worker Pool */}
      {runner.workers.length > 0 && (
        <WorkerPool
          workers={runner.workers}
          canAddWorker={workerPool.canAddWorker}
          canRemoveWorker={workerPool.canRemoveWorker}
          onAddWorker={workerPool.addWorker}
          onRemoveWorker={workerPool.removeWorker}
          isRunning={runner.isRunning}
        />
      )}

      <Separator />

      {/* Queue and Results Tabs */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <Activity className="h-4 w-4" />
            Test Queue
            {runner.queue.length > 0 && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                {runner.queue.filter(q => q.status === 'queued').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <Activity className="h-4 w-4" />
            Live Results
            {runner.events.length > 0 && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                {runner.events.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <TestQueue queue={runner.queue} maxHeight="500px" />
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <ResultsStream events={runner.events} maxHeight="500px" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
