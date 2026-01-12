/**
 * VersionComparisonView - Compare two versions of a test case side by side
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ArrowRight, 
  GitCompare,
  Plus,
  Minus,
  Edit,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestCaseVersion {
  id: string;
  version: number;
  title: string;
  description?: string;
  preconditions?: string;
  expectedResult?: string;
  status: string;
  priority: string;
  type: string;
  estimatedTime?: number;
  changedBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  changedAt: string;
  steps: {
    id: string;
    stepNumber: number;
    action: string;
    expectedResult?: string;
    testData?: string;
  }[];
}

interface VersionComparisonViewProps {
  leftVersion: TestCaseVersion;
  rightVersion: TestCaseVersion;
  onClose?: () => void;
  onRestoreVersion?: (version: number) => void;
}

type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffLine {
  type: DiffType;
  left?: string;
  right?: string;
}

function getDiffClass(type: DiffType): string {
  switch (type) {
    case 'added': return 'bg-green-500/10 border-l-2 border-green-500';
    case 'removed': return 'bg-red-500/10 border-l-2 border-red-500';
    case 'modified': return 'bg-amber-500/10 border-l-2 border-amber-500';
    default: return '';
  }
}

function getDiffIcon(type: DiffType) {
  switch (type) {
    case 'added': return <Plus className="h-3 w-3 text-green-500" />;
    case 'removed': return <Minus className="h-3 w-3 text-red-500" />;
    case 'modified': return <Edit className="h-3 w-3 text-amber-500" />;
    default: return null;
  }
}

function FieldComparison({ 
  label, 
  leftValue, 
  rightValue,
  isMultiline = false
}: { 
  label: string; 
  leftValue?: string | number; 
  rightValue?: string | number;
  isMultiline?: boolean;
}) {
  const leftStr = leftValue?.toString() || '';
  const rightStr = rightValue?.toString() || '';
  const hasChanged = leftStr !== rightStr;

  if (!hasChanged && !leftStr && !rightStr) return null;

  const diffType: DiffType = !leftStr && rightStr 
    ? 'added' 
    : leftStr && !rightStr 
      ? 'removed' 
      : hasChanged 
        ? 'modified' 
        : 'unchanged';

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
          {label}
          {diffType === 'removed' && getDiffIcon('removed')}
        </div>
        <div className={cn(
          'p-2 rounded text-sm min-h-[40px]',
          isMultiline ? 'whitespace-pre-wrap' : '',
          diffType === 'removed' || diffType === 'modified' ? getDiffClass(diffType) : 'bg-muted/50'
        )}>
          {leftStr || <span className="text-muted-foreground italic">Empty</span>}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
          {label}
          {diffType === 'added' && getDiffIcon('added')}
          {diffType === 'modified' && getDiffIcon('modified')}
        </div>
        <div className={cn(
          'p-2 rounded text-sm min-h-[40px]',
          isMultiline ? 'whitespace-pre-wrap' : '',
          diffType === 'added' || diffType === 'modified' ? getDiffClass(diffType) : 'bg-muted/50'
        )}>
          {rightStr || <span className="text-muted-foreground italic">Empty</span>}
        </div>
      </div>
    </div>
  );
}

export function VersionComparisonView({
  leftVersion,
  rightVersion,
  onClose,
  onRestoreVersion,
}: VersionComparisonViewProps) {
  const stepsDiff = useMemo(() => {
    const maxSteps = Math.max(leftVersion.steps.length, rightVersion.steps.length);
    const diffs: { 
      stepNumber: number; 
      left?: typeof leftVersion.steps[0]; 
      right?: typeof rightVersion.steps[0];
      type: DiffType;
    }[] = [];

    for (let i = 0; i < maxSteps; i++) {
      const left = leftVersion.steps[i];
      const right = rightVersion.steps[i];

      if (!left && right) {
        diffs.push({ stepNumber: i + 1, right, type: 'added' });
      } else if (left && !right) {
        diffs.push({ stepNumber: i + 1, left, type: 'removed' });
      } else if (left && right) {
        const hasChanged = 
          left.action !== right.action || 
          left.expectedResult !== right.expectedResult ||
          left.testData !== right.testData;
        diffs.push({ 
          stepNumber: i + 1, 
          left, 
          right, 
          type: hasChanged ? 'modified' : 'unchanged' 
        });
      }
    }

    return diffs;
  }, [leftVersion.steps, rightVersion.steps]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitCompare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Version Comparison</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        
        {/* Version Headers */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Version {leftVersion.version}</Badge>
              {leftVersion.version < rightVersion.version && (
                <Badge variant="secondary" className="text-xs">Older</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={leftVersion.changedBy.avatarUrl} />
                <AvatarFallback className="text-[10px]">
                  {leftVersion.changedBy.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span>{leftVersion.changedBy.name}</span>
              <Clock className="h-3 w-3 ml-2" />
              <span>{format(new Date(leftVersion.changedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
          
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Version {rightVersion.version}</Badge>
              {rightVersion.version > leftVersion.version && (
                <Badge variant="default" className="text-xs">Current</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={rightVersion.changedBy.avatarUrl} />
                <AvatarFallback className="text-[10px]">
                  {rightVersion.changedBy.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span>{rightVersion.changedBy.name}</span>
              <Clock className="h-3 w-3 ml-2" />
              <span>{format(new Date(rightVersion.changedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Basic Fields */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
            <FieldComparison label="Title" leftValue={leftVersion.title} rightValue={rightVersion.title} />
            <FieldComparison label="Status" leftValue={leftVersion.status} rightValue={rightVersion.status} />
            <FieldComparison label="Priority" leftValue={leftVersion.priority} rightValue={rightVersion.priority} />
            <FieldComparison label="Type" leftValue={leftVersion.type} rightValue={rightVersion.type} />
            <FieldComparison 
              label="Estimated Time (min)" 
              leftValue={leftVersion.estimatedTime} 
              rightValue={rightVersion.estimatedTime} 
            />
          </section>

          <Separator />

          {/* Text Fields */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Content</h3>
            <FieldComparison 
              label="Description" 
              leftValue={leftVersion.description} 
              rightValue={rightVersion.description}
              isMultiline 
            />
            <FieldComparison 
              label="Preconditions" 
              leftValue={leftVersion.preconditions} 
              rightValue={rightVersion.preconditions}
              isMultiline 
            />
            <FieldComparison 
              label="Expected Result" 
              leftValue={leftVersion.expectedResult} 
              rightValue={rightVersion.expectedResult}
              isMultiline 
            />
          </section>

          <Separator />

          {/* Steps */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Test Steps</h3>
            <div className="space-y-3">
              {stepsDiff.map((diff) => (
                <div 
                  key={diff.stepNumber} 
                  className={cn(
                    'grid grid-cols-2 gap-4 p-3 rounded-lg border',
                    diff.type !== 'unchanged' && 'border-dashed'
                  )}
                >
                  {/* Left Step */}
                  <div className={cn(
                    'p-2 rounded',
                    diff.type === 'removed' ? getDiffClass('removed') : 
                    diff.type === 'modified' ? getDiffClass('modified') : 
                    'bg-muted/30'
                  )}>
                    {diff.left ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">Step {diff.left.stepNumber}</Badge>
                          {(diff.type === 'removed' || diff.type === 'modified') && getDiffIcon(diff.type)}
                        </div>
                        <p className="text-sm mb-1"><strong>Action:</strong> {diff.left.action}</p>
                        {diff.left.expectedResult && (
                          <p className="text-sm text-muted-foreground"><strong>Expected:</strong> {diff.left.expectedResult}</p>
                        )}
                        {diff.left.testData && (
                          <p className="text-sm text-muted-foreground"><strong>Data:</strong> {diff.left.testData}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No step</p>
                    )}
                  </div>

                  {/* Right Step */}
                  <div className={cn(
                    'p-2 rounded',
                    diff.type === 'added' ? getDiffClass('added') : 
                    diff.type === 'modified' ? getDiffClass('modified') : 
                    'bg-muted/30'
                  )}>
                    {diff.right ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">Step {diff.right.stepNumber}</Badge>
                          {(diff.type === 'added' || diff.type === 'modified') && getDiffIcon(diff.type)}
                        </div>
                        <p className="text-sm mb-1"><strong>Action:</strong> {diff.right.action}</p>
                        {diff.right.expectedResult && (
                          <p className="text-sm text-muted-foreground"><strong>Expected:</strong> {diff.right.expectedResult}</p>
                        )}
                        {diff.right.testData && (
                          <p className="text-sm text-muted-foreground"><strong>Data:</strong> {diff.right.testData}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No step</p>
                    )}
                  </div>
                </div>
              ))}

              {stepsDiff.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No steps to compare</p>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      {onRestoreVersion && leftVersion.version < rightVersion.version && (
        <div className="border-t p-4">
          <Button 
            variant="outline" 
            onClick={() => onRestoreVersion(leftVersion.version)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Restore Version {leftVersion.version}
          </Button>
        </div>
      )}
    </div>
  );
}
