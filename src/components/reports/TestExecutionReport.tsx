import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reportsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface TestExecutionReportProps {
  programId: string;
  dateRange: string;
}

export function TestExecutionReport({ programId, dateRange }: TestExecutionReportProps) {
  const { data: executions } = useQuery({
    queryKey: ['execution-stats', programId, dateRange],
    queryFn: () => reportsService.getExecutionStats(programId, dateRange),
  });

  if (!executions) return <div>Loading...</div>;

  // Group executions by date
  const groupedByDate = executions.reduce((acc, exec) => {
    const date = format(new Date(exec.executed_at), 'MMM dd');
    if (!acc[date]) {
      acc[date] = { date, passed: 0, failed: 0, blocked: 0, skipped: 0 };
    }
    if (exec.status === 'passed') acc[date].passed++;
    else if (exec.status === 'failed') acc[date].failed++;
    else if (exec.status === 'blocked') acc[date].blocked++;
    else if (exec.status === 'skipped') acc[date].skipped++;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(groupedByDate);

  // Calculate summary stats
  const totalExecutions = executions.length;
  const passedCount = executions.filter(e => e.status === 'passed').length;
  const failedCount = executions.filter(e => e.status === 'failed').length;
  const passRate = totalExecutions ? ((passedCount / totalExecutions) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="blocked" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="skipped" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Execution Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Case</th>
                  <th className="text-left p-2">Cycle</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {executions.slice(0, 10).map((exec) => (
                  <tr key={exec.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{exec.test_cases?.title || 'N/A'}</td>
                    <td className="p-2">{exec.test_cycles?.name || 'N/A'}</td>
                    <td className="p-2">{format(new Date(exec.executed_at), 'MMM dd, yyyy')}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          exec.status === 'passed'
                            ? 'bg-green-100 text-green-700'
                            : exec.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : exec.status === 'blocked'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {exec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
