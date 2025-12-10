import { useState } from 'react';
import { useKeyResultsV2, useCreateKeyResultV2, useDeleteKeyResultV2, KeyResultV2, MetricType } from '@/hooks/useKeyResultsV2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KRWorkContributionsV2 } from './KRWorkContributionsV2';

interface KeyResultsTabV2Props {
  objectiveId: string;
}

function getHealthColor(progress: number): string {
  if (progress >= 75) return 'bg-green-500';
  if (progress >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getDirectionIcon(direction: string) {
  switch (direction) {
    case 'increase': return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    case 'decrease': return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function KeyResultsTabV2({ objectiveId }: KeyResultsTabV2Props) {
  const { data: keyResults, isLoading } = useKeyResultsV2(objectiveId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedKR, setSelectedKR] = useState<KeyResultV2 | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Key Results ({keyResults?.length || 0})
        </h3>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add KR
        </Button>
      </div>

      {keyResults && keyResults.length > 0 ? (
        <div className="space-y-3">
          {keyResults.map((kr) => (
            <KeyResultCard
              key={kr.id}
              kr={kr}
              onClick={() => setSelectedKR(kr)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No key results yet</p>
          <p className="text-xs mt-1">Add key results to track progress toward this objective</p>
        </div>
      )}

      <CreateKRDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        objectiveId={objectiveId}
      />

      {selectedKR && (
        <KRDetailDialog
          kr={selectedKR}
          open={!!selectedKR}
          onClose={() => setSelectedKR(null)}
        />
      )}
    </div>
  );
}

interface KeyResultCardProps {
  kr: KeyResultV2;
  onClick: () => void;
}

function KeyResultCard({ kr, onClick }: KeyResultCardProps) {
  const deleteKR = useDeleteKeyResultV2();

  return (
    <div
      className="p-4 bg-card border border-border rounded-lg cursor-pointer hover:border-brand-gold/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getDirectionIcon(kr.direction)}
            <span className="text-sm font-medium text-foreground truncate">
              {kr.summary}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span>Baseline: {kr.baseline_value}</span>
            <span>Current: {kr.current_value}</span>
            <span>Target: {kr.goal_value}</span>
            <Badge variant="outline" className="text-xs">
              {kr.metric_type}
            </Badge>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(kr.progress)}%</span>
            </div>
            <Progress value={kr.progress} className="h-1.5" />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteKR.mutate({ id: kr.id, objectiveId: kr.objective_id });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface CreateKRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
}

function CreateKRDialog({ open, onOpenChange, objectiveId }: CreateKRDialogProps) {
  const createKR = useCreateKeyResultV2();
  
  const [summary, setSummary] = useState('');
  const [metricType, setMetricType] = useState<MetricType>('number');
  const [baselineValue, setBaselineValue] = useState('0');
  const [goalValue, setGoalValue] = useState('100');
  const [direction, setDirection] = useState<'increase' | 'decrease' | 'maintain'>('increase');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    await createKR.mutateAsync({
      objective_id: objectiveId,
      summary: summary.trim(),
      metric_type: metricType,
      baseline_value: parseFloat(baselineValue) || 0,
      goal_value: parseFloat(goalValue) || 100,
      direction,
    });

    // Reset form
    setSummary('');
    setMetricType('number');
    setBaselineValue('0');
    setGoalValue('100');
    setDirection('increase');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Key Result</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summary">Name *</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g., Increase monthly active users"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Metric Type</Label>
              <Select value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline">Baseline Value</Label>
              <Input
                id="baseline"
                type="number"
                value={baselineValue}
                onChange={(e) => setBaselineValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Target Value</Label>
              <Input
                id="goal"
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!summary.trim() || createKR.isPending}>
              {createKR.isPending ? 'Adding...' : 'Add Key Result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface KRDetailDialogProps {
  kr: KeyResultV2;
  open: boolean;
  onClose: () => void;
}

function KRDetailDialog({ kr, open, onClose }: KRDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDirectionIcon(kr.direction)}
            {kr.summary}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(kr.progress)}%</span>
            </div>
            <Progress value={kr.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Baseline: {kr.baseline_value}</span>
              <span>Current: {kr.current_value}</span>
              <span>Target: {kr.goal_value}</span>
            </div>
          </div>

          {/* Work Contributions */}
          <div>
            <h4 className="text-sm font-medium mb-3">Linked Work Items</h4>
            <KRWorkContributionsV2 keyResultId={kr.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
