/**
 * Run Progress Card Component
 * Displays execution run with progress bar and actions
 */

import React from 'react';
import { Play, Pause, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ExecutionRun, RunStatus } from '../types/test-execution';
import { RUN_STATUS_CONFIG, ENVIRONMENT_CONFIG } from '../types/test-execution';
import { useRunProgress } from '../hooks/useRunProgress';

interface RunProgressCardProps {
  run: ExecutionRun;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onAbort?: () => void;
  onClick?: () => void;
  isUpdating?: boolean;
}

export function RunProgressCard({
  run,
  onStart,
  onPause,
  onComplete,
  onAbort,
  onClick,
  isUpdating,
}: RunProgressCardProps) {
  const { progress } = useRunProgress(run.id);
  const displayProgress = progress || run.progress;
  
  const statusConfig = RUN_STATUS_CONFIG[run.status];
  const envConfig = ENVIRONMENT_CONFIG[run.environment];

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Execution run ${run.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-medium">
              RUN-{run.run_number}
            </span>
            <Badge className={`${statusConfig.bgClass} ${statusConfig.textClass} text-xs`}>
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className={`${envConfig.textClass} text-xs`}>
              {envConfig.label}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground truncate">{run.name}</h3>
          {run.project_name && (
            <p className="text-sm text-muted-foreground">{run.project_name}</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{displayProgress.completion_percentage}% Complete</span>
          <span>{displayProgress.total_cases} cases</span>
        </div>
        <Progress value={displayProgress.completion_percentage} className="h-2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {displayProgress.passed}
          </div>
          <div className="text-xs text-muted-foreground">Passed</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {displayProgress.failed}
          </div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {displayProgress.blocked}
          </div>
          <div className="text-xs text-muted-foreground">Blocked</div>
        </div>
        <div className="bg-muted rounded p-2">
          <div className="text-lg font-bold text-muted-foreground">
            {displayProgress.not_run}
          </div>
          <div className="text-xs text-muted-foreground">Not Run</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {run.assigned_testers.length > 0 && (
            <div className="flex -space-x-2">
              {run.assigned_testers.slice(0, 3).map((tester) => (
                <Avatar key={tester.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={tester.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {tester.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {run.assigned_testers.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                  +{run.assigned_testers.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {run.status === 'draft' && onStart && (
            <Button size="sm" variant="default" onClick={onStart} disabled={isUpdating}>
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
          {run.status === 'in_progress' && (
            <>
              {onPause && (
                <Button size="sm" variant="outline" onClick={onPause} disabled={isUpdating}>
                  <Pause className="h-3 w-3" />
                </Button>
              )}
              {onComplete && (
                <Button size="sm" variant="default" onClick={onComplete} disabled={isUpdating}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
              )}
            </>
          )}
          {run.status === 'paused' && onStart && (
            <Button size="sm" variant="default" onClick={onStart} disabled={isUpdating}>
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
