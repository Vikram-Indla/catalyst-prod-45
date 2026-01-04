/**
 * Catalyst V5 Capacity Heatmap Utilities
 * Core utility functions for heatmap calculations and styling
 */

import { 
  CATALYST_COLORS, 
  UtilizationStatus, 
  HealthStatus,
  HeatmapResource,
  MonthlyUtilization 
} from '@/types/capacity-heatmap';

export function getUtilizationStatus(percentage: number): UtilizationStatus {
  if (percentage === 0) return 'available';
  if (percentage <= 40) return 'light';
  if (percentage <= 70) return 'moderate';
  if (percentage <= 85) return 'optimal';
  if (percentage <= 100) return 'at-capacity';
  return 'over-allocated';
}

export function getUtilizationColor(percentage: number, mode: 'standard' | 'thermal' = 'standard') {
  // Catalyst V5 brand colors - LIGHTER, SOFTER scale (avoiding visual screaming):
  // 0% Available = Light teal/mint (available for booking)
  // 1-40% Light = Very light emerald
  // 41-70% Moderate = Light sky blue
  // 71-85% Optimal = Light blue
  // 86-100% At Capacity = Medium blue (not too dark)
  // >100% Over-allocated = Light amber/orange
  
  if (mode === 'thermal') {
    if (percentage === 0) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', pulse: false };  // Emerald transparent
    if (percentage <= 40) return { bg: '#d1fae5', text: '#047857', pulse: false };  // emerald-100
    if (percentage <= 70) return { bg: '#e0f2fe', text: '#0369a1', pulse: false };  // sky-100
    if (percentage <= 85) return { bg: '#bfdbfe', text: '#1d4ed8', pulse: false };  // blue-200
    if (percentage <= 100) return { bg: '#93c5fd', text: '#1e40af', pulse: false }; // blue-300
    return { bg: '#fde68a', text: '#b45309', pulse: true };  // amber-200 (warning, not danger)
  }
  
  // Standard mode - Lighter, softer colors
  if (percentage === 0) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', pulse: false };  // Light mint - Available
  if (percentage <= 40) return { bg: '#d1fae5', text: '#047857', pulse: false };  // emerald-100 - Light
  if (percentage <= 70) return { bg: '#e0f2fe', text: '#0369a1', pulse: false };  // sky-100 - Moderate
  if (percentage <= 85) return { bg: '#bfdbfe', text: '#1d4ed8', pulse: false };  // blue-200 - Optimal
  if (percentage <= 100) return { bg: '#93c5fd', text: '#1e40af', pulse: false }; // blue-300 - At Capacity
  return { bg: '#fde68a', text: '#b45309', pulse: true };  // amber-200 - Over-allocated
}

export function getHealthStatus(utilization: number, conflictCount: number): HealthStatus {
  if (conflictCount > 0 || utilization > 95) return 'critical';
  if (utilization > 85) return 'stressed';
  if (utilization > 50) return 'healthy';
  return 'underutilized';
}

export function getHealthGradient(status: HealthStatus): string {
  const gradients = {
    critical: `linear-gradient(135deg, ${CATALYST_COLORS.danger} 0%, ${CATALYST_COLORS.dangerDark} 100%)`,
    stressed: `linear-gradient(135deg, ${CATALYST_COLORS.warning} 0%, ${CATALYST_COLORS.warningDark} 100%)`,
    healthy: `linear-gradient(135deg, ${CATALYST_COLORS.teal} 0%, ${CATALYST_COLORS.tealDark} 100%)`,
    underutilized: `linear-gradient(135deg, ${CATALYST_COLORS.primary} 0%, ${CATALYST_COLORS.primaryDark} 100%)`,
  };
  return gradients[status];
}

export function getHealthColor(status: HealthStatus): string {
  const colors = {
    critical: CATALYST_COLORS.danger,
    stressed: CATALYST_COLORS.warning,
    healthy: CATALYST_COLORS.teal,
    underutilized: CATALYST_COLORS.primary,
  };
  return colors[status];
}

