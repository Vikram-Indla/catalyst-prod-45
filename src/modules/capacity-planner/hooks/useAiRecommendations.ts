import { useMemo } from 'react';
import type { AiRecommendation, ResourceMetric, CapacityProject } from '../types';

interface UseAiRecommendationsProps {
  resources: ResourceMetric[];
  projects: CapacityProject[];
}

export function useAiRecommendations({ resources, projects }: UseAiRecommendationsProps) {
  const recommendations = useMemo(() => {
    return generateAiRecommendations(resources, projects);
  }, [resources, projects]);

  const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
  const totalCount = recommendations.length;

  return {
    recommendations,
    highPriorityCount,
    totalCount,
  };
}

function generateAiRecommendations(
  resources: ResourceMetric[],
  _projects: CapacityProject[]
): AiRecommendation[] {
  const recommendations: AiRecommendation[] = [];

  // Find over-allocated resources
  const overAllocated = resources.filter((r) => r.allocation > 100);
  const underAllocated = resources.filter((r) => r.allocation < 50 && r.allocation > 0);
  const available = resources.filter((r) => r.allocation === 0);

  overAllocated.forEach((resource) => {
    const excess = resource.allocation - 100;
    const availableResource = [...underAllocated, ...available].find(
      (r) => 100 - r.allocation >= excess
    );

    if (availableResource) {
      recommendations.push({
        id: `rebalance-${resource.id}`,
        type: 'rebalance',
        priority: excess > 30 ? 'high' : 'medium',
        title: `Rebalance ${resource.name}`,
        description: `${resource.name} is at ${resource.allocation}% allocation. Consider moving ${excess}% workload to ${availableResource.name} who has ${100 - availableResource.allocation}% capacity available.`,
        affected_resources: [resource.id, availableResource.id],
        suggested_action: {
          from_resource: resource.id,
          to_resource: availableResource.id,
          percentage: excess,
        },
      });
    } else {
      recommendations.push({
        id: `alert-${resource.id}`,
        type: 'alert',
        priority: 'high',
        title: `Critical: ${resource.name} overloaded`,
        description: `${resource.name} is at ${resource.allocation}% with no available resources to redistribute. Consider hiring or delaying projects.`,
        affected_resources: [resource.id],
      });
    }
  });

  // Suggest hiring if average utilization is high
  const avgUtilization =
    resources.length > 0
      ? resources.reduce((sum, r) => sum + r.allocation, 0) / resources.length
      : 0;
      
  if (avgUtilization > 85 && available.length < 2) {
    recommendations.push({
      id: 'hire-suggestion',
      type: 'hire',
      priority: 'medium',
      title: 'Consider expanding team',
      description: `Team average utilization is ${Math.round(avgUtilization)}% with only ${available.length} resources fully available. Consider hiring to increase capacity buffer.`,
      affected_resources: [],
    });
  }

  // Suggest reassignment for unbalanced workloads
  if (underAllocated.length > 3 && overAllocated.length === 0) {
    recommendations.push({
      id: 'reassign-suggestion',
      type: 'reassign',
      priority: 'low',
      title: 'Optimize resource allocation',
      description: `${underAllocated.length} resources are below 50% utilization. Consider consolidating work to free up capacity for new initiatives.`,
      affected_resources: underAllocated.map(r => r.id),
    });
  }

  return recommendations;
}

export function applyRecommendation(
  recommendation: AiRecommendation,
  currentAssignments: { user_id: string; allocation_percentage: number }[]
): { user_id: string; allocation_percentage: number }[] {
  if (recommendation.type !== 'rebalance' || !recommendation.suggested_action) {
    return currentAssignments;
  }

  const action = recommendation.suggested_action as {
    from_resource: string;
    to_resource: string;
    percentage: number;
  };

  return currentAssignments.map((a) => {
    if (a.user_id === action.from_resource) {
      return {
        ...a,
        allocation_percentage: Math.max(0, a.allocation_percentage - action.percentage),
      };
    }
    return a;
  });
}
