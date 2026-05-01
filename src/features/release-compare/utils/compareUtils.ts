/**
 * Release Compare Utilities
 * Winner calculation and insight generation
 */

import { ComparedRelease, ComparisonInsight, CompareHealthLevel } from '../types';

// Catalyst V5 Colors
export const CATALYST_COLORS = {
  primary: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  teal: '#0d9488',
  warning: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))',
  danger: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',
  aiPurpleStart: '#8b5cf6',
  aiPurpleEnd: '#6366f1',
  gray50: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f8fafc))',
  gray100: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f1f5f9))',
  gray200: 'var(--ds-border, var(--ds-border, #e2e8f0))',
  gray300: 'var(--ds-text-disabled, var(--ds-text-disabled, #cbd5e1))',
  gray400: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))',
  gray500: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
  gray600: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))',
  gray700: 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))',
  gray800: '#1e293b',
  gray900: 'var(--ds-text, var(--ds-text, #0f172a))',
};

export function getHealthColor(level: CompareHealthLevel): string {
  switch (level) {
    case 'healthy': return CATALYST_COLORS.teal;
    case 'attention': return CATALYST_COLORS.warning;
    case 'at_risk': return CATALYST_COLORS.warning;
    case 'critical': return CATALYST_COLORS.danger;
    default: return CATALYST_COLORS.gray400;
  }
}

export function getHealthLabel(level: CompareHealthLevel): string {
  switch (level) {
    case 'healthy': return 'Healthy';
    case 'attention': return 'Attention';
    case 'at_risk': return 'At Risk';
    case 'critical': return 'Critical';
    default: return 'Unknown';
  }
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 85) return CATALYST_COLORS.teal;
  if (percentage >= 50) return CATALYST_COLORS.warning;
  return CATALYST_COLORS.danger;
}

type MetricValue = { releaseId: string; value: number };

export function determineWinner(metric: string, values: MetricValue[]): string | null {
  if (values.length === 0) return null;
  
  switch (metric) {
    case 'health_score':
    case 'pass_rate':
    case 'test_progress':
    case 'coverage':
    case 'gates_passing':
    case 'work_items_complete': {
      // Higher is better
      const max = Math.max(...values.map(v => v.value));
      const winner = values.find(v => v.value === max);
      return winner?.releaseId ?? null;
    }
      
    case 'open_defects':
    case 'blocker_defects':
    case 'failed_tests':
    case 'blocked_tests': {
      // Lower is better
      const min = Math.min(...values.map(v => v.value));
      const winner = values.find(v => v.value === min);
      return winner?.releaseId ?? null;
    }
      
    case 'days_remaining':
      // Context-dependent: flag risk only
      return null;
      
    default:
      return null;
  }
}

export function calculateWinners(releases: ComparedRelease[]): { [metric: string]: string } {
  const winners: { [metric: string]: string } = {};
  
  // Health Score
  const healthWinner = determineWinner('health_score', 
    releases.map(r => ({ releaseId: r.id, value: r.metrics.healthScore })));
  if (healthWinner) winners['health_score'] = healthWinner;
  
  // Test Progress
  const progressWinner = determineWinner('test_progress',
    releases.map(r => ({ releaseId: r.id, value: r.metrics.testProgress.percentage })));
  if (progressWinner) winners['test_progress'] = progressWinner;
  
  // Pass Rate
  const passRateWinner = determineWinner('pass_rate',
    releases.map(r => ({ releaseId: r.id, value: r.metrics.passRate.percentage })));
  if (passRateWinner) winners['pass_rate'] = passRateWinner;
  
  // Test Breakdown (fewer failed/blocked is better)
  const testBreakdownWinner = determineWinner('failed_tests',
    releases.map(r => ({ releaseId: r.id, value: r.metrics.testBreakdown.failed + r.metrics.testBreakdown.blocked })));
  if (testBreakdownWinner) winners['test_breakdown'] = testBreakdownWinner;
  
  // Defects (fewer total defects is better)
  const defectsWinner = determineWinner('open_defects',
    releases.map(r => ({ releaseId: r.id, value: r.metrics.defects.total })));
  if (defectsWinner) winners['defects'] = defectsWinner;
  
  // Quality Gates
  const gatesWinner = determineWinner('gates_passing',
    releases.map(r => ({ releaseId: r.id, value: r.metrics.qualityGates.passing })));
  if (gatesWinner) winners['quality_gates'] = gatesWinner;
  
  // Work Items Complete
  const workItemsWinner = determineWinner('work_items_complete',
    releases.map(r => ({ releaseId: r.id, value: r.metrics.workItems.complete })));
  if (workItemsWinner) winners['work_items'] = workItemsWinner;
  
  return winners;
}

