import { describe, it, expect } from 'vitest';
import {
  resolveEffectiveEnd,
  computeLeadTimeDays,
  formatLeadTime,
  sourceLabel,
} from '../leadTime';

describe('resolveEffectiveEnd', () => {
  it('prefers the due date', () => {
    expect(resolveEffectiveEnd({ dueDate: '2026-02-28', sprintEndDate: '2026-03-10', releaseDate: '2026-04-01' }))
      .toEqual({ endDate: '2026-02-28', source: 'due', sourceName: null });
  });

  it('falls back to sprint end when no due date', () => {
    expect(resolveEffectiveEnd({ dueDate: null, sprintEndDate: '2026-03-10', sprintName: 'Sprint 5', releaseDate: '2026-04-01' }))
      .toEqual({ endDate: '2026-03-10', source: 'sprint', sourceName: 'Sprint 5' });
  });

  it('falls back to release when no due date and no sprint', () => {
    expect(resolveEffectiveEnd({ releaseDate: '2026-04-01', releaseName: 'v1.2' }))
      .toEqual({ endDate: '2026-04-01', source: 'release', sourceName: 'v1.2' });
  });

  it('returns null source when nothing resolves', () => {
    expect(resolveEffectiveEnd({})).toEqual({ endDate: null, source: null, sourceName: null });
  });
});

describe('computeLeadTimeDays', () => {
  it('counts days from today to end date', () => {
    expect(computeLeadTimeDays('2026-06-29', '2026-06-24')).toBe(5);
  });
  it('is negative when overdue', () => {
    expect(computeLeadTimeDays('2026-06-20', '2026-06-24')).toBe(-4);
  });
  it('is null when end date missing', () => {
    expect(computeLeadTimeDays(null, '2026-06-24')).toBeNull();
  });
});

describe('formatLeadTime', () => {
  it('pluralizes and handles overdue + dash', () => {
    expect(formatLeadTime(5)).toBe('5 days');
    expect(formatLeadTime(1)).toBe('1 day');
    expect(formatLeadTime(-3)).toBe('3 days overdue');
    expect(formatLeadTime(null)).toBe('—');
  });
});

describe('sourceLabel', () => {
  it('maps each source', () => {
    expect(sourceLabel('due')).toBe('End date');
    expect(sourceLabel('sprint')).toBe('Sprint');
    expect(sourceLabel('release')).toBe('Release');
    expect(sourceLabel(null)).toBeNull();
  });
});
