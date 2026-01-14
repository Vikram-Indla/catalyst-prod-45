/**
 * Team Workload Bars - Horizontal stacked bars per team member
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

interface TeamWorkloadBarsProps {
  cycleId: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  workloadStatus: 'normal' | 'high' | 'overloaded';
}

// Mock data - will be replaced with real data
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Ahmed S.',
    initials: 'AS',
    avatarColor: CATALYST_V5.primary,
    totalTests: 45,
    passed: 28,
    failed: 5,
    blocked: 2,
    inProgress: 10,
    workloadStatus: 'normal',
  },
  {
    id: '2',
    name: 'Sara M.',
    initials: 'SM',
    avatarColor: CATALYST_V5.teal,
    totalTests: 52,
    passed: 25,
    failed: 8,
    blocked: 4,
    inProgress: 15,
    workloadStatus: 'high',
  },
  {
    id: '3',
    name: 'Omar K.',
    initials: 'OK',
    avatarColor: CATALYST_V5.warning,
    totalTests: 38,
    passed: 18,
    failed: 2,
    blocked: 3,
    inProgress: 15,
    workloadStatus: 'normal',
  },
  {
    id: '4',
    name: 'Fatima R.',
    initials: 'FR',
    avatarColor: '#8b5cf6',
    totalTests: 65,
    passed: 30,
    failed: 10,
    blocked: 5,
    inProgress: 20,
    workloadStatus: 'overloaded',
  },
];

const WORKLOAD_BADGES = {
  high: { bg: CATALYST_V5.warningLight, text: CATALYST_V5.warning, label: 'High' },
  overloaded: { bg: CATALYST_V5.dangerLight, text: CATALYST_V5.danger, label: 'Overloaded' },
};

export function TeamWorkloadBars({ cycleId }: TeamWorkloadBarsProps) {
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
        {mockTeamMembers.map((member) => {
          const total = member.totalTests || 1;
          const passedPct = (member.passed / total) * 100;
          const failedPct = (member.failed / total) * 100;
          const blockedPct = (member.blocked / total) * 100;
          const inProgressPct = (member.inProgress / total) * 100;
          const workloadBadge = member.workloadStatus !== 'normal' 
            ? WORKLOAD_BADGES[member.workloadStatus] 
            : null;

          return (
            <div key={member.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.initials}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {member.name}
                  </span>
                  {workloadBadge && (
                    <span 
                      className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ 
                        backgroundColor: workloadBadge.bg, 
                        color: workloadBadge.text 
                      }}
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
              
              {/* Stacked Progress Bar */}
              <div className="h-2 flex rounded-full overflow-hidden bg-muted">
                <div 
                  className="transition-all"
                  style={{ 
                    width: `${passedPct}%`, 
                    backgroundColor: CATALYST_V5.teal 
                  }}
                />
                <div 
                  className="transition-all"
                  style={{ 
                    width: `${failedPct}%`, 
                    backgroundColor: CATALYST_V5.danger 
                  }}
                />
                <div 
                  className="transition-all"
                  style={{ 
                    width: `${blockedPct}%`, 
                    backgroundColor: CATALYST_V5.warning 
                  }}
                />
                <div 
                  className="transition-all"
                  style={{ 
                    width: `${inProgressPct}%`, 
                    backgroundColor: CATALYST_V5.primary 
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Legend */}
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