export function generateInsights(releases: ComparedRelease[]): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];
  
  // Sort by health score to find healthiest
  const sorted = [...releases].sort((a, b) => b.metrics.healthScore - a.metrics.healthScore);
  
  // Check for significant health difference
  if (releases.length >= 2) {
    const healthiest = sorted[0];
    const least = sorted[sorted.length - 1];
    const diff = healthiest.metrics.healthScore - least.metrics.healthScore;
    
    if (diff >= 20) {
      insights.push({
        type: 'positive',
        releaseId: healthiest.id,
        releaseName: healthiest.version,
        message: `${healthiest.version} is significantly healthier than ${least.version} (${diff}% difference)`,
        metric: 'health_score'
      });
    }
  }
  
  // Check each release for issues
  for (const release of releases) {
    // Blocker defects
    if (release.metrics.defects.blocker > 0) {
      insights.push({
        type: 'critical',
        releaseId: release.id,
        releaseName: release.version,
        message: `${release.version} has ${release.metrics.defects.blocker} blocker defect${release.metrics.defects.blocker > 1 ? 's' : ''} blocking deployment`,
        metric: 'defects'
      });
    }
    
    // Pass rate below 80%
    if (release.metrics.passRate.percentage < 80) {
      insights.push({
        type: 'warning',
        releaseId: release.id,
        releaseName: release.version,
        message: `${release.version} pass rate is below 80% threshold (${release.metrics.passRate.percentage}%)`,
        metric: 'pass_rate'
      });
    }
    
    // Failing majority of gates
    if (release.metrics.qualityGates.passing < release.metrics.qualityGates.total * 0.5) {
      insights.push({
        type: 'critical',
        releaseId: release.id,
        releaseName: release.version,
        message: `${release.version} is failing majority of quality gates (${release.metrics.qualityGates.passing}/${release.metrics.qualityGates.total})`,
        metric: 'quality_gates'
      });
    }
    
    // Low test progress with tight deadline
    if (release.metrics.testProgress.percentage < 50 && release.daysRemaining < 14) {
      insights.push({
        type: 'warning',
        releaseId: release.id,
        releaseName: release.version,
        message: `${release.version} test progress critically low (${release.metrics.testProgress.percentage}%) with ${release.daysRemaining} days remaining`,
        metric: 'test_progress'
      });
    }
    
    // Ready for deployment
    const allGatesPassing = release.metrics.qualityGates.passing === release.metrics.qualityGates.total;
    if (release.metrics.healthScore >= 90 && allGatesPassing) {
      insights.push({
        type: 'positive',
        releaseId: release.id,
        releaseName: release.version,
        message: `${release.version} is ready for deployment consideration`,
        metric: 'health_score'
      });
    }
  }
  
  // All releases at risk
  if (releases.every(r => r.metrics.healthScore < 70)) {
    insights.push({
      type: 'warning',
      releaseId: 'all',
      releaseName: 'Portfolio',
      message: 'All compared releases are at risk — portfolio attention needed',
      metric: 'health_score'
    });
  }
  
  return insights;
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'planning': return 'Planning';
    case 'in_progress': return 'In Progress';
    case 'testing': return 'Testing';
    case 'staging': return 'Staging';
    case 'released': return 'Released';
    default: return status;
  }
}
