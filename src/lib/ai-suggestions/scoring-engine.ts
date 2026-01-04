/**
 * Prompt 10: AI Scoring Engine
 * Calculates resource fit based on availability, skills, experience
 */

import { eachDayOfInterval, isWithinInterval, addDays } from 'date-fns';
import type { 
  ResourceSuggestion, 
  SuggestionReason, 
  SuggestionWarning, 
  DemandRequest,
  SuggestionResource 
} from '@/types/ai-suggestions';

interface ResourceAllocation {
  profile_id?: string;
  assignment_name?: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
}

export function calculateResourceScore(
  resource: SuggestionResource,
  demand: DemandRequest,
  allResources: SuggestionResource[],
  allocations: ResourceAllocation[]
): ResourceSuggestion {
  const reasons: SuggestionReason[] = [];
  const warnings: SuggestionWarning[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // 1. AVAILABILITY SCORE (weight: 40%)
  const availabilityInPeriod = calculateAvailabilityInPeriod(
    resource.id,
    demand.startDate,
    demand.endDate,
    allocations
  );

  const availabilityScore = Math.min(100, (availabilityInPeriod / demand.percentageNeeded) * 100);
  totalScore += availabilityScore * 0.4;
  totalWeight += 0.4;

  if (availabilityInPeriod >= demand.percentageNeeded) {
    reasons.push({
      type: 'availability',
      description: `${availabilityInPeriod}% available in requested period`,
      weight: 40,
    });
  } else if (availabilityInPeriod > 0) {
    reasons.push({
      type: 'availability',
      description: `${availabilityInPeriod}% available (${demand.percentageNeeded - availabilityInPeriod}% short)`,
      weight: 20,
    });
    warnings.push({
      type: 'partial_availability',
      description: `Only ${availabilityInPeriod}% available, need ${demand.percentageNeeded}%`,
      severity: 'medium',
      resolution: `Could reduce existing allocation or split across multiple resources`,
    });
  } else {
    warnings.push({
      type: 'partial_availability',
      description: `No availability in requested period`,
      severity: 'high',
    });
  }

  // 2. ROLE MATCH (weight: 25%)
  if (resource.role?.toLowerCase() === demand.role.toLowerCase()) {
    totalScore += 100 * 0.25;
    reasons.push({
      type: 'skills',
      description: `Exact role match: ${resource.role}`,
      weight: 25,
    });
  } else if (isRoleCompatible(resource.role || '', demand.role)) {
    totalScore += 70 * 0.25;
    reasons.push({
      type: 'skills',
      description: `Compatible role: ${resource.role}`,
      weight: 17,
    });
  }
  totalWeight += 0.25;

  // 3. SKILLS MATCH (weight: 20%)
  if (demand.skills && demand.skills.length > 0 && resource.skills) {
    const matchedSkills = demand.skills.filter(s => 
      resource.skills?.some(rs => rs.toLowerCase().includes(s.toLowerCase()))
    );
    const skillScore = (matchedSkills.length / demand.skills.length) * 100;
    totalScore += skillScore * 0.2;

    if (matchedSkills.length > 0) {
      reasons.push({
        type: 'skills',
        description: `Skills match: ${matchedSkills.join(', ')}`,
        weight: Math.round(skillScore * 0.2),
      });
    }

    const missingSkills = demand.skills.filter(s => 
      !resource.skills?.some(rs => rs.toLowerCase().includes(s.toLowerCase()))
    );
    if (missingSkills.length > 0) {
      warnings.push({
        type: 'skill_gap',
        description: `Missing skills: ${missingSkills.join(', ')}`,
        severity: missingSkills.length > demand.skills.length / 2 ? 'medium' : 'low',
      });
    }
    totalWeight += 0.2;
  }

  // 4. WORKLOAD BALANCE (weight: 15%)
  const currentUtilization = resource.allocation || 0;
  const sameRoleResources = allResources.filter(r => r.role === resource.role);
  const teamAvgUtilization = sameRoleResources.length > 0
    ? sameRoleResources.reduce((sum, r) => sum + (r.allocation || 0), 0) / sameRoleResources.length
    : 50;

  if (currentUtilization < teamAvgUtilization) {
    totalScore += 100 * 0.15;
    reasons.push({
      type: 'workload_balance',
      description: `Below team average utilization (${currentUtilization}% vs ${Math.round(teamAvgUtilization)}% avg)`,
      weight: 15,
    });
  } else if (currentUtilization > 90) {
    warnings.push({
      type: 'overallocation_risk',
      description: `Already at ${currentUtilization}% allocation`,
      severity: currentUtilization > 100 ? 'high' : 'medium',
    });
  }
  totalWeight += 0.15;

  // Calculate final score
  const matchScore = Math.round(totalScore / totalWeight);

  return {
    resource,
    matchScore,
    reasons: reasons.sort((a, b) => b.weight - a.weight),
    warnings: warnings.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    availabilityInPeriod,
  };
}

export function findBestMatches(
  demand: DemandRequest,
  resources: SuggestionResource[],
  allocations: ResourceAllocation[],
  limit = 5
): ResourceSuggestion[] {
  // Filter out excluded resources
  const eligibleResources = resources.filter(r =>
    !demand.excludedResources?.includes(r.id)
  );

  // Score all resources
  const scored = eligibleResources.map(r =>
    calculateResourceScore(r, demand, resources, allocations)
  );

  // Sort by score, then by availability
  return scored
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return b.availabilityInPeriod - a.availabilityInPeriod;
    })
    .slice(0, limit);
}

// Helper functions
function calculateAvailabilityInPeriod(
  resourceId: string,
  start: Date,
  end: Date,
  allocations: ResourceAllocation[]
): number {
  const resourceAllocations = allocations.filter(a => a.profile_id === resourceId);
  
  // If no allocations, 100% available
  if (resourceAllocations.length === 0) return 100;

  const days = eachDayOfInterval({ start, end });
  const dailyAvailability = days.map(day => {
    let allocatedOnDay = 0;
    
    resourceAllocations.forEach(alloc => {
      const allocStart = new Date(alloc.start_date);
      const allocEnd = alloc.end_date ? new Date(alloc.end_date) : addDays(new Date(), 365);
      
      if (isWithinInterval(day, { start: allocStart, end: allocEnd })) {
        allocatedOnDay += alloc.allocation_percent;
      }
    });

    return Math.max(0, 100 - allocatedOnDay);
  });

  return Math.round(dailyAvailability.reduce((sum, a) => sum + a, 0) / dailyAvailability.length);
}

function isRoleCompatible(resourceRole: string, demandRole: string): boolean {
  const roleCompatibility: Record<string, string[]> = {
    'developer': ['senior developer', 'junior developer', 'full stack developer', 'frontend developer', 'backend developer'],
    'qa tester': ['senior qa', 'test engineer', 'quality analyst'],
    'product owner': ['product manager', 'business analyst'],
    'designer': ['ux designer', 'ui designer', 'product designer'],
    'tech lead': ['senior developer', 'architect', 'engineering manager'],
    'analyst': ['business analyst', 'systems analyst', 'data analyst'],
  };

  const normalizedResource = resourceRole.toLowerCase();
  const normalizedDemand = demandRole.toLowerCase();

  // Check direct compatibility
  for (const [key, compatibles] of Object.entries(roleCompatibility)) {
    if (normalizedDemand.includes(key) && compatibles.some(c => normalizedResource.includes(c))) {
      return true;
    }
    if (normalizedResource.includes(key) && compatibles.some(c => normalizedDemand.includes(c))) {
      return true;
    }
  }

  return false;
}
