import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDefectTrendReport } from '@/hooks/useDefectReportData';
import { DefectTrendChart } from './charts/DefectTrendChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

interface DefectTrendReportProps {
  programId: string;
  dateRange?: { start: Date; end: Date };
}

export function DefectTrendReport({ programId, dateRange }: DefectTrendReportProps) {
  const { data, isLoading } = useDefectTrendReport({ programId, dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : undefined });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">No data available</div>;

  const { trendData, velocity, agingBuckets } = data;

  return (
    <div className="space-y-6">
      {/* Velocity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{velocity.createdThisPeriod}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{velocity.resolvedThisPeriod}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Change</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${velocity.netChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {velocity.netChange > 0 ? '+' : ''}{velocity.netChange}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg/Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{velocity.avgPerWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Activity className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{velocity.resolutionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader><CardTitle>Defect Trend</CardTitle></CardHeader>
        <CardContent>
          <DefectTrendChart data={trendData} showGap />
        </CardContent>
      </Card>

      {/* Aging Analysis */}
      <Card>
        <CardHeader><CardTitle>Defect Aging</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={agingBuckets}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#c69c6d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
