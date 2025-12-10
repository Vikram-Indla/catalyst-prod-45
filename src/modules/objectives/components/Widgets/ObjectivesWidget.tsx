import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Target } from 'lucide-react';
import { useObjectives } from '@/hooks/useObjectives';
import { ObjectiveStatusBadge } from '../shared/ObjectiveStatusBadge';
import { ObjectiveScoreBadge } from '../shared/ObjectiveScoreBadge';
import { ProgressBar } from '../shared/ProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { CreateObjectiveDialog } from '../ObjectivePanel/CreateObjectiveDialog';
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import type { ObjectiveTier } from '../../types/objective.types';

interface ObjectivesWidgetProps {
  tier: ObjectiveTier;
  portfolioId?: string;
  programId?: string;
  piId?: string;
  limit?: number;
  title?: string;
  showCreate?: boolean;
  onViewAll?: () => void;
}

export function ObjectivesWidget({
  tier,
  portfolioId,
  programId,
  piId,
  limit = 5,
  title,
  showCreate = true,
  onViewAll,
}: ObjectivesWidgetProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);

  const filters: any = {
    tier: [tier],
    portfolioIds: portfolioId ? [portfolioId] : undefined,
    programIds: programId ? [programId] : undefined,
    piIds: piId ? [piId] : undefined,
  };

  const { data: objectivesData = { tree: [], flat: [] }, isLoading } = useObjectives(filters);
  const objectives = objectivesData?.flat || [];
  const displayObjectives = objectives.slice(0, limit);

  const defaultTitle = tier === 'portfolio' 
    ? 'Portfolio Objectives' 
    : tier === 'program' 
    ? 'Program Objectives' 
    : 'Team Objectives';

  return (
    <>
      <Card className="p-[var(--s6)]">
        <div className="flex items-center justify-between mb-[var(--s4)]">
          <div className="flex items-center gap-[var(--s2)]">
            <Target className="h-5 w-5 text-brand-gold" />
            <h3 className="font-semibold">{title || defaultTitle}</h3>
          </div>
          <div className="flex items-center gap-[var(--s2)]">
            {showCreate && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            )}
            {onViewAll && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onViewAll}
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-[var(--s3)]">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : displayObjectives.length === 0 ? (
          <div className="text-center py-[var(--s8)]">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-[var(--s3)] opacity-20" />
            <p className="text-sm text-muted-foreground mb-[var(--s4)]">
              No objectives found
            </p>
            {showCreate && (
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Objective
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-[var(--s3)]">
            {displayObjectives.map((objective) => (
              <div
                key={objective.id}
                className="border rounded-lg p-[var(--s4)] hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedObjectiveId(objective.id)}
              >
                <div className="flex items-start justify-between gap-[var(--s3)] mb-[var(--s2)]">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{objective.summary}</h4>
                    <div className="flex items-center gap-[var(--s2)]">
                      <ObjectiveStatusBadge status={objective.status} size="sm" />
                      <ObjectiveScoreBadge score={objective.score ?? null} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[var(--s3)] mt-[var(--s3)]">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">KR Progress</p>
                    <ProgressBar
                      progress={objective.key_result_progress * 100}
                      score={objective.score ?? null}
                      height="sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Work Progress</p>
                    <ProgressBar
                      progress={objective.work_progress * 100}
                      score={objective.score ?? null}
                      height="sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CreateObjectiveDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        tier={tier}
        portfolioId={portfolioId}
        programId={programId}
      />

      {selectedObjectiveId && (
        <ObjectiveDetailsPanelNew
          objectiveId={selectedObjectiveId}
          open={!!selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}
    </>
  );
}
