/**
 * Go/No-Go Dashboard Types
 * Module 5B-2: Release decision management
 */

// Go/No-Go decision status
export type GoNoGoDecision = 'go' | 'no_go' | 'conditional' | 'pending';

// Gate status for visual display
export interface GateStatus {
  id: string;
  name: string;
  type: string;
  threshold: string;
  actualValue: number;
  passed: boolean;
  isBlocking: boolean;
  trend?: 'improving' | 'declining' | 'stable';
}

// Go/No-Go summary
export interface GoNoGoSummary {
  decision: GoNoGoDecision;
  confidence: number; // 0-100
  blockingGatesPassed: number;
  blockingGatesTotal: number;
  nonBlockingGatesPassed: number;
  nonBlockingGatesTotal: number;
  riskFactors: RiskFactor[];
  recommendation: string;
}

// Risk factors that influence the decision
export interface RiskFactor {
  id: string;
  category: 'quality' | 'defects' | 'coverage' | 'timeline' | 'resources';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation?: string;
}

// Stakeholder sign-off
export interface StakeholderSignoff {
  id: string;
  stakeholderId: string;
  stakeholderName: string;
  stakeholderRole: string;
  decision: 'approve' | 'reject' | 'abstain' | 'pending';
  comments?: string;
  signedAt?: string;
}

// Full Go/No-Go assessment
export interface GoNoGoAssessment {
  releaseId: string;
  releaseName: string;
  assessmentDate: string;
  summary: GoNoGoSummary;
  gates: GateStatus[];
  signoffs: StakeholderSignoff[];
  testMetrics: {
    executionRate: number;
    passRate: number;
    automationRate: number;
  };
  defectMetrics: {
    openBlockers: number;
    openCriticals: number;
    openMajors: number;
    totalOpen: number;
  };
  previousAssessments: {
    date: string;
    decision: GoNoGoDecision;
    summary: string;
  }[];
}

// Decision history entry
export interface DecisionHistoryEntry {
  id: string;
  releaseId: string;
  decision: GoNoGoDecision;
  decidedBy: string;
  decidedByName: string;
  decidedAt: string;
  rationale: string;
  overrideReason?: string;
  snapshotData: GoNoGoSummary;
}

// Configuration for decision thresholds
export const DECISION_THRESHOLDS = {
  go: {
    minBlockingGatesPct: 100,
    minConfidence: 80,
    maxOpenBlockers: 0,
    maxOpenCriticals: 2,
  },
  conditional: {
    minBlockingGatesPct: 80,
    minConfidence: 60,
    maxOpenBlockers: 1,
    maxOpenCriticals: 5,
  },
};

// Visual styling configuration
export const DECISION_CONFIG: Record<GoNoGoDecision, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  go: {
    label: 'GO',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    icon: 'CheckCircle2',
  },
  no_go: {
    label: 'NO-GO',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    icon: 'XCircle',
  },
  conditional: {
    label: 'CONDITIONAL',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    icon: 'AlertTriangle',
  },
  pending: {
    label: 'PENDING',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: 'Clock',
  },
};

export const RISK_SEVERITY_CONFIG: Record<RiskFactor['severity'], {
  color: string;
  bgColor: string;
  label: string;
}> = {
  low: { color: 'text-blue-700', bgColor: 'bg-blue-50', label: 'Low' },
  medium: { color: 'text-amber-700', bgColor: 'bg-amber-50', label: 'Medium' },
  high: { color: 'text-orange-700', bgColor: 'bg-orange-50', label: 'High' },
  critical: { color: 'text-red-700', bgColor: 'bg-red-50', label: 'Critical' },
};
