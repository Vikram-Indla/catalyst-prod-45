import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, ExternalLink, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { LinkObjectiveDialog } from './LinkObjectiveDialog';
import { ObjectiveScoreBadge } from '../shared/ObjectiveScoreBadge';
import { ProgressBar } from '../shared/ProgressBar';
import { cn } from '@/lib/utils';

interface ObjectivesSectionProps {
  workItemId: string;
  workItemType: 'epic' | 'feature' | 'story';
  readOnly?: boolean;
}

export function ObjectivesSection({ workItemId, workItemType, readOnly = false }: ObjectivesSectionProps) {
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // Fetch linked objectives
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['work-item-objectives', workItemType, workItemId],
    queryFn: async () => {
      const table = `objective_${workItemType}_links` as 'objective_epic_links';
      const column = `${workItemType}_id`;
      
      const { data, error } = await supabase
        .from(table as any)
        .select(`
          objective_id,
          objectives!inner(
            id,
            summary,
            status,
            tier,
            score,
            confidence_score,
            work_progress,
            key_result_progress
          )
        `)
        .eq(column, workItemId);
      
      if (error) throw error;
      return (data || []).map((d: any) => d.objectives).filter(Boolean);
    },
  });

  // Remove link mutation
  const removeLinkMutation = useMutation({
    mutationFn: async (objectiveId: string) => {
      const table = `objective_${workItemType}_links` as 'objective_epic_links';
      const column = `${workItemType}_id`;
      
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('objective_id', objectiveId)
        .eq(column, workItemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-objectives', workItemType, workItemId] });
      toast.success('Objective unlinked');
    },
    onError: () => {
      toast.error('Failed to unlink objective');
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      on_track: 'bg-success/10 text-success border-success/20',
      at_risk: 'bg-warning/10 text-warning border-warning/20',
      off_track: 'bg-destructive/10 text-destructive border-destructive/20',
      completed: 'bg-info/10 text-info border-info/20',
      pending: 'bg-muted text-muted-foreground border-border',
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Objectives</h3>
        </div>
        <div className="h-20 bg-muted animate-pulse rounded" />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Objectives ({objectives.length})</h3>
          </div>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLinkDialog(true)}
              className="h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              Link
            </Button>
          )}
        </div>

        {objectives.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              No objectives linked to this {workItemType}
            </p>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Link Objective
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {objectives.map((objective: any) => (
              <div
                key={objective.id}
                className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {objective.id.slice(0, 8)}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {objective.tier}
                      </Badge>
                      <Badge className={cn('text-xs', getStatusColor(objective.status))}>
                        {objective.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-medium truncate">{objective.summary}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeLinkMutation.mutate(objective.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Score: </span>
                    <ObjectiveScoreBadge score={objective.score} size="sm" />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence: </span>
                    <span className="font-medium">
                      {objective.confidence_score ? `${(objective.confidence_score * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                {objective.key_result_progress !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">KR Progress</span>
                      <span className="font-medium">{objective.key_result_progress}%</span>
                    </div>
                    <ProgressBar progress={objective.key_result_progress} height="sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <LinkObjectiveDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        workItemId={workItemId}
        workItemType={workItemType}
      />
    </>
  );
}
