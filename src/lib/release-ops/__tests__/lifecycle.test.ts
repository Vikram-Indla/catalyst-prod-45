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

  // RELEASE_STAGES was consolidated from the old 9-stage model down to the
  // canonical 5-stage model (draft/in_progress/qa/beta/production) — see the
  // RELEASE_ALIAS map + comment in lifecycle.ts. 'planned' and 'draft' now
  // both alias onto the same canonical stage, so a 'draft' → 'planned' call
  // is a no-op, not "one step forward". Use canonical stage names here.
  it('allows one step forward', () => {
    expect(canReleaseTransition('draft', 'in_progress')).toBe(true);
    expect(canReleaseTransition('qa', 'beta')).toBe(true);
  });

  it('allows one step back (rework)', () => {
    expect(canReleaseTransition('in_progress', 'draft')).toBe(true);
    expect(canReleaseTransition('beta', 'qa')).toBe(true);
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
    // todo → draft, in_readiness → in_progress, so todo → in_readiness is
    // one step forward on the canonical scale. ('planned' also aliases to
    // draft, so draft → planned is a no-op, not forward motion.)
    expect(canReleaseTransition('todo', 'in_readiness')).toBe(true);
    // monitoring → beta, completed → production: one step forward.
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
  // RELEASE_STAGES is the canonical 5-stage model (draft/in_progress/qa/
  // beta/production); the old 9-stage names (planned, scheduled, deploying,
  // completed, ...) live on only as RELEASE_ALIAS entries. CHANGE_STAGES was
  // not consolidated and keeps its original 9 stages.
  it('has 5 release stages and 9 change stages', () => {
    expect(RELEASE_STAGES).toHaveLength(5);
    expect(CHANGE_STAGES).toHaveLength(9);
  });
  it('starts both lifecycles at draft and ends at a terminal-ready stage', () => {
    expect(RELEASE_STAGES[0]).toBe('draft');
    expect(RELEASE_STAGES[RELEASE_STAGES.length - 1]).toBe('production');
    expect(CHANGE_STAGES[0]).toBe('draft');
    expect(CHANGE_STAGES[CHANGE_STAGES.length - 1]).toBe('closed');
  });
});
