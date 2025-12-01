import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Activity, User } from 'lucide-react';
import { ResponsiveTableWrapper } from '@/components/layout/ResponsivePageContainer';

export default function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: activityLogs } = useQuery({
    queryKey: ['activity-logs', searchTerm, entityTypeFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (entityTypeFilter) query = query.eq('entity_type', entityTypeFilter);
      if (actionFilter) query = query.eq('action', actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
      case 'insert':
        return 'bg-success';
      case 'update':
        return 'bg-primary';
      case 'delete':
        return 'bg-destructive';
      default:
        return 'bg-secondary';
    }
  };

  const uniqueEntityTypes = Array.from(
    new Set(activityLogs?.map((log) => log.entity_type) || [])
  ).sort();

  const uniqueActions = Array.from(
    new Set(activityLogs?.map((log) => log.action) || [])
  ).sort();

  const filteredLogs = activityLogs?.filter((log) => {
    if (!searchTerm) return true;
    return (
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2 flex items-center gap-2">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
            Activity Log
          </h1>
          <p className="text-muted-foreground">Audit trail of all system changes</p>
        </div>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Input
            placeholder="Search by entity type, action, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={entityTypeFilter || undefined} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Entity Types" />
            </SelectTrigger>
            <SelectContent>
              {uniqueEntityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter || undefined} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <ResponsiveTableWrapper minWidth={800}>
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {log.created_at
                    ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')
                    : '-'}
                </TableCell>
                <TableCell>
                  <Badge className={`${getActionBadgeColor(log.action)} capitalize`}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium capitalize">
                  {log.entity_type.replace(/_/g, ' ')}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {log.entity_id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  {log.actor_id ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-mono">
                        {log.actor_id.slice(0, 8)}...
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">System</span>
                  )}
                </TableCell>
                <TableCell>
                  {log.before_json || log.after_json ? (
                    <Badge variant="outline" className="text-xs">
                      Has Changes
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

          {(!filteredLogs || filteredLogs.length === 0) && (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No activity logs found</p>
            </div>
          )}
        </ResponsiveTableWrapper>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing most recent 100 entries
      </div>
    </div>
  );
}
