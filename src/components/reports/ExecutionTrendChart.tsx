import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendDataPoint } from '@/types/reports';
import { format } from 'date-fns';

interface ExecutionTrendChartProps { data: TrendDataPoint[]; isLoading?: boolean; fullWidth?: boolean; }

export function ExecutionTrendChart({ data, isLoading, fullWidth }: ExecutionTrendChartProps) {
  const formattedData = data.map((d) => ({ ...d, date: format(new Date(d.period), 'MMM d') }));

  if (isLoading) return (
    <Card className={fullWidth ? 'col-span-2' : ''}>
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent><Skeleton className="h-64 w-full" /></CardContent>
    </Card>
  );

  return (
    <Card className={fullWidth ? 'col-span-2' : ''}>
      <CardHeader><CardTitle className="text-base font-medium">Execution Trend</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No execution data for this period</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="passed" name="Passed" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
