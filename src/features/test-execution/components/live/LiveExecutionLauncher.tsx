/**
 * Module 4C-2: Live Execution Launcher
 * Launches execution for an assignment from the run assignments panel
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystToast } from '@/hooks/useCatalystToast';

interface LiveExecutionLauncherProps {
  assignmentId: string;
  runId: string;
  testCaseId: string;
  testCaseKey: string;
  testCaseTitle: string;
  currentStatus: string;
  onLaunched?: () => void;
}

export function LiveExecutionLauncher({
  assignmentId,
  runId,
  testCaseId,
  testCaseKey,
  testCaseTitle,
  currentStatus,
  onLaunched,
}: LiveExecutionLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useCatalystToast();

  const startExecution = useMutation({
    mutationFn: async () => {
      // Update assignment status to in_progress
      const { error } = await (supabase
        .from('tm_run_case_assignments') as any)
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;

      return { assignmentId, runId, testCaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run-assignments', runId] });
      toast.success('Execution Started', 'Launching test runner...');
      setIsOpen(false);
      onLaunched?.();
      
      // Navigate to the execution runner
      navigate(`/testing/execute/${runId}/${testCaseId}?assignment=${assignmentId}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to start execution', error.message);
    },
  });

  const canStart = currentStatus === 'pending' || currentStatus === 'in_progress';
  const isInProgress = currentStatus === 'in_progress';

  return (
    <>
      <Button
        size="sm"
        variant={isInProgress ? 'outline' : 'default'}
        onClick={() => setIsOpen(true)}
        disabled={!canStart}
        className="gap-1"
      >
        {isInProgress ? (
          <>
            <Clock className="h-3.5 w-3.5" />
            Continue
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Execute
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              {isInProgress ? 'Continue Execution' : 'Start Execution'}
            </DialogTitle>
            <DialogDescription>
              {isInProgress
                ? 'Resume testing where you left off.'
                : 'Begin step-by-step test execution.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {testCaseKey}
                </Badge>
                <Badge
                  variant="secondary"
                  className={
                    isInProgress
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-muted'
                  }
                >
                  {currentStatus}
                </Badge>
              </div>
              <p className="font-medium">{testCaseTitle}</p>
            </div>

            {isInProgress && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  This test case is already in progress. Your previous results
                  will be preserved.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => startExecution.mutate()}
              disabled={startExecution.isPending}
            >
              {startExecution.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {isInProgress ? 'Continue' : 'Start Execution'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
