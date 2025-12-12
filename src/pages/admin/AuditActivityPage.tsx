import { useState, useMemo } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
import { Json } from '@/integrations/supabase/types';
import { 
  Search, 
  Download, 
  Save,
  Trash2,
  RotateCcw,
  Layers
} from 'lucide-react';
import { AuditDetailsDrawer } from '@/components/admin/audit/AuditDetailsDrawer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Types
interface ActivityEvent {
  id: string;
  created_at: string | null;
  actor_id: string | null;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  before_json: Json | null;
  after_json: Json | null;
}

// Date range presets
const datePresets = [
  { label: 'Last week', value: '7d', getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: '2 weeks ago', value: '14d', getRange: () => ({ from: subDays(new Date(), 14), to: new Date() }) },
  { label: 'All time', value: 'all', getRange: () => null },
];

// Action types
const actionTypes = ['INSERT', 'UPDATE', 'DELETE'];

// Helper to get entity name from after_json
const getEntityName = (log: ActivityEvent): string => {
  if (log.after_json && typeof log.after_json === 'object' && !Array.isArray(log.after_json)) {
    const json = log.after_json as Record<string, unknown>;
    return (json.name as string) || (json.title as string) || (json.summary as string) || '';
  }
  return '';
};

// Helper to format action as readable verb
const getActionVerb = (action: string): string => {
  switch (action) {
    case 'INSERT': return 'created';
    case 'UPDATE': return 'updated';
    case 'DELETE': return 'deleted';
    default: return action.toLowerCase();
  }
};

// Helper to format entity type as readable noun
const formatEntityType = (type: string): string => {
  return type.replace(/_/g, ' ').replace(/s$/, '');
};

export default function AuditActivityPage() {
  const queryClient = useQueryClient();
  
  // Filters state
  const [datePreset, setDatePreset] = useState('7d');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupRepeats, setGroupRepeats] = useState(false);
  
  // Drawer state
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch profiles for actor names
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return data || [];
    },
  });

  // Create a lookup map for actor names
  const actorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles?.forEach(p => {
      map.set(p.id, p.full_name || p.email || 'Unknown');
    });
    return map;
  }, [profiles]);

  // Fetch activity logs
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['audit-activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as ActivityEvent[];
    },
  });

  // Clear all logs mutation
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-activity-logs'] });
      toast.success('Activity log cleared successfully');
    },
    onError: () => {
      toast.error('Failed to clear activity log');
    },
  });

  // Get unique entity types for filter
  const entityTypes = useMemo(() => {
    if (!activityLogs) return [];
    return [...new Set(activityLogs.map(log => log.entity_type))].sort();
  }, [activityLogs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    if (!activityLogs) return [];
    
    let filtered = [...activityLogs];
    
    // Date filter
    const preset = datePresets.find(p => p.value === datePreset);
    if (preset && preset.value !== 'all') {
      const range = preset.getRange();
      if (range) {
        filtered = filtered.filter(log => {
          if (!log.created_at) return false;
          const logDate = parseISO(log.created_at);
          return isWithinInterval(logDate, { start: range.from, end: range.to });
        });
      }
    }
    
    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }
    
    // Entity type filter
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityTypeFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.entity_id.toLowerCase().includes(query) ||
        log.entity_type.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [activityLogs, datePreset, actionFilter, entityTypeFilter, searchQuery]);

  // Group repeated events (same actor + entity within 2 minutes)
  const displayLogs = useMemo(() => {
    if (!groupRepeats) return filteredLogs;
    
    const grouped: (ActivityEvent & { repeatCount?: number })[] = [];
    let prevLog: ActivityEvent | null = null;
    let repeatCount = 1;
    
    filteredLogs.forEach((log, idx) => {
      if (prevLog && 
          prevLog.actor_id === log.actor_id && 
          prevLog.entity_id === log.entity_id &&
          prevLog.entity_type === log.entity_type &&
          prevLog.created_at && log.created_at) {
        const diff = Math.abs(parseISO(prevLog.created_at).getTime() - parseISO(log.created_at).getTime());
        if (diff <= 2 * 60 * 1000) { // 2 minutes
          repeatCount++;
          return;
        }
      }
      
      if (prevLog) {
        grouped.push({ ...prevLog, repeatCount: repeatCount > 1 ? repeatCount : undefined });
      }
      prevLog = log;
      repeatCount = 1;
      
      if (idx === filteredLogs.length - 1) {
        grouped.push({ ...log, repeatCount: repeatCount > 1 ? repeatCount : undefined });
      }
    });
    
    return grouped;
  }, [filteredLogs, groupRepeats]);

  const handleRowClick = (event: ActivityEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const handleResetFilters = () => {
    setDatePreset('7d');
    setActorFilter('');
    setActionFilter('all');
    setEntityTypeFilter('all');
    setSearchQuery('');
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background print:bg-white">
        {/* Header */}
        <div className="h-[72px] flex items-center justify-between border-b bg-card px-6 print:hidden">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Activity Log</h1>
            <p className="text-sm text-muted-foreground">
              Investigation-grade audit trail
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Clear Log
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Activity Log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all activity log entries. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => clearLogsMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearLogsMutation.isPending ? 'Clearing...' : 'Clear All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              Save view
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="border-b bg-card px-6 py-3 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range */}
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Entity Type Filter */}
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search entity ID, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>

            {/* Group Repeats Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <Checkbox
                id="group-repeats"
                checked={groupRepeats}
                onCheckedChange={(checked) => setGroupRepeats(checked === true)}
              />
              <label htmlFor="group-repeats" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                Group repeats
              </label>
            </div>

            {/* Reset Filters */}
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {/* Active filters summary */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Showing {displayLogs.length} of {activityLogs?.length || 0} events</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading activity logs...
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No activity logs found matching your filters
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-2 w-40">Time</th>
                  <th className="text-left font-medium px-4 py-2">Activity</th>
                  <th className="text-left font-medium px-4 py-2 w-32">Entity Type</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.map((log) => {
                  const actorName = log.actor_id ? actorNameMap.get(log.actor_id) || 'Unknown User' : 'System';
                  const entityName = getEntityName(log);
                  const actionVerb = getActionVerb(log.action);
                  const entityType = formatEntityType(log.entity_type);
                  
                  return (
                    <tr
                      key={log.id}
                      onClick={() => handleRowClick(log)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRowClick(log)}
                      tabIndex={0}
                      className={cn(
                        'border-b cursor-pointer hover:bg-muted/50 transition-colors',
                        'focus:outline-none focus:bg-brand-gold/5'
                      )}
                    >
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                        {log.created_at ? format(parseISO(log.created_at), 'MMM d, HH:mm:ss') : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium text-foreground">{actorName}</span>
                        {' '}
                        <Badge variant={getActionBadgeVariant(log.action)} className="text-xs mx-1">
                          {actionVerb}
                        </Badge>
                        {' '}
                        {entityName ? (
                          <span className="text-foreground">"{entityName}"</span>
                        ) : (
                          <span className="text-muted-foreground">a {entityType}</span>
                        )}
                        {'repeatCount' in log && (log as ActivityEvent & { repeatCount?: number }).repeatCount && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            ×{(log as ActivityEvent & { repeatCount?: number }).repeatCount}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground capitalize">
                        {entityType}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Audit Details Drawer */}
        <AuditDetailsDrawer
          event={selectedEvent}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          table { font-size: 10px; }
          th, td { padding: 4px 8px; }
        }
      `}</style>
    </AdminGuard>
  );
}
