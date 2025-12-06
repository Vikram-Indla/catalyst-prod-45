import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Download } from 'lucide-react';

/**
 * Activity Page - Track user activity by names, roles, login tracking
 * Source: Administration guide PDF, Page 7
 */
export default function Activity() {
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track user activity by users' names and roles. Access user profiles, roles, and announcements.
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Activity Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityLogs?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Active Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{announcements?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system activity and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activity..."
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
            ) : activityLogs && activityLogs.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>{log.entity_type}</TableCell>
                        <TableCell className="font-mono text-xs">{log.entity_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No activity logs found
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>
                Navigate to related admin sections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/admin/users">Manage Users</a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/admin/system-roles">System Roles</a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/admin/announcements">Announcements</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Announcements</CardTitle>
              <CardDescription>
                Current announcements for your instance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {announcements && announcements.length > 0 ? (
                <ul className="space-y-2">
                  {announcements.map((announcement) => (
                    <li key={announcement.id} className="text-sm border-l-2 border-brand-gold pl-3 py-1">
                      {announcement.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No active announcements</p>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </AdminGuard>
  );
}
