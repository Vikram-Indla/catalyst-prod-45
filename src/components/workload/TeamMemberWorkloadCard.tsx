/**
 * Team Member Workload Card Component
 * Individual team member capacity and assignment details
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { WorkloadProgressBar } from './WorkloadProgressBar';
import type { TeamMemberWorkload } from '@/types/workload.types';

interface TeamMemberWorkloadCardProps {
  member: TeamMemberWorkload;
  onReassign: () => void;
  onViewDetails: () => void;
}

function getStatusBadge(member: TeamMemberWorkload) {
  if (!member.isAvailable) {
    return { label: 'Out', bg: CATALYST_V5.slate[100], color: CATALYST_V5.slate[500] };
  }
  if (member.utilization > 100) {
    return { label: 'Overloaded', bg: CATALYST_V5.dangerLight, color: CATALYST_V5.danger };
  }
  if (member.utilization > 85) {
    return { label: 'Busy', bg: CATALYST_V5.warningLight, color: CATALYST_V5.warning };
  }
  return { label: 'Available', bg: CATALYST_V5.tealLight, color: CATALYST_V5.teal };
}

function getBorderColor(member: TeamMemberWorkload): string {
  if (!member.isAvailable) return CATALYST_V5.slate[200];
  if (member.utilization > 100) return CATALYST_V5.danger;
  if (member.utilization > 85) return CATALYST_V5.warning;
  if (member.utilization >= 60) return CATALYST_V5.teal;
  return CATALYST_V5.primary;
}

export function TeamMemberWorkloadCard({ member, onReassign, onViewDetails }: TeamMemberWorkloadCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const statusBadge = getStatusBadge(member);
  const borderColor = getBorderColor(member);
  
  // Calculate capacity (assuming 20 tests is full capacity for simplicity)
  const capacity = member.dailyCapacity * 2.5; // ~2.5 tests per hour

  return (
    <Card 
      className="transition-all hover:shadow-md"
      style={{ 
        borderColor: borderColor,
        borderWidth: member.utilization > 100 ? '2px' : '1px'
      }}
    >
      <CardContent className="p-4">
        {/* Header: Avatar, Name, Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: CATALYST_V5.primaryLight, color: CATALYST_V5.primary }}
            >
              {member.initials}
            </div>
            <div>
              <p className="font-medium" style={{ color: CATALYST_V5.slate[900] }}>
                {member.name}
              </p>
              <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>
                {member.availableHoursToday}h available today
              </p>
            </div>
          </div>
          <Badge style={{ backgroundColor: statusBadge.bg, color: statusBadge.color }}>
            {statusBadge.label}
          </Badge>
        </div>
        
        {/* Capacity Bar */}
        <div className="mb-3">
          <WorkloadProgressBar 
            current={member.totalAssigned}
            capacity={capacity}
            showLabels
            size="md"
            showSegments
            segments={{
              completed: member.completed,
              inProgress: member.inProgress,
              pending: member.pending
            }}
          />
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div>
            <p className="text-lg font-semibold" style={{ color: CATALYST_V5.slate[900] }}>
              {member.totalAssigned}
            </p>
            <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>Assigned</p>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: CATALYST_V5.slate[600] }}>
              {member.pending}
            </p>
            <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>Pending</p>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: CATALYST_V5.primary }}>
              {member.inProgress}
            </p>
            <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>In Progress</p>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: CATALYST_V5.teal }}>
              {member.completed}
            </p>
            <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>Completed</p>
          </div>
        </div>
        
        {/* Cycle Breakdown (Collapsible) */}
        {member.cycleBreakdown.length > 0 && (
          <div className="border-t pt-3" style={{ borderColor: CATALYST_V5.slate[200] }}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-sm"
              style={{ color: CATALYST_V5.slate[600] }}
            >
              <span>Cycle Breakdown ({member.cycleBreakdown.length})</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {isExpanded && (
              <div className="mt-2 space-y-2">
                {member.cycleBreakdown.map((cycle) => (
                  <div 
                    key={cycle.cycleId}
                    className="flex items-center justify-between text-sm p-2 rounded"
                    style={{ backgroundColor: CATALYST_V5.slate[50] }}
                  >
                    <span style={{ color: CATALYST_V5.slate[700] }}>{cycle.cycleName}</span>
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: CATALYST_V5.primaryLight, 
                        color: CATALYST_V5.primary,
                        borderColor: 'transparent'
                      }}
                    >
                      {cycle.testCount} tests
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: CATALYST_V5.slate[200] }}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 gap-1"
            onClick={onViewDetails}
          >
            <Eye className="h-3 w-3" />
            View Tests
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 gap-1"
            onClick={onReassign}
            style={{ color: CATALYST_V5.primary }}
          >
            <RefreshCw className="h-3 w-3" />
            Reassign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
