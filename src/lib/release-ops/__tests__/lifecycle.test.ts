import { describe, it, expect } from 'vitest';
import {
  canReleaseTransition,
  canChangeTransition,
  RELEASE_STAGES,
  CHANGE_STAGES,
} from '../lifecycle';

describe('canReleaseTransition', () => {
  it('allows a no-op (same stage)', () => {
    expect(canReleaseTransition('draft', 'draft')).toBe(true);
  });

  it('allows one step forward', () => {
    expect(canReleaseTransition('draft', 'planned')).toBe(true);
    expect(canReleaseTransition('scheduled', 'deploying')).toBe(true);
  });

  it('allows one step back (rework)', () => {
    expect(canReleaseTransition('planned', 'draft')).toBe(true);
    expect(canReleaseTransition('deploying', 'scheduled')).toBe(true);
  });

  it('blocks skipping a stage', () => {
    expect(canReleaseTransition('draft', 'approved')).toBe(false);
    expect(canReleaseTransition('planned', 'deploying')).toBe(false);
  });

  it('allows terminal transitions from anywhere', () => {
    expect(canReleaseTransition('draft', 'cancelled')).toBe(true);
    expect(canReleaseTransition('deploying', 'rolled_back')).toBe(true);
  });

  it('aliases legacy statuses onto the canonical scale', () => {
    // todo → draft, so todo → planned is one step forward.
    expect(canReleaseTransition('todo', 'planned')).toBe(true);
    // released → completed (terminal-ish end); completed is last stage.
    expect(canReleaseTransition('monitoring', 'completed')).toBe(true);
  });

  it('is permissive for unknown from-states (legacy data can be corrected)', () => {
    expect(canReleaseTransition('weird_legacy', 'planned')).toBe(true);
  });
});

describe('canChangeTransition', () => {
  it('allows one step forward', () => {
    expect(canChangeTransition('draft', 'assessing')).toBe(true);
    expect(canChangeTransition('approved', 'scheduled')).toBe(true);
  });

  it('allows one step back', () => {
    expect(canChangeTransition('assessing', 'draft')).toBe(true);
  });

  it('blocks skipping a stage', () => {
    expect(canChangeTransition('draft', 'scheduled')).toBe(false);
  });

  it('allows terminal transitions (fail/rollback/cancel) from anywhere', () => {
    expect(canChangeTransition('implementing', 'failed')).toBe(true);
    expect(canChangeTransition('draft', 'cancelled')).toBe(true);
    expect(canChangeTransition('validating', 'rolled_back')).toBe(true);
  });

  it('aliases legacy change statuses', () => {
    // new → draft, so new → assessing is one step forward.
    expect(canChangeTransition('new', 'assessing')).toBe(true);
  });
});

describe('stage definitions', () => {
  it('has 9 release stages and 9 change stages', () => {
    expect(RELEASE_STAGES).toHaveLength(9);
    expect(CHANGE_STAGES).toHaveLength(9);
  });
  it('starts both lifecycles at draft and ends at a terminal-ready stage', () => {
    expect(RELEASE_STAGES[0]).toBe('draft');
    expect(RELEASE_STAGES[RELEASE_STAGES.length - 1]).toBe('completed');
    expect(CHANGE_STAGES[0]).toBe('draft');
    expect(CHANGE_STAGES[CHANGE_STAGES.length - 1]).toBe('closed');
  });
});
