import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, Loader2, Target, ChevronRight } from 'lucide-react';
import { useObjectiveHierarchy } from '../hooks/useObjectiveHierarchy';
import { ObjectiveTierBadge } from './shared/ObjectiveTierBadge';
import { ObjectiveStatusBadge } from './shared/ObjectiveStatusBadge';
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
  const [currentObjectiveId, setCurrentObjectiveId] = useState(objectiveId);
  const { data: hierarchy, isLoading } = useObjectiveHierarchy(currentObjectiveId);

  // Reset to initial objective when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCurrentObjectiveId(objectiveId);
    }
    onOpenChange(newOpen);
  };

  // EXPLICIT FILTER: Only KRs that belong to THIS objective (not children)
  const parentKeyResults = (hierarchy?.current?.keyResults || []).filter(
    (kr: any) => kr.objective_id === currentObjectiveId
  );

  // EXPLICIT FILTER: Only direct children of this objective
  const childObjectives = (hierarchy?.children || []).filter(
    (child: any) => child.parent_objective_id === currentObjectiveId
  );

  // Get display name - use 'name' field as canonical, fallback to 'summary'
  const getDisplayName = (obj: any) => {
    return obj?.name || obj?.summary || 'Untitled Objective';
  };

  // Get context string (Portfolio/Program name)
  const getContextString = (obj: any) => {
    if (obj?.tier === 'program' && obj?.programName) {
      return `Program: ${obj.programName}`;
    }
    if (obj?.tier === 'portfolio' && obj?.portfolioName) {
      return `Portfolio: ${obj.portfolioName}`;
    }
    return null;
  };

  // Navigate to child objective within the dialog
  const handleChildClick = (childId: string) => {
    setCurrentObjectiveId(childId);
  };

  // Navigate back to parent
  const handleBackToParent = () => {
    if (hierarchy?.parents && hierarchy.parents.length > 0) {
      // Go to immediate parent
      const parent = hierarchy.parents[hierarchy.parents.length - 1];
      setCurrentObjectiveId(parent.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            {/* Breadcrumb navigation if viewing a child */}
            {currentObjectiveId !== objectiveId && hierarchy.parents && hierarchy.parents.length > 0 && (
              <button
                onClick={handleBackToParent}
                className="flex items-center gap-1 text-sm text-brand-gold hover:underline"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to parent
              </button>
            )}

            {/* Parent Objective Section */}
            <div className="space-y-3">
              {/* Parent objective header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ObjectiveTierBadge tier={hierarchy.current.tier as any} size="sm" />
                  <span className="text-base font-medium text-foreground">
                    {getDisplayName(hierarchy.current)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {Math.round((hierarchy.current.calculatedKrProgress || 0) * 100)}%
                  </span>
                  <ObjectiveStatusBadge status={hierarchy.current.status} size="sm" />
                </div>
              </div>

              {/* Context line */}
              {getContextString(hierarchy.current) && (
                <span className="text-xs text-muted-foreground">
                  {getContextString(hierarchy.current)}
                </span>
              )}

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
                    progress={(hierarchy.current.calculatedKrProgress || 0) * 100}
                    height="sm"
                  />
                </div>
              </div>
            </div>

            {/* Key Results Section - ONLY KRs where objective_id === this objective */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                Key Results ({parentKeyResults.length})
              </h4>
              {parentKeyResults.length > 0 ? (
                <div className="space-y-2">
                  {parentKeyResults.map((kr: any) => (
                    <KeyResultRow key={kr.id} keyResult={kr} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No key results for this objective.</p>
              )}
            </div>

            {/* Child Objectives Section - ONLY direct children */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                Child Objectives ({childObjectives.length})
              </h4>
              {childObjectives.length > 0 ? (
                <div className="space-y-2">
                  {childObjectives.map((child: any) => (
                    <ChildObjectiveRow 
                      key={child.id} 
                      objective={child}
                      getDisplayName={getDisplayName}
                      getContextString={getContextString}
                      onClick={() => handleChildClick(child.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No child objectives.</p>
              )}
            </div>
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

  // Use 'name' as canonical, fallback to 'summary'
  const krName = keyResult.name || keyResult.summary || 'Untitled Key Result';
  const unit = keyResult.metric_type || '';

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 text-sm text-foreground truncate">{krName}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {current} / {goal} {unit}
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
  getDisplayName: (obj: any) => string;
  getContextString: (obj: any) => string | null;
  onClick: () => void;
}

function ChildObjectiveRow({ objective, getDisplayName, getContextString, onClick }: ChildObjectiveRowProps) {
  // Use the pre-calculated KR progress from the hook
  const krProgress = (objective.calculatedKrProgress || 0) * 100;
  // Use child's own work_progress from DB, or 0
  const workProgress = (objective.work_progress || 0) * 100;

  const context = getContextString(objective);
  const hasChildren = (objective.childCount || 0) > 0;

  return (
    <div 
      className={cn(
        "pl-4 py-2 border-l-2 border-muted rounded-r cursor-pointer transition-colors",
        "hover:bg-accent/50 hover:border-brand-gold"
      )}
      onClick={onClick}
    >
      {/* Row layout: tier badge + name + context on left, progress + status on right */}
      <div className="flex items-center justify-between gap-3">
        {/* Left side: tier badge + name + context */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ObjectiveTierBadge tier={objective.tier as any} size="sm" />
            <span className="text-sm font-medium text-foreground truncate">
              {getDisplayName(objective)}
            </span>
            {hasChildren && (
              <GitBranch className="h-3.5 w-3.5 text-brand-gold flex-shrink-0" />
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
          {context && (
            <span className="text-xs text-muted-foreground pl-1">{context}</span>
          )}
        </div>
        
        {/* Right side: progress bars + status */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Work progress */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground">Work</span>
            <div className="w-14">
              <ProgressBar progress={workProgress} height="sm" />
            </div>
          </div>
          {/* KR progress */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground">KR</span>
            <div className="w-14">
              <ProgressBar progress={krProgress} height="sm" />
            </div>
          </div>
          {/* Overall score percentage */}
          <span className="text-xs font-medium text-foreground w-10 text-right">
            {Math.round(krProgress)}%
          </span>
          <ObjectiveStatusBadge status={objective.status} size="sm" />
        </div>
      </div>
    </div>
  );
}
