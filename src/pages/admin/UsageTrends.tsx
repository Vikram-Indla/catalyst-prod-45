import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, FileText, Activity } from 'lucide-react';

/**
 * Usage Trends Page - Monitor system usage patterns and analytics
 * Source: Administration guide PDF, Page 35
 */
export default function UsageTrends() {
  // Mock usage data
  const usageStats = {
    activeUsers: 245,
    totalWorkItems: 1523,
    avgSessionTime: '24m',
    pageViews: 8945,
  };

  const trendData = [
    { period: 'Last 7 days', users: 245, workItems: 156, features: 89 },
    { period: 'Last 30 days', users: 892, workItems: 612, features: 342 },
    { period: 'Last 90 days', users: 2156, workItems: 1523, features: 876 },
  ];

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-brand-gold" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Usage Trends</h1>
              <p className="text-muted-foreground mt-2">
                Monitor platform usage, user activity, and system performance metrics
              </p>
            </div>
          </div>
          <Select defaultValue="30">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                <Users className="h-4 w-4 text-brand-gold" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-gold">{usageStats.activeUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Work Items</CardTitle>
                <FileText className="h-4 w-4 text-brand-gold" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.totalWorkItems}</div>
              <p className="text-xs text-muted-foreground mt-1">+8% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Session</CardTitle>
                <Activity className="h-4 w-4 text-brand-gold" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.avgSessionTime}</div>
              <p className="text-xs text-muted-foreground mt-1">+5% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Page Views</CardTitle>
                <TrendingUp className="h-4 w-4 text-brand-gold" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.pageViews}</div>
              <p className="text-xs text-muted-foreground mt-1">+15% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Trends Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Trends by Period</CardTitle>
            <CardDescription>
              Track user activity and work item creation over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Period</th>
                    <th className="text-right p-3 font-medium">Active Users</th>
                    <th className="text-right p-3 font-medium">Work Items Created</th>
                    <th className="text-right p-3 font-medium">Features Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {trendData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{row.period}</td>
                      <td className="p-3 text-right">{row.users}</td>
                      <td className="p-3 text-right">{row.workItems}</td>
                      <td className="p-3 text-right">{row.features}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Most Active Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Areas</CardTitle>
            <CardDescription>
              Top accessed pages and features in the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { area: 'Program Board', views: 2456, change: '+18%' },
                { area: 'Epic Backlog', views: 1892, change: '+12%' },
                { area: 'Features', views: 1654, change: '+15%' },
                { area: 'Strategy Room', views: 1234, change: '+8%' },
                { area: 'Dependencies', views: 987, change: '+22%' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.area}</p>
                    <p className="text-sm text-muted-foreground">{item.views} views</p>
                  </div>
                  <span className="text-sm text-green-600 font-medium">{item.change}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Activity by Role */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity by Role</CardTitle>
            <CardDescription>
              Activity breakdown across different user roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-right p-3 font-medium">Active Users</th>
                    <th className="text-right p-3 font-medium">Avg. Session Time</th>
                    <th className="text-right p-3 font-medium">Actions Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: 'Admin', users: 8, time: '45m', actions: 1523 },
                    { role: 'Program Manager', users: 24, time: '38m', actions: 2156 },
                    { role: 'Team Lead', users: 45, time: '32m', actions: 3421 },
                    { role: 'User', users: 168, time: '18m', actions: 8945 },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{row.role}</td>
                      <td className="p-3 text-right">{row.users}</td>
                      <td className="p-3 text-right">{row.time}</td>
                      <td className="p-3 text-right">{row.actions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
