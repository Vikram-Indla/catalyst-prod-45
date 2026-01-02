/**
 * TEST REPORTS PAGE
 * Analytics and reporting for test management
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart3,
  TrendingUp,
  PieChart,
  Download,
  Calendar,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectTestSummary, useProjectCycleProgress } from '@/hooks/useProjectTestMetrics';

export function TestsReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  
  const { data: summary, isLoading: summaryLoading } = useProjectTestSummary(projectId || null);
  const { data: cycleProgress, isLoading: cyclesLoading } = useProjectCycleProgress(projectId || '');

  // Calculate summary stats
  const passedCount = summary?.passRate ? Math.round((summary.totalCases * summary.passRate) / 100) : 0;
  const failedCount = summary?.failed || 0;
  const blockedCount = summary?.blocked || 0;
  const notRunCount = summary?.notRun || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Test Reports</h2>
          <p className="text-sm text-text-tertiary">Analyze test execution trends and quality metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Execution Summary */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
              <PieChart className="h-4 w-4 text-accent-primary" />
              Execution Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border-default">
                  <span className="text-text-secondary">Total Test Cases</span>
                  <span className="text-lg font-semibold text-text-primary">{summary?.totalCases || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-2 text-status-success">
                    <div className="w-3 h-3 rounded-full bg-status-success" />
                    Passed
                  </span>
                  <span className="font-medium">{passedCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-2 text-status-error">
                    <div className="w-3 h-3 rounded-full bg-status-error" />
                    Failed
                  </span>
                  <span className="font-medium">{failedCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-2 text-status-warning">
                    <div className="w-3 h-3 rounded-full bg-status-warning" />
                    Blocked
                  </span>
                  <span className="font-medium">{blockedCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-2 text-text-tertiary">
                    <div className="w-3 h-3 rounded-full bg-surface-3" />
                    Not Run
                  </span>
                  <span className="font-medium">{notRunCount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pass Rate Trend */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-status-success" />
              Pass Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="text-4xl font-bold text-text-primary mb-2">
                  {summary?.passRate || 0}%
                </div>
                <p className="text-sm text-text-tertiary">Current Pass Rate</p>
                <div className="mt-4 text-center">
                  <p className="text-xs text-status-success">+2.3% from last cycle</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cycle Summary */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent-primary" />
              Cycle Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cyclesLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border-default">
                  <span className="text-text-secondary">Active Cycles</span>
                  <span className="text-lg font-semibold text-text-primary">{cycleProgress?.length || 0}</span>
                </div>
                {cycleProgress?.slice(0, 3).map(cycle => (
                  <div key={cycle.id} className="flex justify-between items-center py-1">
                    <span className="text-sm text-text-secondary truncate max-w-[150px]">{cycle.name}</span>
                    <span className="text-sm font-medium text-text-primary">{cycle.progress}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-text-primary">Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Test Execution Report', desc: 'Detailed execution results by cycle' },
              { name: 'Coverage Report', desc: 'Test coverage across features and requirements' },
              { name: 'Defect Correlation', desc: 'Link test failures to defects' },
              { name: 'Trend Analysis', desc: 'Historical pass rate trends' },
              { name: 'Flaky Tests', desc: 'Identify unstable test cases' },
              { name: 'Cycle Comparison', desc: 'Compare results across cycles' },
            ].map((report, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-surface-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-accent-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-text-primary">{report.name}</h4>
                    <p className="text-xs text-text-tertiary mt-0.5">{report.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
