/**
 * Workload Dashboard Page
 * Team capacity and distribution monitoring
 */

import React, { useState } from 'react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useTeamWorkload } from '@/hooks/workload';
import {
  WorkloadHeader,
  TeamCapacityOverview,
  WorkloadHealthIndicator,
  TeamMemberWorkloadCard,
  WorkloadAlerts,
  AvailabilityCalendar,
  CycleDistributionChart,
  WorkloadTrendChart,
} from '@/components/workload';
import type { WorkloadFilters, WorkloadAlert } from '@/types/workload.types';
import { toast } from 'sonner';

export default function WorkloadDashboard() {
  const [filters, setFilters] = useState<WorkloadFilters>({
    dateRange: 'this_week',
  });
  const [isRebalanceOpen, setIsRebalanceOpen] = useState(false);

  const teamId = 'team-1';
  const projectId = 'project-1';
  const { data, isLoading } = useTeamWorkload(teamId, filters);

  const handleFilterChange = (newFilters: Partial<WorkloadFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleAlertAction = (alert: WorkloadAlert) => {
    toast.info(`Action: ${alert.actionLabel} for ${alert.memberName || 'team'}`);
  };

  const handleReassign = (memberId: string) => {
    toast.info('Opening reassign dialog...');
  };

  const handleViewDetails = (memberId: string) => {
    toast.info('Opening test details...');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: CATALYST_V5.slate[50] }}>
      <WorkloadHeader
        filters={filters}
        onFilterChange={handleFilterChange}
        onRebalance={() => setIsRebalanceOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Alerts */}
        {data?.alerts && data.alerts.length > 0 && (
          <WorkloadAlerts alerts={data.alerts} onAction={handleAlertAction} />
        )}

        {/* Summary Cards */}
        <TeamCapacityOverview summary={data?.summary || { totalMembers: 0, availableToday: 0, totalTestsAssigned: 0, totalPending: 0, totalInProgress: 0, totalCompleted: 0, atRiskCount: 0, overallUtilization: 0 }} isLoading={isLoading} />

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Team Cards */}
          <div className="col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: CATALYST_V5.slate[900] }}>
                Team Members
              </h2>
              {data?.health && <WorkloadHealthIndicator health={data.health} />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {data?.members.map((member) => (
                <TeamMemberWorkloadCard
                  key={member.id}
                  member={member}
                  onReassign={() => handleReassign(member.id)}
                  onViewDetails={() => handleViewDetails(member.id)}
                />
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="col-span-4 space-y-6">
            <CycleDistributionChart projectId={projectId} />
            <WorkloadTrendChart teamId={teamId} />
          </div>
        </div>

        {/* Availability Calendar */}
        <AvailabilityCalendar teamId={teamId} />
      </div>
    </div>
  );
}
