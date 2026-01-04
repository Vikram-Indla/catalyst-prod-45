/**
 * Burndown Tab - Test execution burndown chart
 * Shows progress against ideal line with projections
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Mock data
const CYCLES = [
  { id: 'CY-015', name: 'Sprint 24 Regression', period: 'Jan 15 - Jan 22', remaining: 5 },
  { id: 'CY-014', name: 'Sprint 23 Regression', period: 'Jan 1 - Jan 8', remaining: 0 },
  { id: 'CY-013', name: 'Q4 Release', period: 'Dec 15 - Dec 22', remaining: 0 },
];

const BURNDOWN_DATA = [
  { date: 'Jan 15', ideal: 45, actual: 45, remaining: 45 },
  { date: 'Jan 16', ideal: 38, actual: 37, remaining: 37 },
  { date: 'Jan 17', ideal: 31, actual: 31, remaining: 31 },
  { date: 'Jan 18', ideal: 24, actual: 22, remaining: 22 },
  { date: 'Jan 19', ideal: 17, actual: 14, remaining: 14 },
  { date: 'Jan 20', ideal: 10, actual: null, remaining: null },
  { date: 'Jan 21', ideal: 3, actual: null, remaining: null },
  { date: 'Jan 22', ideal: 0, actual: null, remaining: null },
];

const DAILY_BREAKDOWN = [
  { date: 'Jan 15', planned: 7, actual: 8, cumulative: 8, remaining: 37, variance: '+1' },
  { date: 'Jan 16', planned: 7, actual: 6, cumulative: 14, remaining: 31, variance: '-1' },
  { date: 'Jan 17', planned: 7, actual: 9, cumulative: 23, remaining: 22, variance: '+2' },
  { date: 'Jan 18', planned: 7, actual: 8, cumulative: 31, remaining: 14, variance: '+1' },
  { date: 'Jan 19', planned: 7, actual: null, cumulative: null, remaining: null, variance: '-' },
  { date: 'Jan 20', planned: 7, actual: null, cumulative: null, remaining: null, variance: '-' },
  { date: 'Jan 21', planned: 3, actual: null, cumulative: 45, remaining: 0, variance: '-' },
];

const BURNDOWN_STATS = {
  original: 45,
  completed: 31,
  remaining: 14,
  onTrack: true,
  projectedEnd: 'Jan 20',
  currentVelocity: 7.75,
  requiredVelocity: 7,
};

export function BurndownTab() {
  const [selectedCycle, setSelectedCycle] = React.useState('CY-015');
  const currentCycle = CYCLES.find((c) => c.id === selectedCycle) || CYCLES[0];

  return (
    <div className="space-y-6">
      {/* Cycle Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Cycle:</span>
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger className="w-[350px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLES.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.id}: {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Period: {currentCycle.period}
              {currentCycle.remaining > 0 && (
                <Badge variant="outline" className="ml-2">
                  {currentCycle.remaining} days remaining
                </Badge>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Burndown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution Burndown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={BURNDOWN_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 50]} label={{ value: 'Tests Remaining', angle: -90, position: 'insideLeft', className: 'text-xs' }} />
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
                <p className="text-2xl font-bold">{BURNDOWN_STATS.original}</p>
                <p className="text-sm text-muted-foreground">Original</p>
              </div>
              <div className="text-center p-4 bg-surface-2 rounded-lg">
                <p className="text-2xl font-bold text-success">{BURNDOWN_STATS.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-4 bg-surface-2 rounded-lg">
                <p className="text-2xl font-bold text-warning">{BURNDOWN_STATS.remaining}</p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
              <div className="text-center p-4 bg-surface-2 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  {BURNDOWN_STATS.onTrack ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-danger" />
                  )}
                  <span className={cn(
                    'text-lg font-semibold',
                    BURNDOWN_STATS.onTrack ? 'text-success' : 'text-danger'
                  )}>
                    {BURNDOWN_STATS.onTrack ? 'On Track' : 'Behind'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle space-y-3">
              <h4 className="font-medium">Projection</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current velocity:</span>
                <span className="font-medium">{BURNDOWN_STATS.currentVelocity} tests/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Required velocity:</span>
                <span className="font-medium">{BURNDOWN_STATS.requiredVelocity} tests/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Projected finish:</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">
                    {BURNDOWN_STATS.projectedEnd} (ahead)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Breakdown */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DAILY_BREAKDOWN.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right">{day.planned}</TableCell>
                    <TableCell className="text-right">
                      {day.actual ?? <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {day.cumulative ?? <span className="text-muted-foreground">-</span>}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
