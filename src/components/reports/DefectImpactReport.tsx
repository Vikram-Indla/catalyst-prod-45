import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDefectImpactReport } from '@/hooks/useDefectReportData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Bug, Link2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface DefectImpactReportProps {
  programId: string;
  dateRange?: { start: Date; end: Date };
}

export function DefectImpactReport({ programId, dateRange }: DefectImpactReportProps) {
  const { data, isLoading } = useDefectImpactReport({ programId, dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : undefined });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">No data available</div>;

  const { overview, statusDistribution, priorityDistribution, impactRows } = data;

  // Transform data for Recharts with proper typing
  const statusChartData = statusDistribution.map(s => ({
    name: s.status,
    value: s.count,
    fill: s.color,
  })) as Array<{ name: string; value: number; fill: string }>;

  const priorityChartData = priorityDistribution.map(p => ({
    name: p.priority,
    value: p.count,
    fill: p.color,
  })) as Array<{ name: string; value: number; fill: string }>;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Defects</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalDefects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Linked to Cases</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.linkedToCases}</div>
            <p className="text-xs text-muted-foreground">{overview.linkedPercentage}% linked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unlinked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.unlinked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg per Failed Case</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avgPerFailedCase}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Priority Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={priorityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Impact Table */}
      <Card>
        <CardHeader><CardTitle>Defect Impact Analysis</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked Cases</TableHead>
                <TableHead>Executions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {impactRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-mono text-sm">{row.key}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <Badge variant={row.priority === 'Critical' || row.priority === 'High' ? 'destructive' : 'secondary'}>
                      {row.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.linkedCases}</TableCell>
                  <TableCell>{row.linkedExecutions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
