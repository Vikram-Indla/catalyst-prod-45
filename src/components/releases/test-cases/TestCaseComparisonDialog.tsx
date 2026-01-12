/**
 * Test Case Comparison Dialog
 * Side-by-side comparison of two test case versions or different test cases
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GitCompare,
  ArrowLeftRight,
  ChevronDown,
  Check,
  X,
  Plus,
  Minus,
  Equal,
  Clock,
  User,
  Tag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TestCaseVersion {
  id: string;
  version: string;
  title: string;
  description?: string;
  priority: string;
  type: string;
  status: string;
  steps: {
    stepNumber: number;
    action: string;
    expectedResult: string;
    testData?: string;
  }[];
  preconditions: string[];
  tags: string[];
  modifiedAt: string;
  modifiedBy: string;
}

interface TestCaseComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftVersion?: TestCaseVersion;
  rightVersion?: TestCaseVersion;
  availableVersions?: TestCaseVersion[];
}

// Mock data for demonstration
const MOCK_VERSIONS: TestCaseVersion[] = [
  {
    id: 'v3',
    version: 'v3.0 (Current)',
    title: 'User Login with Email',
    description: 'Verify user can login with valid email and password',
    priority: 'high',
    type: 'functional',
    status: 'approved',
    steps: [
      { stepNumber: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed' },
      { stepNumber: 2, action: 'Enter valid email address', expectedResult: 'Email field accepts input', testData: 'user@example.com' },
      { stepNumber: 3, action: 'Enter valid password', expectedResult: 'Password field accepts input (masked)', testData: '********' },
      { stepNumber: 4, action: 'Click "Sign In" button', expectedResult: 'User is redirected to dashboard' },
      { stepNumber: 5, action: 'Verify user session', expectedResult: 'Session token is stored securely' },
    ],
    preconditions: ['User account exists', 'User is not logged in', 'Internet connection available'],
    tags: ['login', 'authentication', 'security', 'smoke'],
    modifiedAt: '2024-01-15T10:30:00Z',
    modifiedBy: 'John Smith',
  },
  {
    id: 'v2',
    version: 'v2.0',
    title: 'User Login with Email',
    description: 'Verify user can login with valid email and password',
    priority: 'medium',
    type: 'functional',
    status: 'approved',
    steps: [
      { stepNumber: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed' },
      { stepNumber: 2, action: 'Enter valid email address', expectedResult: 'Email field accepts input', testData: 'test@test.com' },
      { stepNumber: 3, action: 'Enter valid password', expectedResult: 'Password field accepts input', testData: 'password123' },
      { stepNumber: 4, action: 'Click Login button', expectedResult: 'User is logged in and redirected' },
    ],
    preconditions: ['User account exists', 'User is not logged in'],
    tags: ['login', 'authentication'],
    modifiedAt: '2024-01-10T14:20:00Z',
    modifiedBy: 'Jane Doe',
  },
  {
    id: 'v1',
    version: 'v1.0',
    title: 'User Login',
    description: 'Basic login test',
    priority: 'low',
    type: 'functional',
    status: 'draft',
    steps: [
      { stepNumber: 1, action: 'Go to login', expectedResult: 'Page loads' },
      { stepNumber: 2, action: 'Enter credentials', expectedResult: 'Fields accept input' },
      { stepNumber: 3, action: 'Submit form', expectedResult: 'User logged in' },
    ],
    preconditions: ['User exists'],
    tags: ['login'],
    modifiedAt: '2024-01-05T09:00:00Z',
    modifiedBy: 'Admin',
  },
];

type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffResult {
  field: string;
  left?: string;
  right?: string;
  type: DiffType;
}

export function TestCaseComparisonDialog({
  open,
  onOpenChange,
  leftVersion,
  rightVersion,
  availableVersions = MOCK_VERSIONS,
}: TestCaseComparisonDialogProps) {
  const [leftId, setLeftId] = useState(leftVersion?.id || availableVersions[1]?.id || '');
  const [rightId, setRightId] = useState(rightVersion?.id || availableVersions[0]?.id || '');

  const left = useMemo(() => availableVersions.find(v => v.id === leftId), [availableVersions, leftId]);
  const right = useMemo(() => availableVersions.find(v => v.id === rightId), [availableVersions, rightId]);

  const swapVersions = () => {
    const temp = leftId;
    setLeftId(rightId);
    setRightId(temp);
  };

  const getDiffType = (leftVal?: string, rightVal?: string): DiffType => {
    if (!leftVal && rightVal) return 'added';
    if (leftVal && !rightVal) return 'removed';
    if (leftVal !== rightVal) return 'modified';
    return 'unchanged';
  };

  const getDiffIcon = (type: DiffType) => {
    switch (type) {
      case 'added': return <Plus className="w-3 h-3 text-green-600" />;
      case 'removed': return <Minus className="w-3 h-3 text-red-600" />;
      case 'modified': return <ArrowLeftRight className="w-3 h-3 text-amber-600" />;
      case 'unchanged': return <Equal className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getDiffBg = (type: DiffType, side: 'left' | 'right') => {
    switch (type) {
      case 'added': return side === 'right' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted/30';
      case 'removed': return side === 'left' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-muted/30';
      case 'modified': return 'bg-amber-50 dark:bg-amber-950/30';
      default: return '';
    }
  };

  const fieldDiffs = useMemo(() => {
    if (!left || !right) return [];

    const diffs: DiffResult[] = [];

    // Compare basic fields
    const fields: Array<{ key: keyof TestCaseVersion; label: string }> = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'priority', label: 'Priority' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
    ];

    fields.forEach(({ key, label }) => {
      const leftVal = String(left[key] || '');
      const rightVal = String(right[key] || '');
      diffs.push({
        field: label,
        left: leftVal,
        right: rightVal,
        type: getDiffType(leftVal, rightVal),
      });
    });

    return diffs;
  }, [left, right]);

  const changedFieldsCount = fieldDiffs.filter(d => d.type !== 'unchanged').length;
  const stepsChanged = left && right && JSON.stringify(left.steps) !== JSON.stringify(right.steps);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <GitCompare className="w-5 h-5" />
            </div>
            Compare Versions
          </DialogTitle>
          <DialogDescription>
            Compare two versions of this test case to see what changed
          </DialogDescription>
        </DialogHeader>

        {/* Version Selectors */}
        <div className="flex items-center gap-4 py-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Base Version</label>
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {availableVersions.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === rightId}>
                    <div className="flex items-center gap-2">
                      <span>{v.version}</span>
                      <span className="text-xs text-muted-foreground">by {v.modifiedBy}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="icon" className="mt-5" onClick={swapVersions}>
            <ArrowLeftRight className="w-4 h-4" />
          </Button>

          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Compare To</label>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {availableVersions.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === leftId}>
                    <div className="flex items-center gap-2">
                      <span>{v.version}</span>
                      <span className="text-xs text-muted-foreground">by {v.modifiedBy}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ArrowLeftRight className="w-3 h-3" />
              {changedFieldsCount} field changes
            </Badge>
          </div>
          {stepsChanged && (
            <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              Steps modified
            </Badge>
          )}
          {left && right && (
            <div className="ml-auto text-xs text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(left.modifiedAt).toLocaleDateString()} → {new Date(right.modifiedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Comparison Content */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {left && right ? (
            <div className="space-y-6 py-4">
              {/* Field Comparisons */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Properties
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr,auto,1fr] bg-muted/50 text-xs font-medium">
                    <div className="p-2 border-r">{left.version}</div>
                    <div className="p-2 px-4 border-r">Change</div>
                    <div className="p-2">{right.version}</div>
                  </div>
                  {fieldDiffs.map((diff, i) => (
                    <div
                      key={diff.field}
                      className={cn(
                        "grid grid-cols-[1fr,auto,1fr] text-sm border-t",
                        diff.type !== 'unchanged' && "font-medium"
                      )}
                    >
                      <div className={cn("p-2 border-r", getDiffBg(diff.type, 'left'))}>
                        <span className="text-xs text-muted-foreground block mb-0.5">{diff.field}</span>
                        {diff.left || <span className="text-muted-foreground italic">—</span>}
                      </div>
                      <div className="p-2 px-4 border-r flex items-center justify-center">
                        {getDiffIcon(diff.type)}
                      </div>
                      <div className={cn("p-2", getDiffBg(diff.type, 'right'))}>
                        <span className="text-xs text-muted-foreground block mb-0.5">{diff.field}</span>
                        {diff.right || <span className="text-muted-foreground italic">—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps Comparison */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Test Steps</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Steps */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground mb-2">{left.version} ({left.steps.length} steps)</div>
                    {left.steps.map((step, i) => {
                      const rightStep = right.steps[i];
                      const isChanged = !rightStep || 
                        step.action !== rightStep.action || 
                        step.expectedResult !== rightStep.expectedResult;
                      return (
                        <motion.div
                          key={step.stepNumber}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn(
                            "p-3 border rounded-lg text-sm",
                            isChanged && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
                            !rightStep && "bg-red-100 dark:bg-red-950/40"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{step.stepNumber}</Badge>
                            {!rightStep && <Badge variant="destructive" className="text-[10px]">Removed</Badge>}
                          </div>
                          <p className="font-medium">{step.action}</p>
                          <p className="text-muted-foreground text-xs mt-1">Expected: {step.expectedResult}</p>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Right Steps */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground mb-2">{right.version} ({right.steps.length} steps)</div>
                    {right.steps.map((step, i) => {
                      const leftStep = left.steps[i];
                      const isChanged = !leftStep || 
                        step.action !== leftStep.action || 
                        step.expectedResult !== leftStep.expectedResult;
                      return (
                        <motion.div
                          key={step.stepNumber}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn(
                            "p-3 border rounded-lg text-sm",
                            isChanged && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
                            !leftStep && "bg-green-100 dark:bg-green-950/40"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{step.stepNumber}</Badge>
                            {!leftStep && <Badge className="text-[10px] bg-green-600">Added</Badge>}
                          </div>
                          <p className="font-medium">{step.action}</p>
                          <p className="text-muted-foreground text-xs mt-1">Expected: {step.expectedResult}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tags Comparison */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Tags</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-wrap gap-1">
                    {left.tags.map((tag) => {
                      const inRight = right.tags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={cn(
                            "text-xs",
                            !inRight && "bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800 dark:text-red-400"
                          )}
                        >
                          {tag}
                          {!inRight && <Minus className="w-3 h-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {right.tags.map((tag) => {
                      const inLeft = left.tags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={cn(
                            "text-xs",
                            !inLeft && "bg-green-50 dark:bg-green-950/30 border-green-200 text-green-800 dark:text-green-400"
                          )}
                        >
                          {tag}
                          {!inLeft && <Plus className="w-3 h-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Select two versions to compare
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
