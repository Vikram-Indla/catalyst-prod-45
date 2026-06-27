/**
 * Business Request Progress Utilities
 * All progress calculations are based on FEATURE COMPLETION, not sprints
 */

export function calculateBRProgressFromFeatures(
  linkedFeatures: Array<{ status: string }>
): number {
  if (!linkedFeatures || linkedFeatures.length === 0) return 0;

  const completed = linkedFeatures.filter((f) => f.status === 'done').length;
  return Math.round((completed / linkedFeatures.length) * 100);
}

export function calculateFeatureProgress(
  stories: Array<{ status: string }>
): number {
  if (!stories || stories.length === 0) return 0;

  const completed = stories.filter((s) => s.status === 'done').length;
  return Math.round((completed / stories.length) * 100);
}

export function determineBRHealth(
  targetDate: string,
  progressPercent: number,
  status: string
): 'on_track' | 'at_risk' | 'off_track' {
  if (status === 'completed' || status === 'delivered') return 'on_track';

  const today = new Date();
  const target = new Date(targetDate);
  const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0 && progressPercent < 100) return 'off_track';
  if (daysRemaining < 14 && progressPercent < 100) return 'at_risk';

  return 'on_track';
}

export function formatMilestoneDate(dateString: string | undefined): string {
  if (!dateString) return 'TBD';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
}

export function getMilestoneQuarterLabel(quarter: string): string {
  const year = new Date().getFullYear();
  return `${quarter} ${year}`;
}
