/**
 * Tester Productivity Report - Shows metrics per tester
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

interface TesterMetric {
  id: string;
  name: string;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  avgExecutionTime: number;
  passRate: number;
}

interface TesterProductivityReportProps {
  testers: TesterMetric[];
  dateRange?: { from: Date; to: Date };
}

export const TesterProductivityReport: React.FC<TesterProductivityReportProps> = ({
  testers,
  dateRange,
}) => {
  const chartData = testers.map(t => ({
    name: t.name.split(' ')[0],
    executed: t.executedCount,
    passed: t.passedCount,
    failed: t.failedCount,
  }));

  const topPerformer = testers.reduce((a, b) => a.passRate > b.passRate ? a : b, testers[0]);
  const totalExecutions = testers.reduce((sum, t) => sum + t.executedCount, 0);
  const avgPassRate = testers.length > 0
    ? Math.round(testers.reduce((sum, t) => sum + t.passRate, 0) / testers.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-brand-gold" />
              <div>
                <p className="text-2xl font-bold">{testers.length}</p>
                <p className="text-sm text-muted-foreground">Active Testers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalExecutions}</p>
                <p className="text-sm text-muted-foreground">Total Executions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{avgPassRate}%</p>
                <p className="text-sm text-muted-foreground">Avg Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">
                  {testers.length > 0 
                    ? Math.round(testers.reduce((sum, t) => sum + t.avgExecutionTime, 0) / testers.length)
                    : 0}s
                </p>
                <p className="text-sm text-muted-foreground">Avg Exec Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Executions by Tester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="passed" fill="#10b981" name="Passed" stackId="stack" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tester List */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testers.map((tester) => (
              <div
                key={tester.id}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-brand-gold/20 text-brand-gold">
                    {tester.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tester.name}</span>
                    {tester.id === topPerformer?.id && (
                      <Badge className="bg-brand-gold text-brand-dark">Top Performer</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{tester.executedCount} executed</span>
                    <span className="text-green-500">{tester.passedCount} passed</span>
                    <span className="text-red-500">{tester.failedCount} failed</span>
                  </div>
                </div>
                <div className="w-32">
                  <div className="text-right text-sm mb-1">{tester.passRate}%</div>
                  <Progress value={tester.passRate} className="h-2" />
                </div>
              </div>
            ))}

            {testers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tester data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
