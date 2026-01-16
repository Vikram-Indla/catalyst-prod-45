/**
 * All Releases Feature Types
 */

import { HealthLevel } from './utils/healthScore';

export type ReleaseStatus = 'planning' | 'in_progress' | 'testing' | 'staging' | 'released' | 'cancelled';

export interface ReleaseMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
  notRunTests: number;
  passRate: number;
  testCoverage: number;
  totalDefects: number;
  blockerDefects: number;
  criticalDefects: number;
  openDefects: number;
  totalGates: number;
  passingGates: number;
  failingGates: number;
  scopeItems: number;
  completedItems: number;
  scopeCreep: number;
}

export interface ReleaseSchedule {
  status: 'on_track' | 'at_risk' | 'delayed';
  daysRemaining: number;
  daysOverdue?: number;
}

export interface ReleaseOwner {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface Release {
  id: string;
  version: string;
  name: string;
  description?: string;
  status: ReleaseStatus;
  plannedDate: string;
  actualDate?: string;
  healthScore: number;
  healthLevel: HealthLevel;
  metrics: ReleaseMetrics;
  schedule: ReleaseSchedule;
  releaseManager?: ReleaseOwner;
  qaLead?: ReleaseOwner;
}

export interface ReleaseSummary {
  total: number;
  byStatus: {
    planning: number;
    in_progress: number;
    testing: number;
    staging: number;
    released: number;
    cancelled: number;
  };
  byHealth: {
    healthy: number;
    attention: number;
    at_risk: number;
    critical: number;
  };
  atRiskReleases: Release[];
}

export interface AIReleaseInsight {
  releaseId: string;
  releaseName: string;
  type: 'critical' | 'warning' | 'positive';
  message: string;
  action: string;
}

export type ViewMode = 'cards' | 'timeline' | 'table';

export interface ReleasesFilter {
  status: ReleaseStatus[];
  health: HealthLevel[];
  quarter: string;
  search: string;
}
