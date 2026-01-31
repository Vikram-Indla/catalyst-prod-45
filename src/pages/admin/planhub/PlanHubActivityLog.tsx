import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Search, Download, Loader2, Plus, Pencil, Trash2, Eye, ArrowUpRight, FileOutput } from 'lucide-react';
import { usePlanHubActivityLog, ActivityLogFilters } from '@/hooks/planhub';
import { format, formatDistanceToNow } from 'date-fns';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4 text-green-600" />,
  update: <Pencil className="h-4 w-4 text-blue-600" />,
  delete: <Trash2 className="h-4 w-4 text-red-600" />,
  access: <Eye className="h-4 w-4 text-yellow-600" />,
  export: <FileOutput className="h-4 w-4 text-purple-600" />,
  restore: <ArrowUpRight className="h-4 w-4 text-teal-600" />,
  share: <ArrowUpRight className="h-4 w-4 text-orange-600" />,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/10 border-green-500/30',
  update: 'bg-blue-500/10 border-blue-500/30',
  delete: 'bg-red-500/10 border-red-500/30',
  access: 'bg-yellow-500/10 border-yellow-500/30',
  export: 'bg-purple-500/10 border-purple-500/30',
  restore: 'bg-teal-500/10 border-teal-500/30',
  share: 'bg-orange-500/10 border-orange-500/30',
};

const formatActionText = (action: string, details: Record<string, unknown> | null) => {
  const detailsObj = details || {};
  
  switch (action) {
    case 'create':
      return `Created ${detailsObj.type || 'item'}${detailsObj.name ? `: "${detailsObj.name}"` : ''}`;
    case 'update':
      return `Updated ${detailsObj.field || 'item'}${detailsObj.value ? ` to "${detailsObj.value}"` : ''}`;
    case 'delete':
      return `Deleted ${detailsObj.type || 'item'}${detailsObj.name ? `: "${detailsObj.name}"` : ''}`;
    case 'access':
      return `Accessed ${detailsObj.type || 'plan'}`;
    case 'export':
      return `Exported ${detailsObj.format || 'report'}`;
    case 'restore':
      return `Restored ${detailsObj.type || 'version'}`;
    case 'share':
      return `Shared ${detailsObj.type || 'plan'}`;
    default:
      return action;
  }
};

export default function PlanHubActivityLogPage() {
  const [filters, setFilters] = useState<ActivityLogFilters>({
    action: 'all',
    search: '',
  });
  
  const { data: activities, isLoading } = usePlanHubActivityLog(filters, 100);

  const handleExport = () => {
    if (!activities) return;
    
    const csv = [
      ['Timestamp', 'User', 'Action', 'Plan', 'Details'].join(','),
      ...activities.map(a => [
        format(new Date(a.created_at), 'yyyy-MM-dd HH:mm:ss'),
        a.user_name || 'Unknown',
        a.action,
        a.plan_name || '-',
        JSON.stringify(a.details || {}).replace(/,/g, ';'),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planhub-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="h-[72px] border-b bg-card flex-shrink-0">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 flex-shrink-0">
                <Activity className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">PlanHub™ Activity Log</h1>
                <p className="text-sm text-muted-foreground truncate">
                  Track all actions performed in the PlanHub module
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={!activities?.length}
              className="flex-shrink-0"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Log
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="mx-auto w-full max-w-5xl flex flex-col flex-1 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activity..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
              <Select 
                value={filters.action || 'all'} 
                onValueChange={(v) => setFilters({ ...filters, action: v })}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="restore">Restore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activity List */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>
                  {activities?.length || 0} entries found
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="divide-y">
                    {activities?.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Activity className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p>No activity found</p>
                        <p className="text-sm mt-1">Activity will appear here as users interact with PlanHub</p>
                      </div>
                    ) : (
                      activities?.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${ACTION_COLORS[entry.action] || 'bg-gray-500/10 border-gray-500/30'}`}>
                            {ACTION_ICONS[entry.action] || <Activity className="h-4 w-4 text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {formatActionText(entry.action, entry.details as Record<string, unknown> | null)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{entry.user_name || 'Unknown user'}</span>
                              {entry.plan_name && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[200px]">{entry.plan_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
