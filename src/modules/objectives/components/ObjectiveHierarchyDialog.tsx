import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, Loader2, Target } from 'lucide-react';
import { useObjectiveHierarchy } from '../hooks/useObjectiveHierarchy';
import { ObjectiveTierBadge } from './shared/ObjectiveTierBadge';
import { ObjectiveStatusBadge } from './shared/ObjectiveStatusBadge';
import { ObjectiveScoreBadge } from './shared/ObjectiveScoreBadge';
import { ProgressBar } from './shared/ProgressBar';
import { cn } from '@/lib/utils';

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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
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
          <div className="space-y-[var(--s4)]">
            {/* Parent Chain (ancestors) */}
            {hierarchy.parents.length > 0 && (
              <div className="space-y-[var(--s2)]">
                <h4 className="text-sm font-medium text-muted-foreground">Parent Objectives</h4>
                {hierarchy.parents.map((parent: any, index: number) => (
                  <ObjectiveHierarchyCard
                    key={parent.id}
                    objective={parent}
                    indent={index}
                    isParent={true}
                  />
                ))}
              </div>
            )}

            {/* Current Objective */}
            <div className="border-2 border-primary rounded-lg">
              <ObjectiveHierarchyCard
                objective={hierarchy.current}
                indent={0}
                isCurrent={true}
              />

              {/* Key Results for current objective */}
              {hierarchy.current.keyResults?.length > 0 && (
                <div className="px-[var(--s4)] pb-[var(--s4)] space-y-[var(--s2)]">
                  <h5 className="text-sm font-medium">Key Results</h5>
                  {hierarchy.current.keyResults.map((kr: any) => (
                    <KeyResultMiniCard key={kr.id} keyResult={kr} />
                  ))}
                </div>
              )}
            </div>

            {/* Children */}
            {hierarchy.children.length > 0 && (
              <div className="space-y-[var(--s2)]">
                <h4 className="text-sm font-medium text-muted-foreground">Child Objectives</h4>
                {hierarchy.children.map((child: any) => (
                  <ObjectiveHierarchyCard
                    key={child.id}
                    objective={child}
                    indent={0}
                    isChild={true}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface ObjectiveHierarchyCardProps {
  objective: any;
  indent: number;
  isParent?: boolean;
  isCurrent?: boolean;
  isChild?: boolean;
}

function ObjectiveHierarchyCard({
  objective,
  indent,
  isParent,
  isCurrent,
  isChild,
}: ObjectiveHierarchyCardProps) {
  return (
    <div
      className={cn(
        'p-[var(--s3)] rounded-lg border',
        isCurrent && 'bg-primary/5',
        isParent && 'bg-muted/50',
        isChild && 'ml-4 border-l-2 border-l-primary'
      )}
      style={{ marginLeft: isParent ? `${indent * 16}px` : undefined }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[var(--s2)]">
          <ObjectiveTierBadge tier={objective.tier} size="sm" />
          <span className="font-medium">{objective.summary}</span>
        </div>
        <div className="flex items-center gap-[var(--s2)]">
          <ObjectiveScoreBadge score={objective.score} size="sm" />
          <ObjectiveStatusBadge status={objective.status} size="sm" />
        </div>
      </div>

      {/* Progress bars */}
      <div className="mt-[var(--s2)] grid grid-cols-2 gap-[var(--s4)] text-xs">
        <div>
          <span className="text-muted-foreground">Work Progress</span>
          <ProgressBar
            progress={(objective.work_progress || 0) * 100}
            score={objective.score}
            height="sm"
          />
        </div>
        <div>
          <span className="text-muted-foreground">KR Progress</span>
          <ProgressBar
            progress={(objective.key_result_progress || 0) * 100}
            score={objective.score}
            height="sm"
          />
        </div>
      </div>
    </div>
  );
}

interface KeyResultMiniCardProps {
  keyResult: any;
}

function KeyResultMiniCard({ keyResult }: KeyResultMiniCardProps) {
  const baseline = keyResult.baseline_value || 0;
  const current = keyResult.current_value || baseline;
  const goal = keyResult.goal_value || 1;
  const progress = goal !== baseline ? ((current - baseline) / (goal - baseline)) * 100 : 0;

  return (
    <div className="flex items-center gap-[var(--s2)] p-[var(--s2)] bg-muted/30 rounded text-sm">
      <Target className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate">{keyResult.summary}</span>
      <span className="text-xs text-muted-foreground">
        {current} / {goal}
      </span>
      <div className="w-16">
        <ProgressBar progress={Math.max(0, Math.min(100, progress))} height="sm" />
      </div>
      <span className="text-xs font-medium w-10 text-right">
        {Math.round(Math.max(0, Math.min(100, progress)))}%
      </span>
    </div>
  );
}
