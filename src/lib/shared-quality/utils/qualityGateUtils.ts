/**
 * Shared Quality Gate Utilities — Pure evaluation functions
 */

import type { QualityGate } from '@/hooks/releases/useReleaseQualityGates';

/** Evaluate a single gate against its threshold */
export function evaluateGate(gate: QualityGate): boolean {
  if (gate.current_value === null) return false;
  if (gate.status === 'waived') return true;

  const { current_value, threshold_value, threshold_operator } = gate;

  switch (threshold_operator) {
    case '>=': return current_value >= threshold_value;
    case '<=': return current_value <= threshold_value;
    case '>': return current_value > threshold_value;
    case '<': return current_value < threshold_value;
    case '=': return current_value === threshold_value;
    default: return false;
  }
}

/** Get gate status color */
export function getGateStatusColor(status: string | null): string {
  switch (status) {
    case 'passed': return 'text-green-600';
    case 'failed': return 'text-red-600';
    case 'waived': return 'text-amber-600';
    case 'pending':
    default: return 'text-muted-foreground';
  }
}

/** Calculate overall gate pass summary */
export function summarizeGates(gates: QualityGate[]) {
  const total = gates.length;
  const passed = gates.filter(g => g.status === 'passed' || g.status === 'waived').length;
  const failed = gates.filter(g => g.status === 'failed').length;
  const pending = gates.filter(g => !g.status || g.status === 'pending').length;
  const blocking = gates.filter(g => g.is_blocking);
  const blockingPassed = blocking.filter(g => g.status === 'passed' || g.status === 'waived').length;

  return {
    total,
    passed,
    failed,
    pending,
    blockingTotal: blocking.length,
    blockingPassed,
    allBlockingPassed: blockingPassed === blocking.length,
    passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
  };
}
