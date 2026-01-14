/**
 * Team Workload Hook
 * Fetches and manages team workload data
 */

import { useQuery } from '@tanstack/react-query';
import type { 
  TeamMemberWorkload, 
  WorkloadSummary, 
  WorkloadHealth, 
  WorkloadAlert,
  WorkloadFilters 
} from '@/types/workload.types';

// Mock team data
const MOCK_TEAM: TeamMemberWorkload[] = [
  {
    id: '1',
    name: 'Ahmed Al-Rashid',
    email: 'ahmed@company.com',
    initials: 'AR',
    totalAssigned: 25,
    pending: 10,
    inProgress: 8,
    completed: 5,
    needsAttention: 2,
    totalEstimatedMinutes: 750,
    dailyCapacity: 8,
    availableHoursToday: 6,
    utilization: 125,
    isAvailable: true,
    cycleBreakdown: [
      { cycleId: '1', cycleName: 'Regression R2.1', testCount: 15, status: 'active' },
      { cycleId: '2', cycleName: 'Smoke Tests', testCount: 10, status: 'active' },
    ],
  },
  {
    id: '2',
    name: 'Sara Mohammed',
    email: 'sara@company.com',
    initials: 'SM',
    totalAssigned: 18,
    pending: 8,
    inProgress: 5,
    completed: 5,
    needsAttention: 0,
    totalEstimatedMinutes: 540,
    dailyCapacity: 8,
    availableHoursToday: 8,
    utilization: 90,
    isAvailable: true,
    cycleBreakdown: [
      { cycleId: '1', cycleName: 'Regression R2.1', testCount: 12, status: 'active' },
      { cycleId: '3', cycleName: 'UAT Cycle', testCount: 6, status: 'active' },
    ],
  },
  {
    id: '3',
    name: 'Omar Hassan',
    email: 'omar@company.com',
    initials: 'OH',
    totalAssigned: 12,
    pending: 6,
    inProgress: 4,
    completed: 2,
    needsAttention: 0,
    totalEstimatedMinutes: 360,
    dailyCapacity: 8,
    availableHoursToday: 4,
    utilization: 60,
    isAvailable: true,
    cycleBreakdown: [
      { cycleId: '1', cycleName: 'Regression R2.1', testCount: 8, status: 'active' },
      { cycleId: '2', cycleName: 'Smoke Tests', testCount: 4, status: 'active' },
    ],
  },
  {
    id: '4',
    name: 'Fatima Ali',
    email: 'fatima@company.com',
    initials: 'FA',
    totalAssigned: 8,
    pending: 4,
    inProgress: 2,
    completed: 2,
    needsAttention: 0,
    totalEstimatedMinutes: 240,
    dailyCapacity: 8,
    availableHoursToday: 8,
    utilization: 40,
    isAvailable: true,
    cycleBreakdown: [
      { cycleId: '3', cycleName: 'UAT Cycle', testCount: 8, status: 'active' },
    ],
  },
  {
    id: '5',
    name: 'Khalid Ibrahim',
    email: 'khalid@company.com',
    initials: 'KI',
    totalAssigned: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    needsAttention: 0,
    totalEstimatedMinutes: 0,
    dailyCapacity: 8,
    availableHoursToday: 0,
    utilization: 0,
    isAvailable: false,
    cycleBreakdown: [],
  },
];

