/**
 * Run Distribution Report - Prompt 3.21
 * Purpose: Analyze execution runs distribution and patterns
 * Sections: Run Overview, Runs by Cycle, Run Status, Performance Table, Duration Histogram, Pass Rate, Tester Participation
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Calendar, Users, Clock, Download, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

interface RunOverview {
  totalRuns: number;
  totalExecutions: number;
  avgPerRun: number;
  activeRuns: number;
}

interface RunByCycle {
  cycle: string;
  runCount: number;
}

interface RunStatusDist {
  status: string;
  count: number;
  color: string;
}

interface RunPerformance {
  runId: string;
  cycle: string;
  start: string;
  end: string;
  duration: string;
  cases: number;
  passRate: number;
  testers: number;
  status: 'completed' | 'in_progress' | 'aborted';
}

interface DurationBucket {
  range: string;
  count: number;
}

interface PassRateByRun {
  run: string;
  passRate: number;
}

interface TesterParticipation {
  tester: string;
  runsParticipated: number;
  executions: number;
  avgPerRun: number;
  passRate: number;
}

interface RunDistributionReportProps {
  data?: {
    overview: RunOverview;
    byCycle: RunByCycle[];
    statusDist: RunStatusDist[];
    performance: RunPerformance[];
    durationDist: DurationBucket[];
    passRateByRun: PassRateByRun[];
    testerParticipation: TesterParticipation[];
  };
  isLoading?: boolean;
}

// Mock data per specification
const mockData = {
  overview: {
    totalRuns: 45,
    totalExecutions: 2340,
    avgPerRun: 52,
    activeRuns: 3,
  },
  byCycle: [
    { cycle: 'CYC-001', runCount: 8 },
    { cycle: 'CYC-002', runCount: 12 },
    { cycle: 'CYC-003', runCount: 6 },
    { cycle: 'CYC-004', runCount: 10 },
    { cycle: 'CYC-005', runCount: 9 },
  ],
  statusDist: [
    { status: 'Completed', count: 38, color: '#10b981' },
    { status: 'In Progress', count: 4, color: '#f59e0b' },
    { status: 'Aborted', count: 3, color: '#ef4444' },
  ],
  performance: [
    { runId: 'RUN-045', cycle: 'CYC-005', start: '2024-05-10', end: '2024-05-12', duration: '2 days', cases: 65, passRate: 89, testers: 4, status: 'completed' as const },
    { runId: 'RUN-044', cycle: 'CYC-005', start: '2024-05-08', end: '2024-05-09', duration: '1 day', cases: 42, passRate: 92, testers: 3, status: 'completed' as const },
    { runId: 'RUN-043', cycle: 'CYC-004', start: '2024-05-05', end: '-', duration: 'In Progress', cases: 58, passRate: 78, testers: 5, status: 'in_progress' as const },
    { runId: 'RUN-042', cycle: 'CYC-004', start: '2024-05-02', end: '2024-05-04', duration: '2 days', cases: 48, passRate: 85, testers: 3, status: 'completed' as const },
  ],
  durationDist: [
    { range: '0-1 day', count: 12 },
    { range: '1-3 days', count: 18 },
    { range: '3-7 days', count: 10 },
    { range: '7+ days', count: 5 },
  ],
  passRateByRun: [
    { run: 'RUN-040', passRate: 82 },
    { run: 'RUN-041', passRate: 78 },
    { run: 'RUN-042', passRate: 85 },
    { run: 'RUN-043', passRate: 78 },
    { run: 'RUN-044', passRate: 92 },
    { run: 'RUN-045', passRate: 89 },
  ],
  testerParticipation: [
    { tester: 'John Doe', runsParticipated: 28, executions: 420, avgPerRun: 15, passRate: 88 },
    { tester: 'Jane Smith', runsParticipated: 32, executions: 510, avgPerRun: 16, passRate: 91 },
    { tester: 'Mike Johnson', runsParticipated: 22, executions: 340, avgPerRun: 15.5, passRate: 85 },
    { tester: 'Sarah Wilson', runsParticipated: 18, executions: 280, avgPerRun: 15.5, passRate: 87 },
  ],
};

export const RunDistributionReport: React.FC<RunDistributionReportProps> = ({
  data = mockData,
  isLoading = false,
}) => {
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const { overview, byCycle, statusDist, performance, durationDist, passRateByRun, testerParticipation } = data;
  const targetPassRate = 85;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-yellow-500 text-white">In Progress</Badge>;
      case 'aborted': return <Badge className="bg-red-500 text-white">Aborted</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Overview Cards - per spec */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Play className="h-4 w-4" />
              Total Runs
            </div>
            <div className="text-2xl font-bold text-brand-gold">{overview.totalRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              Total Executions
            </div>
            <div className="text-2xl font-bold">{overview.totalExecutions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-sm">Avg per Run</div>
            <div className="text-2xl font-bold">{overview.avgPerRun}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Active Runs
            </div>
            <div className="text-2xl font-bold text-green-500">{overview.activeRuns}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Runs by Cycle Bar Chart - per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Runs by Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byCycle}>
                <XAxis dataKey="cycle" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="runCount" fill="#c69c6d" name="Runs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Run Status Distribution Pie - per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Run Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDist.map(s => ({ name: s.status, value: s.count, fill: s.color }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={statusDist[index].color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Run Performance Table - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Run ID</th>
                  <th className="text-left p-2">Cycle</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-right p-2">Cases</th>
                  <th className="text-right p-2">Pass Rate %</th>
                  <th className="text-right p-2">Testers</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((run) => (
                  <tr key={run.runId} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono text-brand-gold">{run.runId}</td>
                    <td className="p-2">{run.cycle}</td>
                    <td className="p-2 text-muted-foreground">{run.start}</td>
                    <td className="p-2 text-muted-foreground">{run.end}</td>
                    <td className="p-2">{run.duration}</td>
                    <td className="p-2 text-right">{run.cases}</td>
                    <td className="p-2 text-right">
                      <span className={run.passRate >= 85 ? 'text-green-500' : run.passRate >= 70 ? 'text-yellow-500' : 'text-red-500'}>
                        {run.passRate}%
                      </span>
                    </td>
                    <td className="p-2 text-right">{run.testers}</td>
                    <td className="p-2">{getStatusBadge(run.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Run Duration Distribution Histogram - per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Run Duration Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={durationDist}>
                <XAxis dataKey="range" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Runs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pass Rate by Run Line Chart - per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pass Rate by Run (Chronological)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={passRateByRun}>
                <XAxis dataKey="run" fontSize={12} />
                <YAxis fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="passRate" stroke="#c69c6d" strokeWidth={2} dot={{ fill: '#c69c6d' }} name="Pass Rate %" />
                {/* Target line at 85% */}
                <Line type="monotone" dataKey={() => targetPassRate} stroke="#ef4444" strokeDasharray="5 5" name="Target" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-brand-gold rounded"></span> Pass Rate</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #ef4444' }}></span> Target (85%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tester Participation Table - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tester Participation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tester</th>
                  <th className="text-right p-2">Runs Participated</th>
                  <th className="text-right p-2">Executions</th>
                  <th className="text-right p-2">Avg per Run</th>
                  <th className="text-right p-2">Pass Rate %</th>
                </tr>
              </thead>
              <tbody>
                {testerParticipation.map((tester) => (
                  <tr key={tester.tester} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{tester.tester}</td>
                    <td className="p-2 text-right">{tester.runsParticipated}</td>
                    <td className="p-2 text-right">{tester.executions}</td>
                    <td className="p-2 text-right">{tester.avgPerRun}</td>
                    <td className="p-2 text-right">
                      <span className={tester.passRate >= 85 ? 'text-green-500' : 'text-yellow-500'}>
                        {tester.passRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons - per spec */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>
    </div>
  );
};
