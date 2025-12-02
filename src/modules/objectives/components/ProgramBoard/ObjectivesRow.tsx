import { useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObjectives } from '@/hooks/useObjectives';
import { CreateObjectiveDialog } from '../ObjectivePanel/CreateObjectiveDialog';
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import { ObjectiveScoreBadge } from '../shared/ObjectiveScoreBadge';
import { cn } from '@/lib/utils';

interface ObjectivesRowProps {
  programId?: string;
  piId?: string;
  sprints?: Array<{ id: string; name: string }>;
}

export function ObjectivesRow({ programId, piId, sprints = [] }: ObjectivesRowProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);

  const filters: any = {
    tier: ['program'],
    programIds: programId ? [programId] : undefined,
    piIds: piId ? [piId] : undefined,
  };

  const { data: objectives = [] } = useObjectives(filters);

  return (
    <>
      <div className="border-t border-b bg-muted/20">
        <div className="flex items-center gap-[var(--s3)] px-[var(--s4)] py-[var(--s3)]">
          <div className="flex items-center gap-[var(--s2)] min-w-[200px]">
            <Target className="h-4 w-4 text-brand-gold" />
            <span className="font-medium text-sm">Objectives</span>
          </div>

          <div className="flex-1 flex items-center gap-[var(--s2)] overflow-x-auto">
            {objectives.length === 0 ? (
              <div className="text-xs text-muted-foreground">No objectives linked to this PI</div>
            ) : (
              objectives.map((objective) => (
                <div
                  key={objective.id}
                  className={cn(
                    "flex items-center gap-[var(--s2)] px-[var(--s3)] py-[var(--s2)]",
                    "border rounded-md bg-background cursor-pointer hover:bg-muted/50 transition-colors",
                    "min-w-[200px]"
                  )}
                  onClick={() => setSelectedObjectiveId(objective.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{objective.summary}</p>
                  </div>
                  <ObjectiveScoreBadge score={objective.score ?? null} size="sm" />
                </div>
              ))
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CreateObjectiveDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        tier="program"
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
