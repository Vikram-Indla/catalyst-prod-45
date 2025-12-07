import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Download, Filter } from 'lucide-react';
import { useState } from 'react';

/**
 * Changes Page - Activity logs for system changes
 * Source: Administration guide PDF, Page 8
 */
export default function Changes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['change-logs', filterAction],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = activityLogs?.filter(log => {
    if (!searchTerm) return true;
    return (
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const stats = {
    total: activityLogs?.length || 0,
    inserts: activityLogs?.filter(l => l.action === 'INSERT').length || 0,
    updates: activityLogs?.filter(l => l.action === 'UPDATE').length || 0,
    deletes: activityLogs?.filter(l => l.action === 'DELETE').length || 0,
  };

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="h-[72px] flex items-center justify-between border-b bg-card px-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground truncate">Changes</h1>
            <p className="text-sm text-muted-foreground truncate">
              Activity logs for application changes
            </p>
          </div>
          <Button variant="outline" className="gap-2 flex-shrink-0">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inserts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.inserts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.updates}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Deletes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.deletes}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>
              Track changes made in the product over time with date range filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search changes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading changes...</div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              log.action === 'INSERT'
                                ? 'bg-green-100 text-green-800'
                                : log.action === 'UPDATE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{log.entity_type}</TableCell>
                        <TableCell className="font-mono text-xs">{log.entity_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.actor_id ? log.actor_id.slice(0, 8) + '...' : 'System'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No changes found
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
