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

  // EXPLICIT FILTER: Only KRs that belong to THIS objective (not children)
  const parentKeyResults = (hierarchy?.current?.keyResults || []).filter(
    (kr: any) => kr.objective_id === objectiveId
  );

  // EXPLICIT FILTER: Only direct children of this objective
  const childObjectives = (hierarchy?.children || []).filter(
    (child: any) => child.parent_objective_id === objectiveId
  );

  // Debug logging - remove after verification
  if (hierarchy && open) {
    console.log('=== OBJECTIVE HIERARCHY DEBUG ===');
    console.log('Selected objectiveId:', objectiveId);
    console.log('Current objective:', hierarchy.current?.id, hierarchy.current?.summary);
    console.log('Raw keyResults from hook:', hierarchy.current?.keyResults?.map((kr: any) => ({
      id: kr.id,
      summary: kr.summary,
      objective_id: kr.objective_id,
    })));
    console.log('Filtered parentKeyResults:', parentKeyResults.map((kr: any) => ({
      id: kr.id,
      summary: kr.summary,
      objective_id: kr.objective_id,
    })));
    console.log('Raw children from hook:', hierarchy.children?.map((c: any) => ({
      id: c.id,
      summary: c.summary,
      parent_objective_id: c.parent_objective_id,
    })));
    console.log('Filtered childObjectives:', childObjectives.map((c: any) => ({
      id: c.id,
      summary: c.summary,
      parent_objective_id: c.parent_objective_id,
    })));
    console.log('=================================');
  }

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

            {/* Key Results Section - ONLY KRs where objective_id === this objective */}
            {parentKeyResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                  Key Results ({parentKeyResults.length})
                </h4>
                <div className="space-y-2">
                  {parentKeyResults.map((kr: any) => (
                    <KeyResultRow key={kr.id} keyResult={kr} />
                  ))}
                </div>
              </div>
            )}

            {/* Child Objectives Section - ONLY direct children */}
            {childObjectives.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                  Child Objectives ({childObjectives.length})
                </h4>
                <div className="space-y-2">
                  {childObjectives.map((child: any) => (
                    <ChildObjectiveRow 
                      key={child.id} 
                      objective={child}
                      parentObjectiveId={objectiveId}
                    />
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
  parentObjectiveId: string;
}

function ChildObjectiveRow({ objective, parentObjectiveId }: ChildObjectiveRowProps) {
  // Calculate KR progress from child's own KRs (already fetched in hook)
  const childKRs = objective.keyResults || [];
  let calculatedKrProgress = 0;
  
  if (childKRs.length > 0) {
    const totalProgress = childKRs.reduce((sum: number, kr: any) => {
      const baseline = kr.baseline_value || 0;
      const current = kr.current_value || baseline;
      const goal = kr.goal_value || 1;
      const progress = goal !== baseline ? ((current - baseline) / (goal - baseline)) : 0;
      return sum + Math.max(0, Math.min(1, progress));
    }, 0);
    calculatedKrProgress = (totalProgress / childKRs.length) * 100;
  }

  // Use child's own work_progress from DB, or 0
  const workProgress = (objective.work_progress || 0) * 100;

  // Debug log for this child
  console.log('Child objective row:', {
    id: objective.id,
    summary: objective.summary,
    tier: objective.tier,
    krCount: childKRs.length,
    calculatedKrProgress,
    workProgress,
  });

  return (
    <div className="pl-4 py-2 border-l-2 border-muted">
      {/* Single row: tier badge, summary, progress bars, score, status */}
      <div className="flex items-center justify-between gap-3">
        {/* Left side: tier badge + summary */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ObjectiveTierBadge tier={objective.tier as any} size="sm" />
          <span className="text-sm font-medium text-foreground truncate">
            {objective.summary || objective.title || `Objective ${objective.id?.slice(0, 8)}`}
          </span>
        </div>
        
        {/* Right side: progress bars + score + status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Work progress */}
          <div className="w-14">
            <ProgressBar progress={workProgress} height="sm" />
          </div>
          {/* KR progress */}
          <div className="w-14">
            <ProgressBar progress={calculatedKrProgress} height="sm" />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">
            {objective.score ? `${Math.round(objective.score * 100)}%` : 'N/A'}
          </span>
          <ObjectiveStatusBadge status={objective.status} size="sm" />
        </div>
      </div>
    </div>
  );
}
