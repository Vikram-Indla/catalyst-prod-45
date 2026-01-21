/**
 * Release Readiness Report Types
 * Module 5B-4: Report generation and export
 */

// Report sections that can be included
export type ReportSection = 
  | 'summary'
  | 'quality_gates'
  | 'test_metrics'
  | 'defect_summary'
  | 'signoffs'
  | 'risk_factors'
  | 'execution_trend'
  | 'recommendations';

// Report format options
export type ReportFormat = 'pdf' | 'html' | 'json';

// Report configuration
export interface ReportConfig {
  sections: ReportSection[];
  includeCharts: boolean;
  includeHistory: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Complete report data structure
export interface ReadinessReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  qualityGates: ReportQualityGates;
  testMetrics: ReportTestMetrics;
  defectSummary: ReportDefectSummary;
  signoffs: ReportSignoffs;
  riskFactors: ReportRiskFactor[];
  executionTrend: ReportTrendPoint[];
  recommendations: string[];
}

export interface ReportMetadata {
  releaseId: string;
  releaseName: string;
  releaseVersion?: string;
  generatedAt: string;
  generatedBy?: string;
  reportId: string;
}

export interface ReportSummary {
  decision: 'go' | 'no_go' | 'conditional' | 'pending';
  confidence: number;
  healthScore: number;
  healthLevel: 'healthy' | 'attention' | 'at_risk' | 'critical';
  overallStatus: string;
  keyHighlights: string[];
}

export interface ReportQualityGates {
  totalGates: number;
  passedGates: number;
  failedGates: number;
  blockingPassed: number;
  blockingTotal: number;
  gates: Array<{
    name: string;
    type: string;
    threshold: string;
    actual: number;
    passed: boolean;
    isBlocking: boolean;
  }>;
}

export interface ReportTestMetrics {
  totalCases: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  executionRate: number;
  passRate: number;
  automationRate: number;
  cycleBreakdown: Array<{
    cycleName: string;
    status: string;
    total: number;
    passed: number;
    failed: number;
    executionRate: number;
  }>;
}

export interface ReportDefectSummary {
  totalOpen: number;
  blockers: number;
  criticals: number;
  majors: number;
  minors: number;
  resolvedThisRelease: number;
  newThisRelease: number;
  byStatus: Record<string, number>;
}

export interface ReportSignoffs {
  totalRequired: number;
  approved: number;
  pending: number;
  rejected: number;
  allRequiredComplete: boolean;
  stakeholders: Array<{
    name: string;
    role: string;
    decision: string;
    date?: string;
    comments?: string;
  }>;
}

export interface ReportRiskFactor {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation?: string;
}

export interface ReportTrendPoint {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
}

// Default report configuration
export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  sections: [
    'summary',
    'quality_gates',
    'test_metrics',
    'defect_summary',
    'signoffs',
    'risk_factors',
    'recommendations',
  ],
  includeCharts: true,
  includeHistory: false,
};

// Section display configuration
export const REPORT_SECTION_CONFIG: Record<ReportSection, {
  label: string;
  description: string;
  icon: string;
}> = {
  summary: {
    label: 'Executive Summary',
    description: 'High-level release status and decision',
    icon: 'FileText',
  },
  quality_gates: {
    label: 'Quality Gates',
    description: 'Gate evaluation results',
    icon: 'Shield',
  },
  test_metrics: {
    label: 'Test Metrics',
    description: 'Execution and pass rates',
    icon: 'BarChart3',
  },
  defect_summary: {
    label: 'Defect Summary',
    description: 'Open defects by severity',
    icon: 'Bug',
  },
  signoffs: {
    label: 'Stakeholder Sign-offs',
    description: 'Approval status',
    icon: 'Users',
  },
  risk_factors: {
    label: 'Risk Assessment',
    description: 'Identified risks and mitigations',
    icon: 'AlertTriangle',
  },
  execution_trend: {
    label: 'Execution Trend',
    description: 'Test execution over time',
    icon: 'TrendingUp',
  },
  recommendations: {
    label: 'Recommendations',
    description: 'Suggested actions',
    icon: 'Lightbulb',
  },
};
