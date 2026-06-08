import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FolderMetrics } from '@/types/reports';

interface ModuleBarChartProps { data: FolderMetrics[]; isLoading?: boolean; }

export function ModuleBarChart({ data, isLoading }: ModuleBarChartProps) {
  if (isLoading) return (
    <Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
  );

  const formattedData = data.slice(0, 8).map((d) => ({
    name: d.folder_name || 'Uncategorized', pass_rate: d.pass_rate || 0, total: d.total,
  }));

  const getBarColor = (passRate: number) => {
    if (passRate >= 90) return '#10b981';
    if (passRate >= 75) return 'var(--ds-text-success, #22c55e)';
    if (passRate >= 60) return 'var(--ds-text-warning, #f59e0b)';
    return 'var(--ds-text-danger, #ef4444)';
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-medium">Results by Module</CardTitle></CardHeader>
      <CardContent>
        {formattedData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No module data</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Pass Rate']} />
                <Bar dataKey="pass_rate" radius={[0, 4, 4, 0]}>
                  {formattedData.map((entry, index) => <Cell key={index} fill={getBarColor(entry.pass_rate)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
