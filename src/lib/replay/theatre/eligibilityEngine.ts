import type { TheatreEligibility, TheatreConfig } from './theatreTypes';
import { DEFAULT_THEATRE_CONFIG } from './theatreTypes';

export interface EligibilityInput {
  key: string;
  type: string;
  transitionCount: number;
  childCount: number;
  hasRelease: boolean;
  hasSprint: boolean;
  hasHandover: boolean;
  hasRegression: boolean;
  completionStatus: 'open' | 'done' | 'cancelled';
  daysInSystem: number;
}

const DISABLED_MESSAGE = 'Replay unavailable — this item does not yet have enough lifecycle movement.';

// ─── Score computation ────────────────────────────────────────────────────────

function computeScore(input: EligibilityInput): number {
  let score = 0;

  // +5 per transition, max 25
  score += Math.min(input.transitionCount * 5, 25);

  // +10 per child item, max 30
  score += Math.min(input.childCount * 10, 30);

  // +15 if has regression
  if (input.hasRegression) score += 15;

  // +10 if has handover
  if (input.hasHandover) score += 10;

  // +10 if has sprint
  if (input.hasSprint) score += 10;

  // +10 if has release
  if (input.hasRelease) score += 10;

  return Math.min(score, 100);
}

// ─── Main function ────────────────────────────────────────────────────────────

export function checkEligibility(
  input: EligibilityInput,
  config?: Partial<TheatreConfig>,
): TheatreEligibility {
  const effectiveConfig: TheatreConfig = {
    ...DEFAULT_THEATRE_CONFIG,
    ...config,
  };

  const reasons: string[] = [];

  // ── Hard ineligibility conditions (check first) ──────────────────────────

  if (input.daysInSystem < 2) {
    return {
      isEligible: false,
      reasons: ['too new to have a story — item must be at least 2 days old'],
      score: computeScore(input),
    };
  }

  if (input.transitionCount < 1 && input.childCount === 0) {
    return {
      isEligible: false,
      reasons: ['only in initial status, no movement — needs at least one transition or one child item'],
      score: computeScore(input),
    };
  }

  // ── Positive eligibility criteria (any one = eligible) ───────────────────

  if (input.transitionCount >= effectiveConfig.minTransitionCount) {
    reasons.push(`${input.transitionCount} status transitions (threshold: ${effectiveConfig.minTransitionCount})`);
  }

  if (input.childCount >= 2) {
    reasons.push(`${input.childCount} child items`);
  }

  if (input.hasRelease && input.transitionCount >= 1) {
    reasons.push('linked to a release with at least 1 transition');
  }

  if (input.hasSprint && input.transitionCount >= 1) {
    reasons.push('sprint-bound with at least 1 transition');
  }

  if (input.hasHandover) {
    reasons.push('assignee handover detected');
  }

  if (input.hasRegression) {
    reasons.push('status regression detected');
  }

  if (input.completionStatus === 'done' && input.daysInSystem >= 5) {
    reasons.push(`completed in ${input.daysInSystem} days`);
  }

  const isEligible = reasons.length > 0;

  if (!isEligible) {
    reasons.push(DISABLED_MESSAGE);
  }

  return {
    isEligible,
    reasons,
    score: computeScore(input),
  };
}
