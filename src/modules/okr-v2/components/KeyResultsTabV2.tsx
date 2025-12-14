import { useState } from 'react';
import { useKeyResultsV2, useDeleteKeyResultV2, KeyResultV2 } from '@/hooks/useKeyResultsV2';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Edit, ChevronDown, ChevronRight, Link2, Calendar } from 'lucide-react';
import { KeyResultDialogV2 } from './KeyResultDialogV2';
import { KRWorkAlignmentDrawer } from './KRWorkAlignmentDrawer';
import { format } from 'date-fns';

interface KeyResultsTabV2Props {
  objectiveId: string;
  onMutation?: () => void;
}

function getDirectionIcon(direction: string) {
  switch (direction) {
    case 'increase': return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    case 'decrease': return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function KeyResultsTabV2({ objectiveId, onMutation }: KeyResultsTabV2Props) {
  const { data: keyResults, isLoading } = useKeyResultsV2(objectiveId);
  const deleteKR = useDeleteKeyResultV2();
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [selectedKR, setSelectedKR] = useState<KeyResultV2 | null>(null);
  const [expandedKrs, setExpandedKrs] = useState<Set<string>>(new Set());
  const [alignmentDrawerKR, setAlignmentDrawerKR] = useState<KeyResultV2 | null>(null);

  const toggleExpanded = (krId: string) => {
    const newExpanded = new Set(expandedKrs);
    if (newExpanded.has(krId)) {
      newExpanded.delete(krId);
    } else {
      newExpanded.add(krId);
    }
    setExpandedKrs(newExpanded);
  };

  const handleCreate = () => {
    setSelectedKR(null);
    setKrDialogOpen(true);
  };

  const handleEdit = (kr: KeyResultV2, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKR(kr);
    setKrDialogOpen(true);
  };

  const handleDelete = (kr: KeyResultV2, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this key result?')) {
      deleteKR.mutate(
        { id: kr.id, objectiveId: kr.objective_id },
        { onSuccess: () => onMutation?.() }
      );
    }
  };

  const handleAlignWork = (kr: KeyResultV2, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlignmentDrawerKR(kr);
  };

  const handleKRDialogClose = () => {
    setKrDialogOpen(false);
    setSelectedKR(null);
    onMutation?.();
  };

  const handleAlignmentDrawerClose = () => {
    setAlignmentDrawerKR(null);
    onMutation?.();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Key Results ({keyResults?.length || 0})
        </h3>
        <Button variant="outline" size="sm" onClick={handleCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Key Result
        </Button>
      </div>

      {keyResults && keyResults.length > 0 ? (
        <div className="space-y-2">
          {keyResults.map((kr) => (
            <div key={kr.id} className="border border-border rounded-lg">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpanded(kr.id)}
              >
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                  {expandedKrs.has(kr.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getDirectionIcon(kr.direction)}
                  <span className="font-medium truncate">{kr.summary}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-muted-foreground">{Math.round(kr.progress)}%</span>
                  <Badge variant="outline" className="text-xs">{kr.metric_type}</Badge>
                </div>
              </div>

              {expandedKrs.has(kr.id) && (
                <div className="px-4 py-4 border-t border-border space-y-4 bg-muted/20">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Baseline</div>
                      <div className="font-medium">{kr.baseline_value}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Current</div>
                      <div className="font-medium">{kr.current_value}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Target</div>
                      <div className="font-medium">{kr.goal_value}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(kr.progress)}%</span>
                    </div>
                    <Progress value={kr.progress} className="h-2" />
                  </div>

                  {/* Timeframe Display */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Timeframe:</span>
                    {kr.start_date && kr.end_date ? (
                      <span className="text-sm font-medium">
                        {format(new Date(kr.start_date), 'dd MMM yyyy')} → {format(new Date(kr.end_date), 'dd MMM yyyy')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Not set</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => handleAlignWork(kr, e)}
                      className="gap-1.5"
                    >
                      <Link2 className="h-4 w-4" />
                      Align Work
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => handleEdit(kr, e)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update Value
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => handleDelete(kr, e)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No key results yet</p>
          <p className="text-xs mt-1">Add key results to track progress toward this objective</p>
        </div>
      )}

      <KeyResultDialogV2
        open={krDialogOpen}
        onClose={handleKRDialogClose}
        objectiveId={objectiveId}
        keyResult={selectedKR}
      />

      <KRWorkAlignmentDrawer
        keyResult={alignmentDrawerKR}
        open={!!alignmentDrawerKR}
        onClose={handleAlignmentDrawerClose}
        objectiveId={objectiveId}
      />
    </div>
  );
}
