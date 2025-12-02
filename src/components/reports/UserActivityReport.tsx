/**
 * User Activity Report - Prompt 3.21
 * Purpose: Individual user's testing activity and performance
 * Sections: User Overview, Activity Metrics, Execution Performance, Cases Created, Defects, Comparison
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, FileText, Play, Bug, Clock, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface UserOverview {
  name: string;
  avatar?: string;
  role: string;
  memberSince: string;
  totalContributions: number;
}

interface ActivityMetrics {
  casesCreated: number;
  casesExecuted: number;
  defectsFound: number;
  effortHours: number;
}

interface ExecutionPerformance {
  executions: number;
  passRate: number;
  avgTime: number;
  efficiency: number;
}

interface CaseCreated {
  key: string;
  title: string;
  createdDate: string;
  priority: string;
  timesExecuted: number;
  status: string;
}

interface RecentExecution {
  date: string;
  caseKey: string;
  cycle: string;
  status: 'passed' | 'failed' | 'blocked' | 'skipped';
  effort: string;
  hasEvidence: boolean;
  defects: number;
}

interface DefectDiscovered {
  key: string;
  title: string;
  priority: string;
  status: string;
  foundInCase: string;
  foundDate: string;
  daysToResolve: number | null;
}

interface TeamComparison {
  metric: string;
  user: number;
  teamAvg: number;
}

interface UserActivityReportProps {
  userId?: string;
  data?: {
    overview: UserOverview;
    metrics: ActivityMetrics;
    performance: ExecutionPerformance;
    casesCreated: CaseCreated[];
    recentExecutions: RecentExecution[];
    defectsDiscovered: DefectDiscovered[];
    dailyActivity: { date: string; count: number }[];
    effortTrend: { week: string; hours: number }[];
    comparison: TeamComparison[];
  };
  isLoading?: boolean;
}

// Mock data per specification
const mockData = {
  overview: {
    name: 'John Doe',
    role: 'Senior QA Engineer',
    memberSince: 'Jan 2023',
    totalContributions: 1250,
  },
  metrics: {
    casesCreated: 24,
    casesExecuted: 156,
    defectsFound: 12,
    effortHours: 89.5,
  },
  performance: {
    executions: 156,
    passRate: 87.2,
    avgTime: 34,
    efficiency: 92,
  },
  casesCreated: [
    { key: 'TC-045', title: 'Login Authentication Test', createdDate: '2024-05-10', priority: 'High', timesExecuted: 12, status: 'Approved' },
    { key: 'TC-046', title: 'Password Reset Flow', createdDate: '2024-05-08', priority: 'Medium', timesExecuted: 8, status: 'Approved' },
    { key: 'TC-047', title: 'User Registration', createdDate: '2024-05-05', priority: 'High', timesExecuted: 15, status: 'Approved' },
  ],
  recentExecutions: [
    { date: '2024-05-15', caseKey: 'TC-012', cycle: 'CYC-008', status: 'passed' as const, effort: '25 min', hasEvidence: true, defects: 0 },
    { date: '2024-05-15', caseKey: 'TC-023', cycle: 'CYC-008', status: 'failed' as const, effort: '45 min', hasEvidence: true, defects: 1 },
    { date: '2024-05-14', caseKey: 'TC-034', cycle: 'CYC-008', status: 'passed' as const, effort: '20 min', hasEvidence: false, defects: 0 },
    { date: '2024-05-14', caseKey: 'TC-045', cycle: 'CYC-007', status: 'blocked' as const, effort: '15 min', hasEvidence: true, defects: 0 },
  ],
  defectsDiscovered: [
    { key: 'DEF-234', title: 'Payment button not responding', priority: 'Critical', status: 'Open', foundInCase: 'TC-023', foundDate: '2024-05-15', daysToResolve: null },
    { key: 'DEF-220', title: 'Form validation error', priority: 'High', status: 'Resolved', foundInCase: 'TC-018', foundDate: '2024-05-10', daysToResolve: 3 },
    { key: 'DEF-198', title: 'UI alignment issue', priority: 'Low', status: 'Closed', foundInCase: 'TC-012', foundDate: '2024-05-05', daysToResolve: 1 },
  ],
  dailyActivity: [
    { date: 'May 1', count: 8 },
    { date: 'May 2', count: 12 },
    { date: 'May 3', count: 6 },
    { date: 'May 4', count: 15 },
    { date: 'May 5', count: 10 },
    { date: 'May 6', count: 18 },
    { date: 'May 7', count: 14 },
  ],
  effortTrend: [
    { week: 'W1', hours: 18 },
    { week: 'W2', hours: 22 },
    { week: 'W3', hours: 20 },
    { week: 'W4', hours: 29.5 },
  ],
  comparison: [
    { metric: 'Pass Rate', user: 87.2, teamAvg: 85.1 },
    { metric: 'Avg Time', user: 34, teamAvg: 38 },
    { metric: 'Defects Found', user: 7.7, teamAvg: 6.5 },
    { metric: 'Efficiency', user: 92, teamAvg: 88 },
    { metric: 'Cases/Week', user: 24, teamAvg: 20 },
  ],
};

export const UserActivityReport: React.FC<UserActivityReportProps> = ({
  userId,
  data = mockData,
  isLoading = false,
}) => {
  const [timePeriod, setTimePeriod] = React.useState('30');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const { overview, metrics, performance, casesCreated, recentExecutions, defectsDiscovered, dailyActivity, effortTrend, comparison } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'blocked': return 'bg-orange-500';
      case 'skipped': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  // Transform comparison data for radar chart
  const radarData = comparison.map(c => ({
    metric: c.metric,
    User: c.user,
    'Team Avg': c.teamAvg,
  }));

  return (
    <div className="space-y-6">
      {/* User Overview Card - per spec */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-2xl font-bold">
              {overview.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{overview.name}</h2>
              <p className="text-muted-foreground">{overview.role}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>Member since {overview.memberSince}</span>
                <span>•</span>
                <span>{overview.totalContributions.toLocaleString()} total contributions</span>
              </div>
            </div>
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Metrics Cards (4) - per spec */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileText className="h-4 w-4" />
              Cases Created
            </div>
            <div className="text-2xl font-bold text-brand-gold">{metrics.casesCreated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Play className="h-4 w-4" />
              Cases Executed
            </div>
            <div className="text-2xl font-bold text-brand-gold">{metrics.casesExecuted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Bug className="h-4 w-4" />
              Defects Found
            </div>
            <div className="text-2xl font-bold text-brand-gold">{metrics.defectsFound}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Effort Hours
            </div>
            <div className="text-2xl font-bold text-brand-gold">{metrics.effortHours}</div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Performance Metrics - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Executions</div>
              <div className="text-2xl font-bold">{performance.executions}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Pass Rate</div>
              <div className="text-2xl font-bold text-green-500">{performance.passRate}%</div>
              <Progress value={performance.passRate} className="mt-2 h-2" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Time</div>
              <div className="text-2xl font-bold">{performance.avgTime} min</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Efficiency Score</div>
              <div className="text-2xl font-bold text-brand-gold">{performance.efficiency}/100</div>
              <Progress value={performance.efficiency} className="mt-2 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Line Chart - per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyActivity}>
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#c69c6d" strokeWidth={2} dot={{ fill: '#c69c6d' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Performance Comparison Radar - per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance vs Team Average</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" fontSize={10} />
                <PolarRadiusAxis fontSize={10} />
                <Radar name="User" dataKey="User" stroke="#c69c6d" fill="#c69c6d" fillOpacity={0.5} />
                <Radar name="Team Avg" dataKey="Team Avg" stroke="#6b7280" fill="#6b7280" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cases Created by User Table - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cases Created</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Priority</th>
                  <th className="text-right p-2">Times Executed</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {casesCreated.map((tc) => (
                  <tr key={tc.key} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono text-brand-gold">{tc.key}</td>
                    <td className="p-2">{tc.title}</td>
                    <td className="p-2 text-muted-foreground">{tc.createdDate}</td>
                    <td className={`p-2 font-medium ${getPriorityColor(tc.priority)}`}>{tc.priority}</td>
                    <td className="p-2 text-right">{tc.timesExecuted}</td>
                    <td className="p-2">
                      <Badge variant="outline">{tc.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Executions Table - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Executions (Last 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Case</th>
                  <th className="text-left p-2">Cycle</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Effort</th>
                  <th className="text-center p-2">Evidence</th>
                  <th className="text-right p-2">Defects</th>
                </tr>
              </thead>
              <tbody>
                {recentExecutions.map((exec, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-muted-foreground">{exec.date}</td>
                    <td className="p-2 font-mono text-brand-gold">{exec.caseKey}</td>
                    <td className="p-2">{exec.cycle}</td>
                    <td className="p-2">
                      <Badge className={`${getStatusColor(exec.status)} text-white`}>{exec.status}</Badge>
                    </td>
                    <td className="p-2">{exec.effort}</td>
                    <td className="p-2 text-center">{exec.hasEvidence ? '✓' : '-'}</td>
                    <td className="p-2 text-right">{exec.defects > 0 ? <span className="text-red-500">{exec.defects}</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Defects Discovered Table - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Defects Discovered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Priority</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Found In</th>
                  <th className="text-left p-2">Found Date</th>
                  <th className="text-right p-2">Days to Resolve</th>
                </tr>
              </thead>
              <tbody>
                {defectsDiscovered.map((defect) => (
                  <tr key={defect.key} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono text-red-500">{defect.key}</td>
                    <td className="p-2">{defect.title}</td>
                    <td className={`p-2 font-medium ${getPriorityColor(defect.priority)}`}>{defect.priority}</td>
                    <td className="p-2">
                      <Badge variant="outline">{defect.status}</Badge>
                    </td>
                    <td className="p-2 font-mono text-brand-gold">{defect.foundInCase}</td>
                    <td className="p-2 text-muted-foreground">{defect.foundDate}</td>
                    <td className="p-2 text-right">{defect.daysToResolve ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Effort Trend Line Chart - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Effort Trend (Weekly Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={effortTrend}>
              <XAxis dataKey="week" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#c69c6d" strokeWidth={2} dot={{ fill: '#c69c6d' }} />
            </LineChart>
          </ResponsiveContainer>
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
