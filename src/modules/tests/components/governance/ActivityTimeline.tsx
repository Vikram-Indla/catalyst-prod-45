import React from 'react';
import { 
  Clock, 
  Edit2, 
  Plus, 
  Trash2, 
  User, 
  Play, 
  CheckCircle, 
  XCircle,
  Link,
  Settings,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  useEntityActivityTimeline, 
  useProgramActivityTimeline,
  ActivityTimelineEntry 
} from '../../hooks/useTestGovernance';

interface ActivityTimelineProps {
  entityType?: string;
  entityId?: string;
  programId?: string;
  limit?: number;
  showFilters?: boolean;
}

export function ActivityTimeline({
  entityType,
  entityId,
  programId,
  limit = 50,
  showFilters = false,
}: ActivityTimelineProps) {
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  
  // Use entity-specific or program-wide timeline
  const entityQuery = useEntityActivityTimeline(entityType || '', entityId || '');
  const programQuery = useProgramActivityTimeline(programId, {
    actionCategory: categoryFilter !== 'all' ? categoryFilter : undefined,
    limit,
  });
  
  const { data: activities = [], isLoading } = entityType && entityId 
    ? entityQuery 
    : programQuery;
  
  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('add')) return Plus;
    if (action.includes('update') || action.includes('edit') || action.includes('modify')) return Edit2;
    if (action.includes('delete') || action.includes('remove')) return Trash2;
    if (action.includes('execute') || action.includes('run')) return Play;
    if (action.includes('pass') || action.includes('complete')) return CheckCircle;
    if (action.includes('fail') || action.includes('block')) return XCircle;
    if (action.includes('link') || action.includes('assign')) return Link;
    if (action.includes('config') || action.includes('setting')) return Settings;
    return Clock;
  };
  
  const getActionColor = (action: string, category?: string | null) => {
    if (action.includes('delete') || action.includes('fail')) {
      return 'bg-red-500/10 text-red-500';
    }
    if (action.includes('create') || action.includes('pass')) {
      return 'bg-green-500/10 text-green-500';
    }
    if (action.includes('update') || action.includes('edit')) {
      return 'bg-blue-500/10 text-blue-500';
    }
    if (action.includes('execute')) {
      return 'bg-purple-500/10 text-purple-500';
    }
    return 'bg-muted text-muted-foreground';
  };
  
  const formatChanges = (oldValues: Record<string, any> | null, newValues: Record<string, any> | null) => {
    if (!oldValues && !newValues) return null;
    
    const changes: Array<{ field: string; from: any; to: any }> = [];
    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ]);
    
    allKeys.forEach(key => {
      const oldVal = oldValues?.[key];
      const newVal = newValues?.[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, from: oldVal, to: newVal });
      }
    });
    
    return changes.slice(0, 3);
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <CardTitle className="text-base">Activity Timeline</CardTitle>
          </div>
          {showFilters && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="test_case">Test Cases</SelectItem>
                <SelectItem value="execution">Executions</SelectItem>
                <SelectItem value="cycle">Cycles</SelectItem>
                <SelectItem value="defect">Defects</SelectItem>
                <SelectItem value="ai">AI Actions</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <CardDescription>
          {entityType 
            ? `History for this ${entityType.replace('_', ' ')}`
            : 'Recent activities across the program'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No activity recorded</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const ActionIcon = getActionIcon(activity.action);
                  const changes = formatChanges(activity.old_values, activity.new_values);
                  
                  return (
                    <div key={activity.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-2 top-1 h-5 w-5 rounded-full flex items-center justify-center',
                        getActionColor(activity.action, activity.action_category)
                      )}>
                        <ActionIcon className="h-3 w-3" />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {activity.action.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{activity.actor_name || 'System'}</span>
                              <span>•</span>
                              <span title={format(new Date(activity.created_at), 'PPpp')}>
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          
                          {activity.entity_key && (
                            <Badge variant="outline" className="text-xs">
                              {activity.entity_key}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Show changes */}
                        {changes && changes.length > 0 && (
                          <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs space-y-1">
                            {changes.map((change, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium capitalize">
                                  {change.field.replace(/_/g, ' ')}:
                                </span>
                                {change.from !== undefined && (
                                  <>
                                    <span className="line-through text-muted-foreground">
                                      {String(change.from).substring(0, 20)}
                                    </span>
                                    <span>→</span>
                                  </>
                                )}
                                <span className="text-foreground">
                                  {String(change.to).substring(0, 30)}
                                  {String(change.to).length > 30 && '...'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
