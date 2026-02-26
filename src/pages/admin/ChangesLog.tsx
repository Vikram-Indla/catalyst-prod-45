import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Download } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Changes Log Page — ZERO MOCK DATA
 * All data from activity_logs table in the database.
 */
export default function ChangesLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Fetch from activity_logs table — no mock data
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ['admin-changes-log', filterType],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('entity_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.created_at),
        user: row.actor_id || 'System',
        type: row.entity_type,
        entity: row.entity_id,
        action: row.action,
        details: row.after_json ? JSON.stringify(row.after_json) : '',
      }));
    },
  });

  const filteredChanges = changes.filter((change: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      change.action?.toLowerCase().includes(q) ||
      change.entity?.toLowerCase().includes(q) ||
      change.user?.toLowerCase().includes(q) ||
      change.details?.toLowerCase().includes(q)
    );
  });

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'configuration': return 'default';
      case 'work_item': return 'secondary';
      case 'user_management': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Changes Log</h1>
            <p className="text-muted-foreground">Track all system configuration changes</p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search changes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="configuration">Configuration</SelectItem>
                  <SelectItem value="work_item">Work Items</SelectItem>
                  <SelectItem value="user_management">User Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading changes...</div>
            ) : filteredChanges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No changes recorded</p>
                <p className="text-sm">Activity will appear here as changes are made in the system.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChanges.map((change: any) => (
                  <div key={change.id} className="flex items-start gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{change.action}</span>
                        <Badge variant={getTypeBadgeVariant(change.type)}>{change.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{change.details}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{change.user}</span>
                        <span>·</span>
                        <span>{format(change.timestamp, 'MMM d, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
