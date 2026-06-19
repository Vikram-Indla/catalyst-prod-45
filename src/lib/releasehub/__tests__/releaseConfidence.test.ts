import { describe, it, expect } from 'vitest';
import { resolveReleaseConfidence, type ReleaseConfidenceInput } from '../releaseConfidence';

const base: ReleaseConfidenceInput = {
  status: 'approved',
  health: 'on_track',
  readinessPct: 95,
  goLiveDate: '2026-07-17',
  signoffDone: 2,
  signoffTotal: 2,
  itemsAfterGoLive: 0,
  openDefects: 0,
  openIncidents: 0,
};

describe('resolveReleaseConfidence', () => {
  it('terminal status → released', () => {
    expect(resolveReleaseConfidence({ ...base, status: 'completed' })).toBe('released');
  });

  it('draft status or missing go-live → draft', () => {
    expect(resolveReleaseConfidence({ ...base, status: 'draft' })).toBe('draft');
    expect(resolveReleaseConfidence({ ...base, goLiveDate: null })).toBe('draft');
  });

  it('fully clean → high', () => {
    expect(resolveReleaseConfidence(base)).toBe('high');
  });

  it('open defects block high but stay medium (Login Hotfix case)', () => {
    expect(resolveReleaseConfidence({ ...base, openDefects: 3 })).toBe('medium');
  });

  it('open incident caps to low (June Production case)', () => {
    expect(resolveReleaseConfidence({
      ...base, status: 'approved', health: 'at_risk', readinessPct: 82,
      goLiveDate: '2026-06-30', signoffDone: 2, signoffTotal: 3, openIncidents: 1,
    })).toBe('low');
  });

  it('low readiness → low (August Platform case)', () => {
    expect(resolveReleaseConfidence({
      ...base, readinessPct: 18, signoffDone: 0, signoffTotal: 1, openDefects: 1, openIncidents: 2,
    })).toBe('low');
  });

  it('partial sign-offs (some done) without other blockers → medium (July Beta case)', () => {
    expect(resolveReleaseConfidence({
      ...base, readinessPct: 64, signoffDone: 1, signoffTotal: 2, openDefects: 2,
    })).toBe('medium');
  });

  it('no sign-offs cleared while required → low', () => {
    expect(resolveReleaseConfidence({ ...base, signoffDone: 0, signoffTotal: 2 })).toBe('low');
  });

  it('items after go-live (date breach) → low', () => {
    expect(resolveReleaseConfidence({ ...base, itemsAfterGoLive: 1 })).toBe('low');
  });

  it('at-risk health can never be high → medium', () => {
    expect(resolveReleaseConfidence({ ...base, health: 'at_risk' })).toBe('medium');
  });
});