export function getPulseRate(status: HealthStatus): number {
  const rates = { critical: 2, stressed: 1.5, healthy: 1, underutilized: 0.7 };
  return rates[status];
}

export function formatMonth(date: Date, format: 'short' | 'long' = 'short'): string {
  return date.toLocaleDateString('en-US', { 
    month: format === 'short' ? 'short' : 'long',
    year: format === 'long' ? 'numeric' : undefined 
  });
}

export function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

export function getPatternForStatus(status: UtilizationStatus): string {
  const patterns: Record<UtilizationStatus, string> = {
    'available': 'pattern-dots',
    'light': 'pattern-diagonal-sm',
    'moderate': 'pattern-diagonal',
    'optimal': 'pattern-grid',
    'at-capacity': 'pattern-cross',
    'over-allocated': 'pattern-warning',
  };
  return patterns[status];
}

export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
}

export function getTrendColor(trend: 'up' | 'down' | 'stable', context: 'utilization' | 'availability'): string {
  if (trend === 'stable') return CATALYST_COLORS.primary;
  
  // For utilization, up is concerning, down is good
  // For availability, up is good, down is concerning
  if (context === 'utilization') {
    return trend === 'up' ? CATALYST_COLORS.warning : CATALYST_COLORS.teal;
  }
  return trend === 'up' ? CATALYST_COLORS.teal : CATALYST_COLORS.warning;
}

