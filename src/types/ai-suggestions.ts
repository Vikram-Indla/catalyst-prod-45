/**
 * Prompt 10: AI Smart Suggestions Types
 * Types for AI-powered resource suggestions
 */

export interface ResourceSuggestion {
  resource: SuggestionResource;
  matchScore: number; // 0-100
  reasons: SuggestionReason[];
  warnings: SuggestionWarning[];
  availabilityInPeriod: number; // % available
}

export interface SuggestionResource {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
  skills?: string[];
}

export interface SuggestionReason {
  type: 'availability' | 'skills' | 'experience' | 'team_fit' | 'workload_balance';
  description: string;
  weight: number;
}

export interface SuggestionWarning {
  type: 'partial_availability' | 'skill_gap' | 'overallocation_risk' | 'team_conflict';
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolution?: string;
}

export interface DemandRequest {
  projectId: string;
  projectName: string;
  role: string;
  skills?: string[];
  percentageNeeded: number;
  startDate: Date;
  endDate: Date;
  priority: 'low' | 'medium' | 'high';
  preferredResources?: string[];
  excludedResources?: string[];
}
