/**
 * Team Workload Bars - Horizontal stacked bars per team member
 * Wired to real Supabase data via useCycleTeamWorkload
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useCycleTeamWorkload } from '@/hooks/test-cycles/useCycleTeamWorkload';

interface TeamWorkloadBarsProps {
  cycleId: string;
}

const WORKLOAD_BADGES = {
  high: { bg: CATALYST_V5.warningLight, text: CATALYST_V5.warning, label: 'High' },
  overloaded: { bg: CATALYST_V5.dangerLight, text: CATALYST_V5.danger, label: 'Overloaded' },
};

const AVATAR_COLORS = [CATALYST_V5.primary, CATALYST_V5.teal, CATALYST_V5.warning, '#8b5cf6', '#ec4899'];

export function TeamWorkloadBars({ cycleId }: TeamWorkloadBarsProps) {
  const { teamMembers, isLoading } = useCycleTeamWorkload(cycleId);

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Workload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No testers assigned to this cycle yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Workload
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs"
            style={{ 
              backgroundColor: CATALYST_V5.primaryLighter,
              color: CATALYST_V5.primary,
              borderColor: CATALYST_V5.primaryLight
            }}
          >
            Balance Workload
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamMembers.map((member, index) => {
          const total = member.totalTests || 1;
          const passedPct = (member.passed / total) * 100;
          const failedPct = (member.failed / total) * 100;
          const blockedPct = (member.blocked / total) * 100;
          const inProgressPct = (member.inProgress / total) * 100;
          const workloadBadge = member.workloadStatus !== 'normal' 
            ? WORKLOAD_BADGES[member.workloadStatus] 
            : null;
          const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

          return (
            <div key={member.userId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {member.avatarUrl ? (
                    <img 
                      src={member.avatarUrl} 
                      alt={member.userName}
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {member.userInitials}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {member.userName}
                  </span>
                  {workloadBadge && (
                    <span 
                      className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: workloadBadge.bg, color: workloadBadge.text }}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {workloadBadge.label}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {member.totalTests} tests
                </span>
              </div>
              
              <div className="h-2 flex rounded-full overflow-hidden bg-muted">
                <div className="transition-all" style={{ width: `${passedPct}%`, backgroundColor: CATALYST_V5.teal }} />
                <div className="transition-all" style={{ width: `${failedPct}%`, backgroundColor: CATALYST_V5.danger }} />
                <div className="transition-all" style={{ width: `${blockedPct}%`, backgroundColor: CATALYST_V5.warning }} />
                <div className="transition-all" style={{ width: `${inProgressPct}%`, backgroundColor: CATALYST_V5.primary }} />
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATALYST_V5.teal }} />
            <span className="text-xs text-muted-foreground">Passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATALYST_V5.danger }} />
            <span className="text-xs text-muted-foreground">Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATALYST_V5.warning }} />
            <span className="text-xs text-muted-foreground">Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATALYST_V5.primary }} />
            <span className="text-xs text-muted-foreground">In Progress</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