// Generate test data for development
export function generateTestData(monthCount = 12): { resources: HeatmapResource[]; months: Date[] } {
  const today = new Date();
  const months = Array.from({ length: monthCount }, (_, i) => 
    new Date(today.getFullYear(), today.getMonth() + i, 1)
  );
  
  const templates = [
    { name: 'Ahmed Yousry', role: 'Senior Developer', dept: 'Frontend', team: 'Core',
      util: [100, 130, 120, 100, 80, 60, 50, 40, 30, 20, 20, 20] },
    { name: 'Sikander Ahmad', role: 'Developer', dept: 'Frontend', team: 'Core',
      util: [80, 140, 130, 110, 90, 70, 60, 50, 40, 30, 30, 30] },
    { name: 'Hasan Elsherby', role: 'Developer', dept: 'Frontend', team: 'Platform',
      util: [90, 95, 100, 115, 100, 95, 90, 85, 80, 75, 70, 65] },
    { name: 'Arslan Malik', role: 'Developer', dept: 'Frontend', team: 'Core',
      util: [100, 100, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55] },
    { name: 'Dreni Djini', role: 'Developer', dept: 'Backend', team: 'API',
      util: [70, 75, 80, 60, 50, 40, 35, 30, 40, 50, 60, 70] },
    { name: 'Ayaz Muhammad', role: 'Developer', dept: 'Backend', team: 'API',
      util: [85, 90, 85, 80, 75, 70, 65, 60, 55, 60, 65, 70] },
    { name: 'Divyam Kshatriya', role: 'Developer', dept: 'Backend', team: 'Data',
      util: [60, 65, 70, 65, 60, 55, 50, 45, 50, 55, 60, 65] },
    { name: 'Aya Ibrahim', role: 'QA Engineer', dept: 'QA', team: 'Testing',
      util: [40, 45, 50, 55, 50, 45, 40, 35, 30, 25, 20, 20] },
    { name: 'Mahmoud Gameel', role: 'QA Engineer', dept: 'QA', team: 'Testing',
      util: [35, 40, 45, 40, 35, 30, 25, 20, 25, 30, 35, 40] },
    { name: 'Imran Aslam', role: 'DevOps Engineer', dept: 'Infrastructure', team: 'Platform',
      util: [0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
    { name: 'Maaz Majid', role: 'DevOps Engineer', dept: 'Infrastructure', team: 'Platform',
      util: [20, 10, 0, 0, 0, 10, 20, 30, 40, 50, 60, 70] },
    { name: 'Faisal Javed', role: 'Product Owner', dept: 'Product', team: 'Core',
      util: [60, 65, 70, 65, 60, 55, 50, 45, 50, 55, 60, 65] },
  ];
  
  const projectColors = [CATALYST_COLORS.primary, CATALYST_COLORS.teal, '#7c3aed', '#ea580c', CATALYST_COLORS.danger];
  const projectNames = ['Innovation Platform', 'Data Platform', 'Senaei BAU', 'Inspection Project', 'Security Audit'];
  
  const resources: HeatmapResource[] = templates.map((t, idx) => {
    const monthlyUtilization: MonthlyUtilization[] = t.util.slice(0, monthCount).map((pct, i) => {
      const allocations = [];
      let remaining = pct;
      let ai = 0;
      while (remaining > 0 && ai < 3) {
        const ap = Math.min(remaining, Math.floor(Math.random() * 40) + 20);
        allocations.push({
          id: `alloc-${idx}-${i}-${ai}`,
          projectId: `proj-${ai}`,
          projectName: projectNames[ai % 5],
          projectColor: projectColors[ai % 5],
          percentage: ap,
          startDate: months[i].toISOString(),
          endDate: months[Math.min(i + 2, monthCount - 1)].toISOString(),
        });
        remaining -= ap;
        ai++;
      }
      if (allocations.length > 0) {
        const total = allocations.reduce((s, a) => s + a.percentage, 0);
        allocations[0].percentage += pct - total;
      }
      return {
        month: months[i],
        percentage: pct,
        status: getUtilizationStatus(pct),
        allocations,
        isConflict: pct > 100,
        previousPeriodPercentage: i > 0 ? t.util[i - 1] : undefined,
      };
    });
    
    const avg = Math.round(monthlyUtilization.reduce((s, u) => s + u.percentage, 0) / monthlyUtilization.length);
    const conflicts = monthlyUtilization.filter(u => u.isConflict).length;
    
    return {
      id: `res-${idx}`,
      name: t.name,
      initials: t.name.split(' ').map(n => n[0]).join(''),
      email: `${t.name.toLowerCase().replace(' ', '.')}@catalyst.sa`,
      role: t.role,
      department: t.dept,
      team: t.team,
      monthlyUtilization,
      averageUtilization: avg,
      trend: avg > 70 ? 'down' : avg < 40 ? 'up' : 'stable',
      trendPercentage: Math.floor(Math.random() * 15),
      hasConflicts: conflicts > 0,
      conflictCount: conflicts,
    };
  });
  
  return { resources, months };
}

export function calculateOrgStats(resources: HeatmapResource[]) {
  const totalResources = resources.length;
  const totalUtilization = resources.reduce((sum, r) => sum + r.averageUtilization, 0);
  const overallUtilization = totalResources > 0 ? Math.round(totalUtilization / totalResources) : 0;
  
  const conflicts = resources.flatMap(r => 
    r.monthlyUtilization
      .filter(u => u.isConflict)
      .map(u => ({
        id: `${r.id}-${u.month.getTime()}`,
        resourceId: r.id,
        resourceName: r.name,
        month: u.month,
        percentage: u.percentage,
        overBy: u.percentage - 100,
      }))
  );
  
  const healthStatus = getHealthStatus(overallUtilization, conflicts.length);
  
  const trendValue: 'up' | 'down' | 'stable' = overallUtilization > 75 ? 'up' : overallUtilization < 50 ? 'down' : 'stable';
  
  return {
    overallUtilization,
    trend: trendValue,
    trendPercentage: 5,
    conflictCount: conflicts.length,
    conflicts,
    availableCapacity: Math.max(0, (100 - overallUtilization) * totalResources),
    totalResources,
    healthStatus,
    pulseRate: getPulseRate(healthStatus),
  };
}
