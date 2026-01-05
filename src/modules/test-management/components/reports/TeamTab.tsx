/**
 * Team Tab - Team Performance Report
 * Tester metrics, workload distribution
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TesterPerformance } from '@/types/test-management';

interface TeamTabProps {
  teamPerformance: TesterPerformance[];
  isLoading: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TeamTab({ teamPerformance, isLoading }: TeamTabProps) {
  // Calculate team totals
  const teamTotals = teamPerformance.reduce(
    (acc, t) => ({
      executed: acc.executed + t.executed,
      passed: acc.passed + t.passed,
      failed: acc.failed + t.failed,
      defects: acc.defects + t.defects_filed,
    }),
    { executed: 0, passed: 0, failed: 0, defects: 0 }
  );

  const teamPassRate = teamTotals.executed > 0 
    ? Math.round((teamTotals.passed / teamTotals.executed) * 100) 
    : 0;

  const avgTime = teamPerformance.length > 0
    ? Math.round(teamPerformance.reduce((sum, t) => sum + t.avg_duration, 0) / teamPerformance.length)
    : 0;

  // Workload chart data
  const workloadData = teamPerformance.slice(0, 8).map((member) => ({
    name: member.user_name.split(' ')[0],
    executed: member.executed,
    passed: member.passed,
    failed: member.failed,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {teamPerformance.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No team performance data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tester</TableHead>
                  <TableHead className="text-right">Executed</TableHead>
                  <TableHead className="text-right">Passed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">Defects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerformance.map((tester) => (
                  <TableRow key={tester.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {tester.avatar_url && <AvatarImage src={tester.avatar_url} />}
                          <AvatarFallback className="text-xs">
                            {getInitials(tester.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{tester.user_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{tester.executed}</TableCell>
                    <TableCell className="text-right text-success">{tester.passed}</TableCell>
                    <TableCell className="text-right text-danger">{tester.failed}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'font-medium',
                        tester.pass_rate >= 80 ? 'text-success' : tester.pass_rate >= 60 ? 'text-warning' : 'text-danger'
                      )}>
                        {tester.pass_rate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatDuration(tester.avg_duration)}</TableCell>
                    <TableCell className="text-right">{tester.defects_filed}</TableCell>
                  </TableRow>
                ))}
                {/* Team Total Row */}
                <TableRow className="bg-surface-2 font-semibold">
                  <TableCell>TEAM TOTAL</TableCell>
                  <TableCell className="text-right">{teamTotals.executed}</TableCell>
                  <TableCell className="text-right text-success">{teamTotals.passed}</TableCell>
                  <TableCell className="text-right text-danger">{teamTotals.failed}</TableCell>
                  <TableCell className="text-right text-success">{teamPassRate}%</TableCell>
                  <TableCell className="text-right">{formatDuration(avgTime)}</TableCell>
                  <TableCell className="text-right">{teamTotals.defects}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Execution Distribution */}
      {teamPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="passed" stackId="a" fill="hsl(var(--success))" name="Passed" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--danger))" name="Failed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success" />
                <span className="text-sm">Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-danger" />
                <span className="text-sm">Failed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
