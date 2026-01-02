/**
 * Bulk Execution Runner
 * Execute multiple test cases in sequence with progress tracking
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  XCircle,
  Clock,
  ListChecks,
  ChevronRight,
  FastForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBulkExecution, BulkExecutionQueue } from '../../hooks/useTestExecution';
import { TestExecutionPanel } from './TestExecutionPanel';

interface BulkExecutionRunnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  programId: string;
  executionIds?: string[];
}

export function BulkExecutionRunner({
  open,
  onOpenChange,
  cycleId,
  programId,
  executionIds,
}: BulkExecutionRunnerProps) {
  const {
    queue,
    currentIndex,
    currentExecution,
    progress,
    initializeQueue,
    nextExecution,
    skipExecution,
    jumpToExecution,
    passAllRemaining,
    isPassingAll,
  } = useBulkExecution(cycleId, programId);

  const [isPaused, setIsPaused] = useState(false);

  // Initialize queue when opened
  useEffect(() => {
    if (open) {
      initializeQueue(executionIds);
    }
  }, [open, executionIds, initializeQueue]);

  const getStatusIcon = (status: BulkExecutionQueue['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-slate-400" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const progressPercent = progress.total > 0
    ? ((progress.completed + progress.skipped) / progress.total) * 100
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-full sm:max-w-[95vw] p-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Queue Panel */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full flex flex-col border-r">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Bulk Execution
                </SheetTitle>
              </SheetHeader>

              {/* Progress Summary */}
              <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="text-muted-foreground">
                    {progress.completed + progress.skipped} / {progress.total}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {progress.completed} completed
                  </span>
                  <span className="flex items-center gap-1">
                    <SkipForward className="h-3 w-3 text-slate-400" />
                    {progress.skipped} skipped
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-b flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={skipExecution}
                  disabled={currentIndex >= queue.length - 1}
                >
                  <SkipForward className="h-4 w-4 mr-1.5" />
                  Skip
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => passAllRemaining()}
                  disabled={isPassingAll || progress.pending === 0}
                >
                  <FastForward className="h-4 w-4 mr-1.5" />
                  Pass All
                </Button>
              </div>

              {/* Queue List */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {queue.map((item, idx) => (
                    <button
                      key={item.executionId}
                      onClick={() => jumpToExecution(idx)}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors',
                        idx === currentIndex
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted'
                      )}
                    >
                      {getStatusIcon(item.status)}
                      <span className="flex-1 text-sm truncate">
                        {item.testCaseTitle}
                      </span>
                      {idx === currentIndex && (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Execution Panel */}
          <ResizablePanel defaultSize={75}>
            {currentExecution ? (
              <TestExecutionPanel
                executionId={currentExecution.executionId}
                programId={programId}
                onNext={currentIndex < queue.length - 1 ? nextExecution : undefined}
                onPrevious={currentIndex > 0 ? () => jumpToExecution(currentIndex - 1) : undefined}
                showNavigation
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tests in queue</p>
                  <p className="text-sm">Select test cases to execute</p>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </SheetContent>
    </Sheet>
  );
}
