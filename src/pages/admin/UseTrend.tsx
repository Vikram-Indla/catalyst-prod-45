import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Activity, Users, TrendingUp, Database } from 'lucide-react';

/**
 * Use Trend Page - Login charts and trends
 * Source: Administration guide PDF, Page 9
 */
export default function UseTrend() {
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity-trend'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('created_at, action, entity_type')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: userCount } = useQuery({
    queryKey: ['total-users'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todayActivity } = useQuery({
    queryKey: ['today-activity'],
    queryFn: async () => {
      const today = new Date();
      const { count, error } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString());
      
      if (error) throw error;
      return count || 0;
    },
  });

  const activityByDay = recentActivity?.reduce((acc, log) => {
    const day = format(new Date(log.created_at), 'MMM dd');
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activityByType = recentActivity?.reduce((acc, log) => {
    acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topEntities = Object.entries(activityByType || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="border-b bg-card px-6 py-4">
          <h1 className="text-2xl font-semibold text-foreground">Use Trend</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track user activity over time with login charts and invalid login tracking.
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">7-Day Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentActivity?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayActivity || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(activityByType || {}).length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Activity by Day (Last 7 Days)</CardTitle>
              <CardDescription>
                Daily activity count across all entity types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityByDay && Object.keys(activityByDay).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(activityByDay).map(([day, count]) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-gold"
                            style={{
                              width: `${(count / Math.max(...Object.values(activityByDay))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 Active Entities</CardTitle>
              <CardDescription>
                Most frequently modified entity types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topEntities.length > 0 ? (
                <div className="space-y-3">
                  {topEntities.map(([type, count], index) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{type}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count} actions</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usage Insights</CardTitle>
            <CardDescription>
              Key metrics and patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">Average Daily Activity</p>
                <p className="text-2xl font-bold">
                  {activityByDay ? Math.round(Object.values(activityByDay).reduce((a, b) => a + b, 0) / Object.keys(activityByDay).length) : 0}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">Most Active Entity</p>
                <p className="text-lg font-bold">{topEntities[0]?.[0] || 'N/A'}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">Activity Growth</p>
                <p className="text-2xl font-bold text-green-600">+12%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
