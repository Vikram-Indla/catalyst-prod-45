/**
 * Team Tab - Team Performance Report
 * Tester metrics, workload distribution, individual drill-down
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { ChevronDown, ChevronRight, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Mock data
const TEAM_DATA = [
  {
    id: '1',
    name: 'Ahmed Al-Rashid',
    initials: 'AA',
    executed: 78,
    passRate: 82,
    avgTime: '4:15',
    defectsFound: 12,
    trend: [
      { day: 'Mon', count: 12 },
      { day: 'Tue', count: 15 },
      { day: 'Wed', count: 10 },
      { day: 'Thu', count: 18 },
      { day: 'Fri', count: 14 },
    ],
    statusBreakdown: [
      { status: 'Passed', value: 64, color: 'hsl(var(--success))' },
      { status: 'Failed', value: 9, color: 'hsl(var(--danger))' },
      { status: 'Blocked', value: 5, color: 'hsl(var(--warning))' },
    ],
    recentExecutions: [
      { case: 'TC-045', status: 'failed', time: '10 minutes ago' },
      { case: 'TC-032', status: 'passed', time: '2 hours ago' },
      { case: 'TC-018', status: 'passed', time: '3 hours ago' },
    ],
    defectBreakdown: { critical: 8, major: 3, minor: 1 },
    currentAssigned: 15,
    currentCompleted: 11,
  },
  {
    id: '2',
    name: 'Fatima Hassan',
    initials: 'FH',
    executed: 65,
    passRate: 88,
    avgTime: '3:45',
    defectsFound: 8,
    trend: [],
    statusBreakdown: [],
    recentExecutions: [],
    defectBreakdown: { critical: 4, major: 3, minor: 1 },
    currentAssigned: 10,
    currentCompleted: 8,
  },
  {
    id: '3',
    name: 'Mohammed Khan',
    initials: 'MK',
    executed: 52,
    passRate: 79,
    avgTime: '5:20',
    defectsFound: 6,
    trend: [],
    statusBreakdown: [],
    recentExecutions: [],
    defectBreakdown: { critical: 2, major: 2, minor: 2 },
    currentAssigned: 18,
    currentCompleted: 12,
  },
  {
    id: '4',
    name: 'Sara Al-Amiri',
    initials: 'SA',
    executed: 39,
    passRate: 85,
    avgTime: '4:00',
    defectsFound: 5,
    trend: [],
    statusBreakdown: [],
    recentExecutions: [],
    defectBreakdown: { critical: 1, major: 3, minor: 1 },
    currentAssigned: 6,
    currentCompleted: 5,
  },
];

const TEAM_TOTALS = {
  executed: 234,
  passRate: 83,
  avgTime: '4:20',
  defectsFound: 31,
};

const WORKLOAD_DATA = TEAM_DATA.map((member) => ({
  name: member.name.split(' ')[0],
  assigned: member.currentAssigned,
  completed: member.currentCompleted,
  remaining: member.currentAssigned - member.currentCompleted,
}));

function TesterRow({ tester }: { tester: typeof TEAM_DATA[0] }) {
  const [isOpen, setIsOpen] = useState(false);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-danger" />;
      default:
        return <AlertCircle className="h-4 w-4 text-warning" />;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-surface-2">
          <TableCell>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{tester.initials}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{tester.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-right font-medium">{tester.executed}</TableCell>
          <TableCell className="text-right">
            <span className={cn(
              'font-medium',
              tester.passRate >= 80 ? 'text-success' : tester.passRate >= 60 ? 'text-warning' : 'text-danger'
            )}>
              {tester.passRate}%
            </span>
          </TableCell>
          <TableCell className="text-right">{tester.avgTime}</TableCell>
          <TableCell className="text-right">{tester.defectsFound}</TableCell>
        </TableRow>
      </CollapsibleTrigger>
      {tester.trend.length > 0 && (
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={6} className="p-0">
              <div className="bg-surface-2 p-6 border-y border-border-subtle">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{tester.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{tester.name}</h4>
                    <p className="text-sm text-muted-foreground">Last 30 Days Performance</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Execution Trend */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Execution Trend</h5>
                    <div className="h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tester.trend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="day" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Status Breakdown</h5>
                    <div className="h-[150px] flex items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={tester.statusBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {tester.statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1 text-sm">
                        <div>{tester.passRate}% Pass</div>
                        <div>{Math.round((9 / 78) * 100)}% Fail</div>
                        <div>{Math.round((5 / 78) * 100)}% Blocked</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Executions */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Recent Executions</h5>
                    <div className="space-y-2">
                      {tester.recentExecutions.map((exec, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <StatusIcon status={exec.status} />
                          <span className="font-mono">{exec.case}</span>
                          <span className="text-muted-foreground">- {exec.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border-subtle">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Defects Filed:</span>{' '}
                        <span className="font-medium">{tester.defectsFound}</span>{' '}
                        <span className="text-muted-foreground">
                          ({tester.defectBreakdown.critical} Critical, {tester.defectBreakdown.major} Major, {tester.defectBreakdown.minor} Minor)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function TeamTab() {
  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Performance - Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Tester</TableHead>
                <TableHead className="text-right">Executed</TableHead>
                <TableHead className="text-right">Pass Rate</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead className="text-right">Defects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEAM_DATA.map((tester) => (
                <TesterRow key={tester.id} tester={tester} />
              ))}
              {/* Team Total Row */}
              <TableRow className="bg-surface-2 font-semibold">
                <TableCell></TableCell>
                <TableCell>TEAM TOTAL</TableCell>
                <TableCell className="text-right">{TEAM_TOTALS.executed}</TableCell>
                <TableCell className="text-right text-success">{TEAM_TOTALS.passRate}%</TableCell>
                <TableCell className="text-right">{TEAM_TOTALS.avgTime}</TableCell>
                <TableCell className="text-right">{TEAM_TOTALS.defectsFound}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Workload Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WORKLOAD_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Bar dataKey="completed" stackId="a" fill="hsl(var(--success))" name="Completed" radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill="hsl(var(--muted))" name="Remaining" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-success" />
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted" />
              <span className="text-sm">Remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
