/**
 * Cycle Reports Tab Component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { CycleStatistics } from '../../api/types';

interface TesterWorkload {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  assigned: number;
  completed: number;
  passed: number;
  failed: number;
}

interface CycleReportsTabProps {
  statistics: CycleStatistics;
  testerWorkload?: TesterWorkload[];
  progressData?: Array<{
    date: string;
    passed: number;
    failed: number;
    total: number;
  }>;
}

const PIE_COLORS = {
  passed: 'hsl(var(--success))',
  failed: 'hsl(var(--danger))',
  blocked: 'hsl(var(--warning))',
  not_run: 'hsl(var(--muted))',
};

export function CycleReportsTab({
  statistics,
  testerWorkload = [],
  progressData = [],
}: CycleReportsTabProps) {
  const totalExecuted = statistics.total_cases - statistics.not_run_count;
  const passRate = totalExecuted > 0 
    ? Math.round((statistics.passed_count / totalExecuted) * 100) 
    : 0;

  const pieData = [
    { name: 'Passed', value: statistics.passed_count, fill: PIE_COLORS.passed },
    { name: 'Failed', value: statistics.failed_count, fill: PIE_COLORS.failed },
    { name: 'Blocked', value: statistics.blocked_count, fill: PIE_COLORS.blocked },
    { name: 'Not Run', value: statistics.not_run_count, fill: PIE_COLORS.not_run },
  ].filter(d => d.value > 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 80) return 'text-success';
    if (rate >= 60) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="space-y-6">
      {/* Top Row - Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="passed" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    dot={false}
                    name="Passed"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="hsl(var(--danger))" 
                    strokeWidth={2}
                    dot={false}
                    name="Failed"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Total"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <p>Execute tests to see progress over time</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pass Rate Gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pass Rate Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="text-center">
                  <div className={cn('text-4xl font-bold', getPassRateColor(passRate))}>
                    {passRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Pass Rate</div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.fill }} 
                      />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tester Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tester Workload</CardTitle>
        </CardHeader>
        <CardContent>
          {testerWorkload.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tester</TableHead>
                  <TableHead className="w-24 text-center">Assigned</TableHead>
                  <TableHead className="w-24 text-center">Completed</TableHead>
                  <TableHead className="w-48">Progress</TableHead>
                  <TableHead className="w-24 text-center">Pass Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testerWorkload.map((tester) => {
                  const completionRate = tester.assigned > 0
                    ? Math.round((tester.completed / tester.assigned) * 100)
                    : 0;
                  const testerPassRate = tester.completed > 0
                    ? Math.round((tester.passed / tester.completed) * 100)
                    : 0;

                  return (
                    <TableRow key={tester.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={tester.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(tester.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{tester.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{tester.assigned}</TableCell>
                      <TableCell className="text-center">{tester.completed}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={completionRate} className="h-2" />
                          <span className="text-sm w-12 text-right">{completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn('font-medium', getPassRateColor(testerPassRate))}>
                          {testerPassRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Assign testers to see workload distribution</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
