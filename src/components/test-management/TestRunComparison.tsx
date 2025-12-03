/**
 * Test Run Comparison - Compare results between test runs
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface RunSummary {
  id: string;
  name: string;
  date: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  passRate: number;
}

interface TestCaseComparison {
  testCaseId: string;
  testCaseKey: string;
  testCaseTitle: string;
  run1Status: string;
  run2Status: string;
  changed: boolean;
  improvement: boolean | null;
}

interface TestRunComparisonProps {
  availableRuns: RunSummary[];
  onCompare: (run1Id: string, run2Id: string) => Promise<TestCaseComparison[]>;
}

const STATUS_COLORS: Record<string, string> = {
  passed: 'bg-green-500/10 text-green-500 border-green-500/30',
  failed: 'bg-red-500/10 text-red-500 border-red-500/30',
  blocked: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  skipped: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  not_executed: 'bg-muted text-muted-foreground border-border',
};

export const TestRunComparison: React.FC<TestRunComparisonProps> = ({
  availableRuns,
  onCompare,
}) => {
  const [run1Id, setRun1Id] = useState<string>('');
  const [run2Id, setRun2Id] = useState<string>('');
  const [comparisons, setComparisons] = useState<TestCaseComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const run1 = availableRuns.find((r) => r.id === run1Id);
  const run2 = availableRuns.find((r) => r.id === run2Id);

  const handleCompare = async () => {
    if (!run1Id || !run2Id) return;
    setIsLoading(true);
    try {
      const results = await onCompare(run1Id, run2Id);
      setComparisons(results);
    } finally {
      setIsLoading(false);
    }
  };

  const changedTests = comparisons.filter((c) => c.changed);
  const improvements = changedTests.filter((c) => c.improvement === true);
  const regressions = changedTests.filter((c) => c.improvement === false);

  const passRateDiff = run1 && run2 ? run2.passRate - run1.passRate : 0;

  return (
    <div className="space-y-6">
      {/* Run Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-brand-gold" />
            Compare Test Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:flex-1">
              <label className="text-sm font-medium mb-2 block">Baseline Run</label>
              <Select value={run1Id} onValueChange={setRun1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select baseline run" />
                </SelectTrigger>
                <SelectContent>
                  {availableRuns.map((run) => (
                    <SelectItem key={run.id} value={run.id} disabled={run.id === run2Id}>
                      {run.name} ({new Date(run.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block" />

            <div className="w-full sm:flex-1">
              <label className="text-sm font-medium mb-2 block">Compare To</label>
              <Select value={run2Id} onValueChange={setRun2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select run to compare" />
                </SelectTrigger>
                <SelectContent>
                  {availableRuns.map((run) => (
                    <SelectItem key={run.id} value={run.id} disabled={run.id === run1Id}>
                      {run.name} ({new Date(run.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={handleCompare}
              disabled={!run1Id || !run2Id || isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Summary */}
      {run1 && run2 && comparisons.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {passRateDiff > 0 ? '+' : ''}{passRateDiff.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Pass Rate Change</p>
                  </div>
                  {passRateDiff > 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  ) : passRateDiff < 0 ? (
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  ) : (
                    <Minus className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-500">{improvements.length}</p>
                    <p className="text-sm text-muted-foreground">Improvements</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-red-500">{regressions.length}</p>
                    <p className="text-sm text-muted-foreground">Regressions</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side by Side Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{run1.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pass Rate</span>
                    <span className="font-medium">{run1.passRate}%</span>
                  </div>
                  <Progress value={run1.passRate} className="h-2" />
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-500">{run1.passed} passed</span>
                    <span className="text-red-500">{run1.failed} failed</span>
                    <span className="text-amber-500">{run1.blocked} blocked</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{run2.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pass Rate</span>
                    <span className="font-medium">{run2.passRate}%</span>
                  </div>
                  <Progress value={run2.passRate} className="h-2" />
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-500">{run2.passed} passed</span>
                    <span className="text-red-500">{run2.failed} failed</span>
                    <span className="text-amber-500">{run2.blocked} blocked</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Changed Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Changed Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {changedTests.map((comparison) => (
                    <div
                      key={comparison.testCaseId}
                      className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-brand-gold">
                            {comparison.testCaseKey}
                          </span>
                          {comparison.improvement === true && (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          )}
                          {comparison.improvement === false && (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {comparison.testCaseTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_COLORS[comparison.run1Status]}>
                          {comparison.run1Status.replace('_', ' ')}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className={STATUS_COLORS[comparison.run2Status]}>
                          {comparison.run2Status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {changedTests.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No changes between runs</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {comparisons.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select two runs to compare</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
