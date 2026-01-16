/**
 * Release Compare Feature Types
 * Based on RELEASE-COMPARE-SPEC-V5.md
 */

export type CompareReleaseStatus = 'planning' | 'in_progress' | 'testing' | 'staging' | 'released';
export type CompareHealthLevel = 'healthy' | 'attention' | 'at_risk' | 'critical';
export type InsightType = 'positive' | 'warning' | 'critical';

export interface ComparedRelease {
  id: string;
  version: string;
  name: string;
  status: CompareReleaseStatus;
  targetDate: string;
  daysRemaining: number;
  
  metrics: {
    healthScore: number;
    healthLevel: CompareHealthLevel;
    healthTrend: { value: number; direction: 'up' | 'down' | 'flat' };
    
    testProgress: {
      executed: number;
      total: number;
      percentage: number;
    };
    
    passRate: {
      passed: number;
      executed: number;
      percentage: number;
    };
    
    testBreakdown: {
      passed: number;
      failed: number;
      blocked: number;
      notRun: number;
    };
    
    defects: {
      blocker: number;
      critical: number;
      major: number;
      minor: number;
      total: number;
    };
    
    qualityGates: {
      passing: number;
      failing: number;
      pending: number;
      total: number;
    };
    
    workItems: {
      total: number;
      complete: number;
      inProgress: number;
    };
  };
}

export interface ComparisonInsight {
  type: InsightType;
  releaseId: string;
  releaseName: string;
  message: string;
  metric: string;
}

export interface ReleaseComparison {
  releases: ComparedRelease[];
  insights: ComparisonInsight[];
  winners: { [metric: string]: string }; // release ID
}

export interface ReleaseOption {
  id: string;
  version: string;
  name: string;
}
