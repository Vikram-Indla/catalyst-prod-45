import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, Loader2, Target } from 'lucide-react';
import { useObjectiveHierarchy } from '../hooks/useObjectiveHierarchy';
import { ObjectiveTierBadge } from './shared/ObjectiveTierBadge';
import { ObjectiveStatusBadge } from './shared/ObjectiveStatusBadge';
import { ProgressBar } from './shared/ProgressBar';

interface ObjectiveHierarchyDialogProps {
  objectiveId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ObjectiveHierarchyDialog({
  objectiveId,
  open,
  onOpenChange,
}: ObjectiveHierarchyDialogProps) {
  const { data: hierarchy, isLoading } = useObjectiveHierarchy(objectiveId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Objective Hierarchy
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hierarchy ? (
          <div className="space-y-5">
            {/* Parent Objective Section */}
            <div className="space-y-3">
              {/* Parent objective header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ObjectiveTierBadge tier={hierarchy.current.tier as any} size="sm" />
                  <span className="text-base font-medium text-foreground">
                    {hierarchy.current.summary}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {hierarchy.current.score ? `${Math.round(hierarchy.current.score * 100)}%` : 'N/A'}
                  </span>
                  <ObjectiveStatusBadge status={hierarchy.current.status} size="sm" />
                </div>
              </div>

              {/* Progress bars row */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Work Progress</span>
                  <ProgressBar
                    progress={(hierarchy.current.work_progress || 0) * 100}
                    height="sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">KR Progress</span>
                  <ProgressBar
                    progress={(hierarchy.current.key_result_progress || 0) * 100}
                    height="sm"
                  />
                </div>
              </div>
            </div>

            {/* Key Results Section */}
            {hierarchy.current.keyResults?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                  Key Results
                </h4>
                <div className="space-y-2">
                  {hierarchy.current.keyResults.map((kr: any) => (
                    <KeyResultRow key={kr.id} keyResult={kr} />
                  ))}
                </div>
              </div>
            )}

            {/* Child Objectives Section */}
            {hierarchy.children.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                  Child Objectives
                </h4>
                <div className="space-y-2">
                  {hierarchy.children.map((child: any) => (
                    <ChildObjectiveRow key={child.id} objective={child} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface KeyResultRowProps {
  keyResult: any;
}

function KeyResultRow({ keyResult }: KeyResultRowProps) {
  const baseline = keyResult.baseline_value || 0;
  const current = keyResult.current_value || baseline;
  const goal = keyResult.goal_value || 1;
  const progress = goal !== baseline ? ((current - baseline) / (goal - baseline)) * 100 : 0;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 text-sm text-foreground truncate">{keyResult.summary}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {current} / {goal}
      </span>
      <div className="w-20 flex-shrink-0">
        <ProgressBar progress={clampedProgress} height="sm" />
      </div>
      <span className="text-xs font-medium w-10 text-right text-foreground">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  );
}

interface ChildObjectiveRowProps {
  objective: any;
}

function ChildObjectiveRow({ objective }: ChildObjectiveRowProps) {
  return (
    <div className="pl-3 py-2 border-l-2 border-muted">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ObjectiveTierBadge tier={objective.tier as any} size="sm" />
          <span className="text-sm font-medium text-foreground">{objective.summary}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {objective.score ? `${Math.round(objective.score * 100)}%` : 'N/A'}
          </span>
          <ObjectiveStatusBadge status={objective.status} size="sm" />
        </div>
      </div>
      
      {/* Compact progress bars for child */}
      <div className="mt-1.5 grid grid-cols-2 gap-4 pl-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Work</span>
          <div className="flex-1">
            <ProgressBar progress={(objective.work_progress || 0) * 100} height="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">KR</span>
          <div className="flex-1">
            <ProgressBar progress={(objective.key_result_progress || 0) * 100} height="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
