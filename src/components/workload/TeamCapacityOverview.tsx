/**
 * Team Capacity Overview Component
 * Summary cards showing key workload metrics
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ClipboardList, AlertTriangle, Calendar } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { WorkloadSummary } from '@/types/workload.types';

interface TeamCapacityOverviewProps {
  summary: WorkloadSummary;
  isLoading?: boolean;
}

export function TeamCapacityOverview({ summary, isLoading }: TeamCapacityOverviewProps) {
  const utilizationColor = summary.overallUtilization > 85 
    ? CATALYST_V5.warning 
    : summary.overallUtilization >= 60 
      ? CATALYST_V5.teal 
      : CATALYST_V5.primary;
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Team Utilization Card */}
      <Card className="border-l-4" style={{ borderLeftColor: utilizationColor }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: CATALYST_V5.slate[500] }}>
                Overall Capacity
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: utilizationColor }}>
                {summary.overallUtilization}%
              </p>
              <p className="text-xs mt-1" style={{ color: CATALYST_V5.slate[400] }}>
                Team utilization
              </p>
            </div>
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${utilizationColor}15` }}
            >
              <Users className="h-5 w-5" style={{ color: utilizationColor }} />
            </div>
          </div>
          {/* Progress ring would go here */}
          <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: CATALYST_V5.slate[100] }}>
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${Math.min(summary.overallUtilization, 100)}%`,
                backgroundColor: utilizationColor 
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Active Tests Card */}
      <Card className="border-l-4" style={{ borderLeftColor: CATALYST_V5.primary }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: CATALYST_V5.slate[500] }}>
                Tests Assigned
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: CATALYST_V5.slate[900] }}>
                {summary.totalTestsAssigned}
              </p>
              <p className="text-xs mt-1" style={{ color: CATALYST_V5.slate[400] }}>
                {summary.totalPending} pending · {summary.totalInProgress} in progress · {summary.totalCompleted} completed
              </p>
            </div>
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: CATALYST_V5.primaryLight }}
            >
              <ClipboardList className="h-5 w-5" style={{ color: CATALYST_V5.primary }} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* At Risk Card */}
      <Card 
        className="border-l-4 cursor-pointer hover:shadow-md transition-shadow" 
        style={{ borderLeftColor: summary.atRiskCount > 0 ? CATALYST_V5.danger : CATALYST_V5.slate[300] }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: CATALYST_V5.slate[500] }}>
                At Risk
              </p>
              <p 
                className="text-3xl font-bold mt-1" 
                style={{ color: summary.atRiskCount > 0 ? CATALYST_V5.danger : CATALYST_V5.slate[400] }}
              >
                {summary.atRiskCount}
              </p>
              <p className="text-xs mt-1" style={{ color: CATALYST_V5.slate[400] }}>
                Overdue or blocked tests
              </p>
            </div>
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: summary.atRiskCount > 0 ? CATALYST_V5.dangerLight : CATALYST_V5.slate[100] }}
            >
              <AlertTriangle 
                className="h-5 w-5" 
                style={{ color: summary.atRiskCount > 0 ? CATALYST_V5.danger : CATALYST_V5.slate[400] }} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Availability Card */}
      <Card className="border-l-4" style={{ borderLeftColor: CATALYST_V5.teal }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: CATALYST_V5.slate[500] }}>
                Available Today
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: CATALYST_V5.slate[900] }}>
                {summary.availableToday}/{summary.totalMembers}
              </p>
              <p className="text-xs mt-1" style={{ color: CATALYST_V5.slate[400] }}>
                Team members available
              </p>
            </div>
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: CATALYST_V5.tealLight }}
            >
              <Calendar className="h-5 w-5" style={{ color: CATALYST_V5.teal }} />
            </div>
          </div>
          {/* Available member initials */}
          <div className="flex items-center gap-1 mt-3">
            {['AR', 'SM', 'OH', 'FA'].slice(0, summary.availableToday).map((initials, i) => (
              <div 
                key={i}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: CATALYST_V5.tealLight, color: CATALYST_V5.teal }}
              >
                {initials}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
