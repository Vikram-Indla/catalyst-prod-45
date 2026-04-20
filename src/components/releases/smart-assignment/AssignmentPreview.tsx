/**
 * Assignment Preview
 * Shows the proposed test distribution across team members
 */

import React from 'react';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { getDistributionHealth } from '@/lib/assignment-algorithm';
import { TeamMemberCard } from './TeamMemberCard';
import type { SmartAssignmentTeamMember, DistributionSummary } from '@/types/smart-assignment.types';

interface AssignmentPreviewProps {
  team: SmartAssignmentTeamMember[];
  distributionSummary: DistributionSummary[];
  distributionScore: number;
  hasManualAdjustments: boolean;
  onMoveTest: (testId: string, fromMemberId: string, toMemberId: string) => void;
}

const HEALTH_APPEARANCE: Record<string, LozengeAppearance> = {
  teal: 'success',
  primary: 'inprogress',
  warning: 'moved',
  danger: 'removed',
};

export function AssignmentPreview({
  team,
  distributionSummary,
  distributionScore,
  hasManualAdjustments,
  onMoveTest,
}: AssignmentPreviewProps) {
  const health = getDistributionHealth(distributionScore);
  const healthAppearance = HEALTH_APPEARANCE[health.color] ?? 'default';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: CATALYST_V5.slate[200] }}
      >
        <div>
          <h3 
            className="text-sm font-semibold"
            style={{ color: CATALYST_V5.slate[700] }}
          >
            Distribution Preview
          </h3>
          <p 
            className="text-xs mt-0.5"
            style={{ color: CATALYST_V5.slate[500] }}
          >
            {distributionSummary.reduce((sum, d) => sum + d.proposedCount, 0)} tests across {team.length} members
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span 
            className="text-xs"
            style={{ color: CATALYST_V5.slate[500] }}
          >
            Balance Score:
          </span>
          <Lozenge appearance={healthAppearance}>
            {distributionScore}/100 - {health.label}
          </Lozenge>
        </div>
      </div>

      {/* Team Cards */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {distributionSummary.map(summary => {
            const member = team.find(m => m.id === summary.memberId)!;
            return (
              <TeamMemberCard
                key={summary.memberId}
                member={member}
                summary={summary}
                otherMembers={team.filter(m => m.id !== summary.memberId)}
                onMoveTest={onMoveTest}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
