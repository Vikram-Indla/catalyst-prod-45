import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActivityFeed } from '@/hooks/useTestDashboard';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ActivityFeedProps {
  programId: string;
}

export function ActivityFeed({ programId }: ActivityFeedProps) {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<'everyone' | 'me'>('everyone');
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const { data: activities, isLoading } = useActivityFeed(userFilter, limit, offset);

  const filteredActivities = activities?.filter(activity => 
    entityFilter === 'all' || activity.entity_type === entityFilter
  ) || [];

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Activity</h3>
        
        <div className="flex gap-2 mb-3">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="test_case">Cases</SelectItem>
              <SelectItem value="test_set">Sets</SelectItem>
              <SelectItem value="test_cycle">Cycles</SelectItem>
              <SelectItem value="test_execution">Runs</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md">
            <Button
              variant={userFilter === 'everyone' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setUserFilter('everyone')}
              className="rounded-r-none"
            >
              Everyone
            </Button>
            <Button
              variant={userFilter === 'me' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setUserFilter('me')}
              className="rounded-l-none"
            >
              Me
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className="border-l-2 border-brand-gold pl-3 py-1">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-brand-gold">
                    {activity.user_name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name}</span>{' '}
                    <span className="text-muted-foreground">{activity.description}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredActivities.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-3 border-t mt-3">
          Showing {Math.min(offset + 1, filteredActivities.length)}-
          {Math.min(offset + limit, filteredActivities.length)} of {filteredActivities.length} activity
        </div>
      )}
    </Card>
  );
}
