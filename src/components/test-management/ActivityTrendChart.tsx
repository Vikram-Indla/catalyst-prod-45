import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityTrends } from '@/hooks/useTestDashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

type ViewType = 'cases' | 'executions' | 'sets';
type DaysType = 7 | 30 | 90;

export function ActivityTrendChart() {
  const [view, setView] = useState<ViewType>('cases');
  const [days, setDays] = useState<DaysType>(30);
  const { data: trends, isLoading } = useActivityTrends(days, view);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = trends?.map(trend => ({
    date: format(new Date(trend.date), 'MMM dd'),
    created: trend.cases_created,
    edited: trend.cases_edited,
    executions: trend.executions_completed,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Activity Trends</CardTitle>
          <div className="flex gap-2">
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={view === 'cases' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('cases')}
              >
                Cases
              </Button>
              <Button
                variant={view === 'executions' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('executions')}
              >
                Executions
              </Button>
            </div>
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={days === 7 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDays(7)}
              >
                7d
              </Button>
              <Button
                variant={days === 30 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDays(30)}
              >
                30d
              </Button>
              <Button
                variant={days === 90 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDays(90)}
              >
                90d
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              {view === 'cases' && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Cases Created"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="edited" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Cases Edited"
                  />
                </>
              )}
              {view === 'executions' && (
                <Line 
                  type="monotone" 
                  dataKey="executions" 
                  stroke="hsl(var(--brand-gold))" 
                  strokeWidth={2}
                  name="Executions Completed"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No activity data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
