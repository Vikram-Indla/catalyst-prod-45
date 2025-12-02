import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useObjective } from '@/hooks/useObjectives';
import { ObjectiveStatusBadge } from '@/modules/objectives/components/shared/ObjectiveStatusBadge';
import { ObjectiveScoreBadge } from '@/modules/objectives/components/shared/ObjectiveScoreBadge';
import { ObjectiveTierIcon } from '@/modules/objectives/components/shared/ObjectiveTierIcon';
import { ProgressBar } from '@/modules/objectives/components/shared/ProgressBar';
import { KeyResultCard } from '@/modules/objectives/components/KeyResults';
import { useObjectiveDetail } from '@/hooks/useObjectiveDetail';

interface ObjectiveQuickViewProps {
  objectiveId: string;
  open: boolean;
  onClose: () => void;
}

export function ObjectiveQuickView({ objectiveId, open, onClose }: ObjectiveQuickViewProps) {
  const { data: objectiveDetail, isLoading } = useObjectiveDetail(objectiveId);

  if (isLoading || !objectiveDetail) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-[var(--s3)]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
            <div className="flex items-center gap-[var(--s2)] mb-[var(--s2)]">
              <ObjectiveTierIcon tier={objectiveDetail.tier as any} size="sm" />
                <span className="text-xs text-muted-foreground font-mono">
                  {objectiveDetail.id.slice(0, 8)}
                </span>
              </div>
              <SheetTitle className="text-lg">{objectiveDetail.summary}</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-[var(--s2)]">
            <ObjectiveStatusBadge status={objectiveDetail.status} size="sm" />
            <ObjectiveScoreBadge score={objectiveDetail.score ?? null} size="sm" />
          </div>
        </SheetHeader>

        <div className="mt-[var(--s6)] space-y-[var(--s6)]">
          {/* Description */}
          {objectiveDetail.description && (
            <div>
              <h3 className="font-medium mb-[var(--s2)]">Description</h3>
              <p className="text-sm text-muted-foreground">{objectiveDetail.description}</p>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-[var(--s3)]">
            <div>
              <h3 className="font-medium mb-[var(--s2)]">Key Results Progress</h3>
              <ProgressBar
                progress={objectiveDetail.key_result_progress * 100}
                score={objectiveDetail.score ?? null}
                height="default"
                showLabel
              />
            </div>
            <div>
              <h3 className="font-medium mb-[var(--s2)]">Work Progress</h3>
              <ProgressBar
                progress={objectiveDetail.work_progress * 100}
                score={objectiveDetail.score ?? null}
                height="default"
                showLabel
              />
            </div>
          </div>

          {/* Key Results */}
          {objectiveDetail.keyResults && objectiveDetail.keyResults.length > 0 && (
            <div>
              <h3 className="font-medium mb-[var(--s3)]">Key Results</h3>
              <div className="space-y-[var(--s3)]">
                {objectiveDetail.keyResults.map((kr: any) => (
                  <KeyResultCard key={kr.id} keyResult={kr} />
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-[var(--s4)] text-sm">
            {objectiveDetail.health && (
              <div>
                <span className="text-muted-foreground">Health</span>
                <p className="font-medium capitalize">{objectiveDetail.health}</p>
              </div>
            )}
            {objectiveDetail.category && (
              <div>
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium capitalize">{objectiveDetail.category.replace('_', ' ')}</p>
              </div>
            )}
            {objectiveDetail.start_date && (
              <div>
                <span className="text-muted-foreground">Start Date</span>
                <p className="font-medium">{new Date(objectiveDetail.start_date).toLocaleDateString()}</p>
              </div>
            )}
            {objectiveDetail.due_date && (
              <div>
                <span className="text-muted-foreground">Due Date</span>
                <p className="font-medium">{new Date(objectiveDetail.due_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
