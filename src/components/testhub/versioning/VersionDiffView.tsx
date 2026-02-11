/**
 * G20: Version Diff View — Side-by-side comparison modal
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, X, ChevronDown, Plus, Minus, Equal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TestCaseVersion } from '@/hooks/test-management/useTestCaseVersions';
import { format } from 'date-fns';

interface VersionDiffViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: TestCaseVersion[];
  initialLeft?: number;
  initialRight?: number;
}

interface StepSnapshot {
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string | null;
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: 'Title', objective: 'Objective', description: 'Description',
    preconditions: 'Preconditions', priority: 'Priority', status: 'Status',
  };
  return labels[field] || field;
}

function DiffField({ label, left, right }: { label: string; left?: string | null; right?: string | null }) {
  const changed = left !== right;
  return (
    <div className={cn('rounded-lg border p-3 mb-3', changed ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20' : 'border-border')}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        {changed && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Changed</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={cn('text-sm', changed ? 'bg-red-50 dark:bg-red-950/20 rounded p-2 border border-red-200 dark:border-red-800' : '')}>
          {left || <span className="text-muted-foreground italic">Empty</span>}
        </div>
        <div className={cn('text-sm', changed ? 'bg-green-50 dark:bg-green-950/20 rounded p-2 border border-green-200 dark:border-green-800' : '')}>
          {right || <span className="text-muted-foreground italic">Empty</span>}
        </div>
      </div>
    </div>
  );
}

function StepsDiff({ leftSteps, rightSteps }: { leftSteps: StepSnapshot[]; rightSteps: StepSnapshot[] }) {
  const maxLen = Math.max(leftSteps.length, rightSteps.length);
  if (maxLen === 0) return <p className="text-sm text-muted-foreground">No steps</p>;

  return (
    <div className="space-y-2">
      {Array.from({ length: maxLen }, (_, i) => {
        const left = leftSteps[i];
        const right = rightSteps[i];
        const isNew = !left && right;
        const isRemoved = left && !right;
        const isChanged = left && right && (left.action !== right.action || left.expected_result !== right.expected_result);

        return (
          <div key={i} className={cn(
            'grid grid-cols-2 gap-4 p-3 rounded-lg border',
            isNew ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-950/20' :
            isRemoved ? 'border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-950/20' :
            isChanged ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20' :
            'border-border'
          )}>
            <div>
              {left ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">Step {left.step_number}</span>
                    {isRemoved && <Badge variant="outline" className="text-[10px] text-red-600 border-red-300"><Minus size={8} className="mr-1" />Removed</Badge>}
                  </div>
                  <p className="text-sm">{left.action}</p>
                  {left.expected_result && <p className="text-xs text-muted-foreground mt-1">Expected: {left.expected_result}</p>}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm italic">—</span>
              )}
            </div>
            <div>
              {right ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">Step {right.step_number}</span>
                    {isNew && <Badge variant="outline" className="text-[10px] text-green-600 border-green-300"><Plus size={8} className="mr-1" />New</Badge>}
                    {isChanged && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Modified</Badge>}
                  </div>
                  <p className="text-sm">{right.action}</p>
                  {right.expected_result && <p className="text-xs text-muted-foreground mt-1">Expected: {right.expected_result}</p>}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm italic">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VersionDiffView({ open, onOpenChange, versions, initialLeft, initialRight }: VersionDiffViewProps) {
  const sorted = useMemo(() => [...versions].sort((a, b) => a.version_number - b.version_number), [versions]);
  const [leftVersion, setLeftVersion] = useState<number>(initialLeft || sorted[0]?.version_number || 1);
  const [rightVersion, setRightVersion] = useState<number>(initialRight || sorted[sorted.length - 1]?.version_number || 1);

  const left = sorted.find(v => v.version_number === leftVersion);
  const right = sorted.find(v => v.version_number === rightVersion);

  const leftSnapshot = left?.snapshot || {} as any;
  const rightSnapshot = right?.snapshot || {} as any;
  const leftSteps: StepSnapshot[] = (left as any)?.steps || leftSnapshot.steps || [];
  const rightSteps: StepSnapshot[] = (right as any)?.steps || rightSnapshot.steps || [];

  const fields = ['title', 'objective', 'description', 'preconditions', 'priority', 'status'];
  const changedCount = fields.filter(f => leftSnapshot[f] !== rightSnapshot[f]).length +
    (JSON.stringify(leftSteps) !== JSON.stringify(rightSteps) ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Compare Versions
            {changedCount > 0 && (
              <Badge variant="secondary" className="text-xs">{changedCount} change{changedCount !== 1 ? 's' : ''}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Version selectors */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground w-12">From:</span>
            <Select value={String(leftVersion)} onValueChange={v => setLeftVersion(Number(v))}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sorted.map(v => (
                  <SelectItem key={v.version_number} value={String(v.version_number)}>
                    v{v.version_number} — {format(new Date(v.created_at), 'MMM d, yyyy')}
                    {v.changed_by_profile?.full_name ? ` by ${v.changed_by_profile.full_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground w-12">To:</span>
            <Select value={String(rightVersion)} onValueChange={v => setRightVersion(Number(v))}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sorted.map(v => (
                  <SelectItem key={v.version_number} value={String(v.version_number)}>
                    v{v.version_number} — {format(new Date(v.created_at), 'MMM d, yyyy')}
                    {v.changed_by_profile?.full_name ? ` by ${v.changed_by_profile.full_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
            Version {leftVersion} {left?.changed_by_profile?.full_name ? `— ${left.changed_by_profile.full_name}` : ''}
          </div>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            Version {rightVersion} {right?.changed_by_profile?.full_name ? `— ${right.changed_by_profile.full_name}` : ''}
          </div>
        </div>

        {/* Diff content */}
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-1">
            {fields.map(field => (
              <DiffField
                key={field}
                label={getFieldLabel(field)}
                left={leftSnapshot[field]}
                right={rightSnapshot[field]}
              />
            ))}

            {/* Steps diff */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Steps</span>
                <Badge variant="outline" className="text-[10px]">
                  {leftSteps.length} → {rightSteps.length}
                </Badge>
              </div>
              <StepsDiff leftSteps={leftSteps} rightSteps={rightSteps} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