function generateAlerts(members: TeamMemberWorkload[]): WorkloadAlert[] {
  const alerts: WorkloadAlert[] = [];
  
  members.forEach(member => {
    // Overloaded alert
    if (member.utilization > 100) {
      alerts.push({
        id: `overload-${member.id}`,
        type: 'overloaded',
        severity: 'danger',
        memberId: member.id,
        memberName: member.name,
        message: `${member.name} has ${member.totalAssigned - member.dailyCapacity * 2.5} tests over capacity`,
        count: Math.round(member.totalAssigned - member.dailyCapacity * 2.5),
        actionLabel: 'Reassign',
      });
    }
    
    // Underutilized alert
    if (member.utilization < 50 && member.isAvailable) {
      alerts.push({
        id: `underutil-${member.id}`,
        type: 'underutilized',
        severity: 'warning',
        memberId: member.id,
        memberName: member.name,
        message: `${member.name} could take ${Math.round((100 - member.utilization) / 5)} more tests`,
        count: Math.round((100 - member.utilization) / 5),
        actionLabel: 'Assign More',
      });
    }
    
    // Availability gap
    if (!member.isAvailable && member.totalAssigned > 0) {
      alerts.push({
        id: `avail-${member.id}`,
        type: 'availability_gap',
        severity: 'warning',
        memberId: member.id,
        memberName: member.name,
        message: `${member.name} unavailable today, has ${member.pending} pending tests`,
        count: member.pending,
        actionLabel: 'Reassign',
      });
    }
  });
  
  // Deadline risk
  const atRisk = members.reduce((sum, m) => sum + m.needsAttention, 0);
  if (atRisk > 0) {
    alerts.push({
      id: 'deadline-risk',
      type: 'deadline_risk',
      severity: 'danger',
      memberId: '',
      memberName: '',
      message: `${atRisk} tests due tomorrow with no progress`,
      count: atRisk,
      actionLabel: 'View Tests',
    });
  }
  
  return alerts;
}

function calculateHealth(members: TeamMemberWorkload[]): WorkloadHealth {
  const overloadedCount = members.filter(m => m.utilization > 100).length;
  const underutilizedCount = members.filter(m => m.utilization < 50 && m.isAvailable).length;
  
  // Calculate imbalance score (standard deviation)
  const utilizations = members.filter(m => m.isAvailable).map(m => m.utilization);
  const avg = utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
  const variance = utilizations.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / utilizations.length;
  const stdDev = Math.sqrt(variance);
  const imbalanceScore = Math.min(100, stdDev);
  
  let status: WorkloadHealth['status'];
  const suggestions: string[] = [];
  
  if (overloadedCount >= 3) {
    status = 'critical';
    suggestions.push('Multiple team members are overloaded. Consider reassigning tests.');
  } else if (overloadedCount >= 1) {
    status = 'warning';
    suggestions.push(`${overloadedCount} member(s) are over capacity.`);
  } else if (underutilizedCount > members.length / 2) {
    status = 'warning';
    suggestions.push('Many team members are underutilized. Consider adding more tests.');
  } else if (overloadedCount === 0 && underutilizedCount === 0) {
    status = 'excellent';
    suggestions.push('Workload is well-balanced across the team.');
  } else {
    status = 'good';
    suggestions.push('Overall workload distribution is healthy.');
  }
  
  return { status, overloadedCount, underutilizedCount, imbalanceScore, suggestions };
}

export function useTeamWorkload(teamId: string, filters?: WorkloadFilters) {
  return useQuery({
    queryKey: ['team-workload', teamId, filters],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Apply filters to mock data
      let members = [...MOCK_TEAM];
      
      if (filters?.memberId) {
        members = members.filter(m => m.id === filters.memberId);
      }
      
      // Calculate summary
      const availableMembers = members.filter(m => m.isAvailable);
      const summary: WorkloadSummary = {
        totalMembers: members.length,
        availableToday: availableMembers.length,
        totalTestsAssigned: members.reduce((sum, m) => sum + m.totalAssigned, 0),
        totalPending: members.reduce((sum, m) => sum + m.pending, 0),
        totalInProgress: members.reduce((sum, m) => sum + m.inProgress, 0),
        totalCompleted: members.reduce((sum, m) => sum + m.completed, 0),
        atRiskCount: members.reduce((sum, m) => sum + m.needsAttention, 0),
        overallUtilization: Math.round(
          availableMembers.reduce((sum, m) => sum + m.utilization, 0) / Math.max(availableMembers.length, 1)
        ),
      };
      
      const health = calculateHealth(members);
      const alerts = generateAlerts(members);
      
      return { members, summary, health, alerts };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
