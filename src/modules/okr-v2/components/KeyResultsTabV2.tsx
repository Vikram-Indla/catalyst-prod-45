import { useState } from 'react';
import { useKeyResultsV2, useDeleteKeyResultV2, KeyResultV2 } from '@/hooks/useKeyResultsV2';
import { Button } from '@/components/ui/button';
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
    case 'increase': return <TrendingUp className="h-3.5 w-3.5 text-[var(--sem-success)]" />;
    case 'decrease': return <TrendingDown className="h-3.5 w-3.5 text-[var(--sem-danger)]" />;
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
    <div className="p-6 space-y-4 bg-white dark:bg-[#161B22]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#24292F] dark:text-[#E6EDF3]">
          Key Results ({keyResults?.length || 0})
        </h3>
        <Button 
          size="sm" 
          onClick={handleCreate} 
          className="gap-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white"
        >
          <Plus className="h-4 w-4" />
          Add Key Result
        </Button>
      </div>

      {keyResults && keyResults.length > 0 ? (
        <div className="space-y-2">
          {keyResults.map((kr) => (
            <div key={kr.id} className="border border-[#E1E4E8] dark:border-[#30363D] rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] transition-colors"
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
                  <span className="font-medium truncate text-[#24292F] dark:text-[#E6EDF3]">{kr.summary}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-[#8B949E] dark:text-[#6E7681]">{Math.round(kr.progress)}%</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D]">
                    {kr.metric_type}
                  </span>
                </div>
              </div>

              {expandedKrs.has(kr.id) && (
                <div className="px-4 py-4 border-t border-[#EAECEF] dark:border-[#21262D] space-y-4 bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #FAFBFC))] dark:bg-[#0D1117]">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681] mb-1">Baseline</p>
                      <p className="text-2xl font-bold text-[#24292F] dark:text-[#E6EDF3]">{kr.baseline_value}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681] mb-1">Current</p>
                      <p className="text-2xl font-bold text-[#24292F] dark:text-[#E6EDF3]">{kr.current_value}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681] mb-1">Target</p>
                      <p className="text-2xl font-bold text-[#24292F] dark:text-[#E6EDF3]">{kr.goal_value}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#8B949E] dark:text-[#6E7681]">Progress</span>
                      <span className="font-semibold text-[#24292F] dark:text-[#E6EDF3]">{Math.round(kr.progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-[var(--status-success)] transition-all duration-300"
                        style={{ width: `${kr.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Timeframe Display */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#EAECEF] dark:border-[#21262D]">
                    <Calendar className="h-4 w-4 text-[#8B949E] dark:text-[#6E7681]" />
                    <span className="text-sm text-[#8B949E] dark:text-[#6E7681]">Timeframe:</span>
                    {kr.start_date && kr.end_date ? (
                      <span className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">
                        {format(new Date(kr.start_date), 'dd MMM yyyy')} → {format(new Date(kr.end_date), 'dd MMM yyyy')}
                      </span>
                    ) : (
                      <span className="text-sm text-[#8B949E] dark:text-[#6E7681] italic">Not set</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#EAECEF] dark:border-[#21262D] flex-wrap">
                    <button 
                      onClick={(e) => handleAlignWork(kr, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] hover:border-[rgba(37,99,235,0.3)] transition-colors"
                    >
                      <Link2 className="h-4 w-4" />
                      Align Work
                    </button>
                    <button 
                      onClick={(e) => handleEdit(kr, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] hover:border-[rgba(37,99,235,0.3)] transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Update Value
                    </button>
                    <button 
                      onClick={(e) => handleDelete(kr, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] hover:border-[rgba(37,99,235,0.3)] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-[#161B22]">
          <div className="w-16 h-16 rounded-full bg-[#F6F8FA] dark:bg-[#21262D] flex items-center justify-center mb-4">
            <TrendingUp className="h-7 w-7 text-[#8B949E] dark:text-[#6E7681]" />
          </div>
          <h3 className="text-base font-semibold text-[#24292F] dark:text-[#E6EDF3] mb-2">No key results yet</h3>
          <p className="text-sm text-[#8B949E] dark:text-[#6E7681]">Add key results to track progress toward this objective</p>
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
