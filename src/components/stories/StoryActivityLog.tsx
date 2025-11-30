// Story Activity Log - track changes and history
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Activity, User, Calendar, Flag } from 'lucide-react';

interface StoryActivityLogProps {
  storyId: string;
}

export function StoryActivityLog({ storyId }: StoryActivityLogProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['story-activity', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles:actor_id(full_name, email)')
        .eq('entity_type', 'stories')
        .eq('entity_id', storyId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Flag className="h-4 w-4 text-green-500" />;
      case 'UPDATE':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'DELETE':
        return <Flag className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.action) {
      case 'INSERT':
        return 'created this story';
      case 'UPDATE':
        return 'updated this story';
      case 'DELETE':
        return 'deleted this story';
      default:
        return activity.action.toLowerCase();
    }
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">Loading activity...</p>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity: any) => (
        <div key={activity.id} className="flex gap-3 p-3 rounded-lg border bg-card">
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon(activity.action)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {activity.profiles?.full_name || activity.profiles?.email || 'Unknown User'}
              </span>
              <span className="text-sm text-muted-foreground">
                {getActivityDescription(activity)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Show field changes if available */}
            {activity.before_json && activity.after_json && (
              <div className="mt-2 text-xs space-y-1">
                {Object.keys(activity.after_json).map((key) => {
                  const oldValue = activity.before_json[key];
                  const newValue = activity.after_json[key];
                  
                  if (oldValue !== newValue && !['updated_at', 'created_at'].includes(key)) {
                    return (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-red-500 line-through">{String(oldValue || 'none')}</span>
                        <span>→</span>
                        <span className="text-green-500">{String(newValue || 'none')}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
