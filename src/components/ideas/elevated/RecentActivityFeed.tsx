// ============================================================
// RECENT ACTIVITY FEED - Timeline of actions
// ============================================================

import { Clock, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  user_name: string;
  action_type: 'submitted' | 'voted' | 'converted' | 'triaged' | 'approved' | 'commented';
  details?: {
    title?: string;
    count?: number;
    type?: string;
  };
  created_at: string;
}

interface RecentActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  onViewAll?: () => void;
}

const ACTION_BADGES: Record<string, { label: string; className: string }> = {
  submitted: { label: 'New', className: 'bg-blue-100 text-blue-700' },
  voted: { label: 'Voted', className: 'bg-purple-100 text-purple-700' },
  converted: { label: 'Converted', className: 'bg-emerald-100 text-emerald-700' },
  triaged: { label: 'Triaged', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  commented: { label: 'Comment', className: 'bg-slate-100 text-slate-700' },
};

function getInitials(name: string): string {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function getActionText(activity: Activity): React.ReactNode {
  const { action_type, details } = activity;
  
  switch (action_type) {
    case 'submitted':
      return <>submitted "{details?.title}"</>;
    case 'voted':
      return <>voted on {details?.count || 1} idea{(details?.count || 1) > 1 ? 's' : ''}</>;
    case 'converted':
      return (
        <>
          converted idea to BR
          <Badge className={cn("ml-2 text-[10px]", ACTION_BADGES.converted.className)}>
            <Check className="w-2.5 h-2.5 mr-0.5" />
            Converted
          </Badge>
        </>
      );
    case 'triaged':
      return <>triaged idea as <span className="font-medium">{details?.type}</span></>;
    case 'approved':
      return <>approved "{details?.title}"</>;
    case 'commented':
      return <>commented on "{details?.title}"</>;
    default:
      return action_type;
  }
}

export function RecentActivityFeed({ 
  activities, 
  loading = false,
  onViewAll 
}: RecentActivityFeedProps) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <CardTitle className="text-sm font-semibold text-slate-900">
            Recent Activity
          </CardTitle>
        </div>
        {onViewAll && (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs text-slate-500"
            onClick={onViewAll}
          >
            View all
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                  {getInitials(activity.user_name)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600 leading-snug">
                    <span className="font-semibold text-slate-900">{activity.user_name}</span>
                    {' '}
                    {getActionText(activity)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
