// Objectives Module - Score Calculation Utilities

export interface KeyResult {
  baseline_value?: number;
  current_value?: number;
  goal_value: number;
  score_override?: number;
}

/**
 * Calculate score for a single key result
 * Returns value between 0 and 1, or null if cannot be calculated
 */
export function calculateKeyResultScore(keyResult: KeyResult): number | null {
  // Check for manual override
  if (keyResult.score_override !== null && keyResult.score_override !== undefined) {
    return keyResult.score_override;
  }

  // Need current value to calculate
  if (keyResult.current_value === null || keyResult.current_value === undefined) {
    return null;
  }

  const baseline = keyResult.baseline_value ?? 0;
  const current = keyResult.current_value;
  const goal = keyResult.goal_value;

  // If goal equals baseline, cannot calculate progress
  if (goal === baseline) {
    return null;
  }

  // Calculate progress: (current - baseline) / (goal - baseline)
  const progress = (current - baseline) / (goal - baseline);

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, progress));
}

/**
 * Calculate overall objective score from multiple key results
 * Returns average of all key result scores, or null if no scores available
 */
export function calculateObjectiveScore(
  keyResults: KeyResult[],
  scoreOverride?: number
): number | null {
  // Check for manual override
  if (scoreOverride !== null && scoreOverride !== undefined) {
    return scoreOverride;
  }

  // Calculate scores for each key result
  const scores = keyResults
    .map(kr => calculateKeyResultScore(kr))
    .filter((score): score is number => score !== null);

  // If no key results have scores, return null
  if (scores.length === 0) {
    return null;
  }

  // Return average of all scores
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / scores.length;
}

/**
 * Calculate percentage progress for a key result
 * Returns value between 0 and 100
 */
export function calculateKeyResultProgress(keyResult: KeyResult): number {
  const score = calculateKeyResultScore(keyResult);
  if (score === null) return 0;
  return Math.round(score * 100);
}

/**
 * Calculate overall objective percentage from key results
 * Returns value between 0 and 100
 */
export function calculateObjectiveProgress(
  keyResults: KeyResult[],
  scoreOverride?: number
): number {
  const score = calculateObjectiveScore(keyResults, scoreOverride);
  if (score === null) return 0;
  return Math.round(score * 100);
}

/**
 * Get color for score visualization
 * Green >= 0.7, Yellow >= 0.4, Red < 0.4, Gray for null
 */
export function getScoreColor(score: number | null): string {
  if (score === null || score === undefined) return 'hsl(var(--muted-foreground))';
  if (score >= 0.7) return 'hsl(var(--success))';
  if (score >= 0.4) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

/**
 * Get label for score value
 */
export function getScoreLabel(score: number | null): string {
  if (score === null || score === undefined) return 'N/A';
  const percentage = Math.round(score * 100);
  return `${percentage}%`;
}

/**
 * Format a metric value based on its type
 */
export function formatMetricValue(value: number, metricType: string): string {
  if (value === null || value === undefined) return '0';
  
  switch (metricType) {
    case 'count':
      return Math.round(value).toString();
    case 'currency':
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    case 'percentage':
      return `${Math.round(value)}%`;
    case 'decimal_score':
      return value.toFixed(2);
    case 'nps':
      return Math.round(value).toString();
    default:
      return value.toString();
  }
}
