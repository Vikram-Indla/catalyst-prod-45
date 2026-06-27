// All report formulas live here. No calculations in JSX.

export function passRate(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

export function passRateStr(passed: number, total: number): string {
  if (total === 0) return '—';
  return `${passRate(passed, total)}%`;
}

export function sharePercent(count: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((count / total) * 100)}%`;
}

export function remaining(scopeTotal: number, cumExecuted: number): number {
  return Math.max(0, scopeTotal - cumExecuted);
}

export function idealLine(scopeTotal: number, durationDays: number, dayIndex: number): number {
  if (durationDays === 0) return 0;
  return Math.max(0, scopeTotal - Math.round((scopeTotal / durationDays) * dayIndex));
}

export function defectAgingDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export function impactScore(linkedCaseCount: number, severity: string): number {
  const weights: Record<string, number> = {
    critical: 4,
    major: 3,
    minor: 2,
    trivial: 1,
  };
  return linkedCaseCount * (weights[severity.toLowerCase()] ?? 1);
}

export function cycleDurationDays(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '—';
  const days = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000,
  );
  return days < 0 ? '—' : `${days}d`;
}

export function coveragePercent(linkedCases: number, totalCases: number): string {
  return sharePercent(linkedCases, totalCases);
}

export function velocity(totalRuns: number, days: number): string {
  if (days === 0) return '—';
  return (totalRuns / days).toFixed(1);
}

export function defectRate(defectCount: number, runCount: number): string {
  if (runCount === 0) return '—';
  return `${((defectCount / runCount) * 100).toFixed(1)}%`;
}

export function cycleDeltaStr(current: number, previous: number | null): string {
  if (previous === null) return '—';
  const delta = current - previous;
  if (delta === 0) return '→ 0%';
  return delta > 0 ? `↑ ${delta}%` : `↓ ${Math.abs(delta)}%`;
}
