import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExecutionMetrics } from '@/types/reports';

interface ResultsPieChartProps { metrics: ExecutionMetrics | undefined; isLoading?: boolean; }

const COLORS = { passed: '#10b981', failed: 'var(--ds-text-danger, #ef4444)', blocked: 'var(--ds-text-warning, #f59e0b)', skipped: '#6b7280' };

export function ResultsPieChart({ metrics, isLoading }: ResultsPieChartProps) {
  if (isLoading) return (
    <Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
  );

  const data = [
    { name: 'Passed', value: metrics?.passed || 0, color: COLORS.passed },
    { name: 'Failed', value: metrics?.failed || 0, color: COLORS.failed },
    { name: 'Blocked', value: metrics?.blocked || 0, color: COLORS.blocked },
    { name: 'Skipped', value: metrics?.skipped || 0, color: COLORS.skipped },
  ].filter((d) => d.value > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-medium">Results Distribution</CardTitle></CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No execution data</div>
        ) : (
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center"><p className="text-2xl font-semibold">{total}</p><p className="text-xs text-muted-foreground">Total</p></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
