/**
 * Activity Feed - Real-time activity updates
 * Wired to Supabase via useCycleActivityFeed
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, UserPlus, Bug, MessageSquare, Clock, Upload, RefreshCw, Play, Flag, UserMinus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useCycleActivityFeed, CycleActivity } from '@/hooks/test-cycles/useCycleActivityFeed';

interface ActivityFeedProps {
  cycleId: string;
}

const ACTION_STYLES: Record<string, { icon: any; bg: string; color: string; label: string }> = {
  status_changed: { icon: RefreshCw, bg: CATALYST_V5.primaryLight, color: CATALYST_V5.primary, label: 'changed status' },
  assigned: { icon: UserPlus, bg: CATALYST_V5.primaryLight, color: CATALYST_V5.primary, label: 'was assigned to' },
  unassigned: { icon: UserMinus, bg: CATALYST_V5.slate[100], color: CATALYST_V5.slate[500], label: 'was unassigned from' },
  defect_created: { icon: Bug, bg: CATALYST_V5.dangerLight, color: CATALYST_V5.danger, label: 'created defect for' },
  defect_linked: { icon: Bug, bg: CATALYST_V5.dangerLight, color: CATALYST_V5.danger, label: 'linked defect to' },
  comment_added: { icon: MessageSquare, bg: CATALYST_V5.slate[100], color: CATALYST_V5.slate[500], label: 'commented on' },
  evidence_uploaded: { icon: Upload, bg: CATALYST_V5.tealLight, color: CATALYST_V5.teal, label: 'uploaded evidence for' },
  retested: { icon: RefreshCw, bg: CATALYST_V5.primaryLight, color: CATALYST_V5.primary, label: 'retested' },
  bulk_update: { icon: Flag, bg: CATALYST_V5.warningLight, color: CATALYST_V5.warning, label: 'bulk updated' },
  execution_started: { icon: Play, bg: CATALYST_V5.primaryLight, color: CATALYST_V5.primary, label: 'started execution of' },
  execution_completed: { icon: CheckCircle, bg: CATALYST_V5.tealLight, color: CATALYST_V5.teal, label: 'completed execution of' },
};

function getStatusStyle(status: string | null) {
  switch (status) {
    case 'passed': return { icon: CheckCircle, color: CATALYST_V5.teal };
    case 'failed': return { icon: XCircle, color: CATALYST_V5.danger };
    case 'blocked': return { icon: AlertTriangle, color: CATALYST_V5.warning };
    default: return null;
  }
}

export function ActivityFeed({ cycleId }: ActivityFeedProps) {
  const { activities, isLoading } = useCycleActivityFeed(cycleId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="divide-y">
            {activities.map((activity) => {
              const style = ACTION_STYLES[activity.actionType] || ACTION_STYLES.status_changed;
              const Icon = style.icon;
              const toStatusStyle = activity.toStatus ? getStatusStyle(activity.toStatus) : null;
              
              return (
                <div 
                  key={activity.id}
                  className={`px-4 py-3 transition-colors ${activity.isLive ? 'bg-teal-50/50' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: style.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: style.color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{activity.actorName}</span>
                        {' '}
                        <span className="text-muted-foreground">{style.label}</span>
                        {' '}
                        {activity.testCaseKey && (
                          <span className="font-medium cursor-pointer hover:underline" style={{ color: CATALYST_V5.primary }}>
                            {activity.testCaseKey}
                          </span>
                        )}
                        {activity.toStatus && toStatusStyle && (
                          <>
                            {' → '}
                            <span className="font-medium" style={{ color: toStatusStyle.color }}>
                              {activity.toStatus}
                            </span>
                          </>
                        )}
                        {activity.defectKey && (
                          <>
                            {' → '}
                            <span className="font-medium cursor-pointer hover:underline" style={{ color: CATALYST_V5.danger }}>
                              {activity.defectKey}
                            </span>
                          </>
                        )}
                      </p>
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${activity.isLive ? 'text-teal-600' : 'text-muted-foreground'}`}>
                        {activity.isLive && (
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: CATALYST_V5.teal }} />
                        )}
                        {activity.timeAgo}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
