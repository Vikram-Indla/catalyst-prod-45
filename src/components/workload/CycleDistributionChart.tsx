/**
 * Cycle Distribution Chart Component
 * Horizontal stacked bar showing tests per cycle by team member
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useCycleDistribution } from '@/hooks/workload';

const MEMBER_COLORS = ['#2563eb', '#0d9488', '#3b82f6', '#14b8a6', '#64748b'];

const urgencyColors = {
  overdue: { bg: CATALYST_V5.dangerLight, text: CATALYST_V5.danger },
  due_soon: { bg: CATALYST_V5.warningLight, text: CATALYST_V5.warning },
  on_track: { bg: CATALYST_V5.tealLight, text: CATALYST_V5.teal },
};

export function CycleDistributionChart({ projectId }: { projectId: string }) {
  const { data: cycles, isLoading } = useCycleDistribution(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-40 animate-pulse bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  const maxTests = Math.max(...(cycles?.map(c => c.totalTests) || [1]));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ color: CATALYST_V5.slate[900] }}>
          Tests by Cycle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cycles?.map((cycle) => {
          const urgency = urgencyColors[cycle.urgency];
          return (
            <div key={cycle.cycleId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: CATALYST_V5.slate[700] }}>
                  {cycle.cycleName}
                </span>
                <div className="flex items-center gap-2">
                  <Badge style={{ backgroundColor: urgency.bg, color: urgency.text }} className="text-xs">
                    {cycle.urgency === 'overdue' ? 'Overdue' : cycle.urgency === 'due_soon' ? 'Due Soon' : 'On Track'}
                  </Badge>
                  <span className="text-sm" style={{ color: CATALYST_V5.slate[500] }}>
                    {cycle.totalTests}
                  </span>
                </div>
              </div>
              <div className="h-6 rounded-full overflow-hidden flex" style={{ backgroundColor: CATALYST_V5.slate[100] }}>
                {cycle.memberDistribution.map((member, i) => (
                  <div
                    key={member.memberId}
                    className="h-full transition-all"
                    style={{
                      width: `${(member.count / maxTests) * 100}%`,
                      backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length],
                    }}
                    title={`${member.memberName}: ${member.count}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
