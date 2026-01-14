/**
 * Activity Feed - Real-time activity updates
 */

import React from 'react';
import { 
  CheckCircle, XCircle, AlertTriangle, UserPlus, 
  Bug, MessageSquare, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  cycleId: string;
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  actionType: 'passed' | 'failed' | 'blocked' | 'assigned' | 'defect_created' | 'comment';
  testCaseKey?: string;
  testCaseTitle?: string;
  defectKey?: string;
  timestamp: string;
  isLive?: boolean;
}

const ACTION_STYLES = {
  passed: { 
    icon: CheckCircle, 
    bg: CATALYST_V5.tealLight, 
    color: CATALYST_V5.teal,
    label: 'passed'
  },
  failed: { 
    icon: XCircle, 
    bg: CATALYST_V5.dangerLight, 
    color: CATALYST_V5.danger,
    label: 'failed'
  },
  blocked: { 
    icon: AlertTriangle, 
    bg: CATALYST_V5.warningLight, 
    color: CATALYST_V5.warning,
    label: 'marked as blocked'
  },
  assigned: { 
    icon: UserPlus, 
    bg: CATALYST_V5.primaryLight, 
    color: CATALYST_V5.primary,
    label: 'was assigned to'
  },
  defect_created: { 
    icon: Bug, 
    bg: CATALYST_V5.dangerLight, 
    color: CATALYST_V5.danger,
    label: 'created defect for'
  },
  comment: { 
    icon: MessageSquare, 
    bg: CATALYST_V5.slate[100], 
    color: CATALYST_V5.slate[500],
    label: 'commented on'
  },
};

// Mock activities - will be replaced with real-time data
const mockActivities: Activity[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Ahmed S.',
    userInitials: 'AS',
    actionType: 'passed',
    testCaseKey: 'TC-042',
    testCaseTitle: 'User login validation',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    isLive: true,
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Sara M.',
    userInitials: 'SM',
    actionType: 'failed',
    testCaseKey: 'TC-089',
    testCaseTitle: 'Email notification',
    defectKey: 'DEF-001',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Omar K.',
    userInitials: 'OK',
    actionType: 'blocked',
    testCaseKey: 'TC-112',
    testCaseTitle: 'SMS verification',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    userId: 'u2',
    userName: 'Sara M.',
    userInitials: 'SM',
    actionType: 'defect_created',
    testCaseKey: 'TC-089',
    defectKey: 'DEF-001',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    userId: 'u1',
    userName: 'Ahmed S.',
    userInitials: 'AS',
    actionType: 'assigned',
    testCaseKey: 'TC-156',
    testCaseTitle: 'Dashboard refresh',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

function formatTimeAgo(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

export function ActivityFeed({ cycleId }: ActivityFeedProps) {
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
            {mockActivities.map((activity) => {
              const style = ACTION_STYLES[activity.actionType];
              const Icon = style.icon;
              
              return (
                <div 
                  key={activity.id}
                  className={`px-4 py-3 transition-colors ${
                    activity.isLive ? 'bg-teal-50/50' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: style.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: style.color }} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{activity.userName}</span>
                        {' '}
                        <span className="text-muted-foreground">{style.label}</span>
                        {' '}
                        <span 
                          className="font-medium cursor-pointer hover:underline"
                          style={{ color: CATALYST_V5.primary }}
                        >
                          {activity.testCaseKey}
                        </span>
                        {activity.defectKey && (
                          <>
                            {' → '}
                            <span 
                              className="font-medium cursor-pointer hover:underline"
                              style={{ color: CATALYST_V5.danger }}
                            >
                              {activity.defectKey}
                            </span>
                          </>
                        )}
                      </p>
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                        activity.isLive ? 'text-teal-600' : 'text-muted-foreground'
                      }`}>
                        {activity.isLive && (
                          <span 
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: CATALYST_V5.teal }}
                          />
                        )}
                        {formatTimeAgo(activity.timestamp)}
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
