import { Eye, Plus, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useIsWatching, useWatcherCount, useToggleWatch } from '@/hooks/useIncidentWatchers';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface IncidentWatchersWidgetProps {
  incidentId: string;
}

interface Watcher {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
  } | null;
}

export function IncidentWatchersWidget({ incidentId }: IncidentWatchersWidgetProps) {
  const { data: isWatching = false } = useIsWatching(incidentId);
  const { data: watcherCount = 0 } = useWatcherCount(incidentId);
  const toggleWatch = useToggleWatch(incidentId);

  // Fetch watchers with user details from profiles table
  const { data: watchers = [] } = useQuery({
    queryKey: ['incident-watchers', incidentId, 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_watchers')
        .select('id, user_id')
        .eq('incident_id', incidentId);

      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(w => w.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        return data.map(w => ({
          ...w,
          user: profiles?.find(p => p.id === w.user_id) || null,
        })) as Watcher[];
      }
      
      return [] as Watcher[];
    },
    enabled: !!incidentId,
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Watchers</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {watcherCount}
        </Badge>
      </div>
      <div className="p-3 space-y-3">
        {/* Watchers List */}
        <div className="space-y-2">
          {watchers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No watchers yet</p>
          ) : (
            watchers.slice(0, 5).map(watcher => (
              <div key={watcher.id} className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-secondary-bronze text-white">
                    {watcher.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate flex-1">{watcher.user?.full_name || 'Unknown'}</span>
              </div>
            ))
          )}
          {watchers.length > 5 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                  +{watchers.length - 5} more
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-2">
                  {watchers.slice(5).map(watcher => (
                    <div key={watcher.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-secondary-bronze text-white">
                          {watcher.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{watcher.user?.full_name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Watch/Unwatch Button */}
        <Button
          variant={isWatching ? 'default' : 'outline'}
          size="sm"
          className={`w-full ${isWatching ? 'bg-brand-gold hover:bg-brand-gold-hover text-white' : ''}`}
          onClick={() => toggleWatch.mutate(isWatching)}
          disabled={toggleWatch.isPending}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          {isWatching ? 'Watching' : 'Watch'}
        </Button>
      </div>
    </div>
  );
}
