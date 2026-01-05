/**
 * Burndown Tab - Test execution burndown chart
 * Shows progress against ideal line with projections
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface BurndownTabProps {
  burndown?: {
    cycle: any;
    totalCases: number;
    completedCount: number;
    remainingCount: number;
    passedCount: number;
    failedCount: number;
    blockedCount: number;
    burndownData: Array<{ date: string; ideal: number; actual: number }>;
    velocity: number;
    daysToComplete: number | null;
    isOnTrack: boolean | null;
  };
  isLoading: boolean;
  cycles: Array<{ id: string; name: string }>;
  selectedCycleId: string | null;
  onCycleChange: (cycleId: string | null) => void;
}

export function BurndownTab({ burndown, isLoading, cycles, selectedCycleId, onCycleChange }: BurndownTabProps) {
  const chartData = burndown?.burndownData || [];
  const totalCases = burndown?.totalCases || 0;
  const completedCount = burndown?.completedCount || 0;
  const remainingCount = burndown?.remainingCount || 0;
  const velocity = burndown?.velocity || 0;
  const daysToComplete = burndown?.daysToComplete;
  const isOnTrack = burndown?.isOnTrack;

  // Generate daily breakdown from burndown data
  const dailyBreakdown = chartData.map((day, index) => {
    const prev = index > 0 ? chartData[index - 1] : null;
    const dailyCompleted = prev ? (prev.actual || 0) - (day.actual || 0) : 0;
    const variance = day.actual !== null ? (day.ideal - day.actual) : null;
    return {
      date: day.date,
      planned: Math.round(chartData[0]?.ideal / chartData.length) || 0,
      actual: dailyCompleted > 0 ? dailyCompleted : null,
      remaining: day.actual,
      variance: variance !== null ? (variance >= 0 ? `+${Math.round(variance)}` : `${Math.round(variance)}`) : '-',
    };
  });

  return (
    <div className="space-y-6">
      {/* Cycle Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Cycle:</span>
            <Select 
              value={selectedCycleId || ''} 
              onValueChange={(v) => onCycleChange(v || null)}
            >
              <SelectTrigger className="w-[350px]">
                <SelectValue placeholder="Select a cycle to view burndown" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {burndown?.cycle && (
              <span className="text-sm text-muted-foreground">
                {burndown.cycle.planned_start && burndown.cycle.planned_end && (
                  <>Period: {format(new Date(burndown.cycle.planned_start), 'MMM d')} - {format(new Date(burndown.cycle.planned_end), 'MMM d, yyyy')}</>
                )}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedCycleId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Select a cycle to view burndown chart
          </CardContent>
        </Card>
      ) : isLoading ? (
        <>
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px] col-span-2" />
          </div>
        </>
      ) : !burndown ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No burndown data available for this cycle
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Burndown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Execution Burndown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis 
                      className="text-xs" 
                      domain={[0, Math.max(totalCases, 10)]} 
                      label={{ value: 'Tests Remaining', angle: -90, position: 'insideLeft', className: 'text-xs' }} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ideal"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Ideal"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      name="Actual"
                      connectNulls
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--muted))" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stats and Daily Breakdown */}
          <div className="grid grid-cols-3 gap-6">
            {/* Burndown Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-surface-2 rounded-lg">
                    <p className="text-2xl font-bold">{totalCases}</p>
                    <p className="text-sm text-muted-foreground">Original</p>
                  </div>
                  <div className="text-center p-4 bg-surface-2 rounded-lg">
                    <p className="text-2xl font-bold text-success">{completedCount}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-4 bg-surface-2 rounded-lg">
                    <p className="text-2xl font-bold text-warning">{remainingCount}</p>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                  </div>
                  <div className="text-center p-4 bg-surface-2 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      {isOnTrack === true ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : isOnTrack === false ? (
                        <AlertCircle className="h-5 w-5 text-danger" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className={cn(
                        'text-lg font-semibold',
                        isOnTrack === true ? 'text-success' : isOnTrack === false ? 'text-danger' : 'text-muted-foreground'
                      )}>
                        {isOnTrack === true ? 'On Track' : isOnTrack === false ? 'Behind' : 'N/A'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Status</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-subtle space-y-3">
                  <h4 className="font-medium">Projection</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current velocity:</span>
                    <span className="font-medium">{velocity} tests/day</span>
                  </div>
                  {daysToComplete !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Days to complete:</span>
                      <div className="flex items-center gap-1">
                        {isOnTrack ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-danger" />
                        )}
                        <span className={cn('font-medium', isOnTrack ? 'text-success' : 'text-danger')}>
                          {daysToComplete} days
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Breakdown */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Daily Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyBreakdown.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No daily data available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Ideal</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyBreakdown.slice(0, 10).map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{day.date}</TableCell>
                          <TableCell className="text-right">{day.planned}</TableCell>
                          <TableCell className="text-right">
                            {day.actual ?? <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {day.remaining ?? <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              day.variance !== '-' && day.variance.startsWith('+')
                                ? 'text-success'
                                : day.variance !== '-' && day.variance.startsWith('-')
                                ? 'text-danger'
                                : 'text-muted-foreground'
                            )}>
                              {day.variance}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
