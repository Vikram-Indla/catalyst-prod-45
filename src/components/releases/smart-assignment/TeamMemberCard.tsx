/**
 * Team Member Card
 * Shows individual member's assignment details with workload bar
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { LozengeAppearance } from '@/components/ads';
import type { SmartAssignmentTeamMember, DistributionSummary } from '@/types/smart-assignment.types';

const PRIORITY_APPEARANCE: Record<string, LozengeAppearance> = {
  critical: 'removed',
  high: 'moved',
  medium: 'inprogress',
  low: 'default',
};

interface TeamMemberCardProps {
  member: SmartAssignmentTeamMember;
  summary: DistributionSummary;
  otherMembers: SmartAssignmentTeamMember[];
  onMoveTest: (testId: string, fromMemberId: string, toMemberId: string) => void;
}

export function TeamMemberCard({
  member,
  summary,
  otherMembers,
  onMoveTest,
}: TeamMemberCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentPercent = Math.min((summary.currentCount / summary.maxCapacity) * 100, 100);
  const proposedPercent = Math.min((summary.proposedCount / summary.maxCapacity) * 100, 100 - currentPercent);
  const totalPercent = Math.min((summary.totalCount / summary.maxCapacity) * 100, 100);
  const isOverloaded = summary.isOverloaded;

  return (
    <div
      className={cn(
        "rounded-lg border-2 transition-colors",
        isOverloaded ? "border-2" : "border"
      )}
      style={{
        borderColor: isOverloaded 
          ? CATALYST_V5.danger 
          : CATALYST_V5.slate[200],
        backgroundColor: isOverloaded 
          ? CATALYST_V5.dangerLighter 
          : 'white',
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: member.avatarColor }}
          >
            {member.initials}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name and badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="font-semibold text-sm"
                style={{ color: CATALYST_V5.slate[800] }}
              >
                {member.name}
              </span>
              
              {isOverloaded && (
                <Lozenge appearance="removed">Overloaded</Lozenge>
              )}

              {summary.proposedCount > 0 && (
                <Lozenge appearance="inprogress">+{summary.proposedCount} new</Lozenge>
              )}
            </div>

            {/* Stats */}
            <p 
              className="text-xs mt-1"
              style={{ color: CATALYST_V5.slate[500] }}
            >
              {summary.currentCount} current + {summary.proposedCount} new = {summary.totalCount} total
              <span className="mx-1">•</span>
              Capacity: {summary.maxCapacity}
            </p>

            {/* Workload Bar */}
            <div className="mt-3">
              <div 
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: CATALYST_V5.slate[100] }}
              >
                {/* Current load */}
                <div className="h-full flex">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${currentPercent}%`,
                      backgroundColor: CATALYST_V5.slate[300],
                    }}
                  />
                  {/* Proposed load */}
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${proposedPercent}%`,
                      backgroundColor: isOverloaded 
                        ? CATALYST_V5.danger 
                        : CATALYST_V5.primary,
                    }}
                  />
                </div>
              </div>
              
              {/* Bar legend */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATALYST_V5.slate[300] }}
                  />
                  <span 
                    className="text-[10px]"
                    style={{ color: CATALYST_V5.slate[500] }}
                  >
                    Current ({summary.currentCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATALYST_V5.primary }}
                  />
                  <span 
                    className="text-[10px]"
                    style={{ color: CATALYST_V5.slate[500] }}
                  >
                    Proposed ({summary.proposedCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATALYST_V5.slate[100] }}
                  />
                  <span 
                    className="text-[10px]"
                    style={{ color: CATALYST_V5.slate[500] }}
                  >
                    Remaining ({Math.max(0, summary.maxCapacity - summary.totalCount)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Test List */}
      {summary.tests.length > 0 && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full px-4 py-2 flex items-center justify-between border-t"
              style={{ 
                borderColor: CATALYST_V5.slate[200],
                backgroundColor: CATALYST_V5.slate[50],
              }}
            >
              <span 
                className="text-xs font-medium"
                style={{ color: CATALYST_V5.slate[600] }}
              >
                View {summary.tests.length} assigned tests
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
              ) : (
                <ChevronDown className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
              )}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div 
              className="border-t max-h-48 overflow-y-auto"
              style={{ borderColor: CATALYST_V5.slate[200] }}
            >
              {summary.tests.map(test => {
                const priorityAppearance = PRIORITY_APPEARANCE[test.priority] ?? 'default';
                return (
                  <div
                    key={test.id}
                    className="px-4 py-2 flex items-center gap-2 border-b last:border-b-0"
                    style={{ borderColor: CATALYST_V5.slate[100] }}
                  >
                    <span
                      className="text-xs font-mono shrink-0"
                      style={{ color: CATALYST_V5.primary }}
                    >
                      {test.testCaseId}
                    </span>
                    <span
                      className="text-xs flex-1 truncate"
                      style={{ color: CATALYST_V5.slate[600] }}
                    >
                      {test.title}
                    </span>
                    <span className="shrink-0">
                      <Lozenge appearance={priorityAppearance}>{test.priority}</Lozenge>
                    </span>
                    
                    {/* Move to dropdown */}
                    <Select
                      value=""
                      onValueChange={(toMemberId) => {
                        onMoveTest(test.id, member.id, toMemberId);
                      }}
                    >
                      <SelectTrigger 
                        className="h-6 w-24 text-[10px] shrink-0"
                        style={{ borderColor: CATALYST_V5.slate[200] }}
                      >
                        <SelectValue placeholder="Move to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherMembers.map(m => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
