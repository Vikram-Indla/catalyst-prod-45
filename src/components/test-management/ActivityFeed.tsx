import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useActivityFeed } from '@/hooks/useTestDashboard';
import { formatDistanceToNow } from 'date-fns';
import { Users, User, Globe } from 'lucide-react';

type FilterType = 'everyone' | 'me' | 'all';

export function ActivityFeed() {
  const [filter, setFilter] = useState<FilterType>('everyone');
  const { data: activities, isLoading } = useActivityFeed(filter, 20, 0);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Activity</CardTitle>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={filter === 'everyone' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('everyone')}
            >
              <Users className="h-3 w-3 mr-1" />
              Everyone
            </Button>
            <Button
              variant={filter === 'me' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('me')}
            >
              <User className="h-3 w-3 mr-1" />
              Me
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              <Globe className="h-3 w-3 mr-1" />
              All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground mb-4">
              Showing 1-{activities.length} of {activities.length} activities
            </div>
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {activity.user_name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{activity.user_name}</span>
                    {' '}
                    <span className="text-muted-foreground">{activity.description}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
