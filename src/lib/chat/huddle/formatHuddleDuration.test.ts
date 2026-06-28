import { describe, it, expect } from 'vitest';
import { formatHuddleDuration } from './formatHuddleDuration';

describe('formatHuddleDuration', () => {
  it('seconds under a minute', () => {
    expect(formatHuddleDuration(0)).toBe('0s');
    expect(formatHuddleDuration(45)).toBe('45s');
  });
  it('whole/partial minutes show minutes only', () => {
    expect(formatHuddleDuration(60)).toBe('1m');
    expect(formatHuddleDuration(62)).toBe('1m');
    expect(formatHuddleDuration(599)).toBe('9m');
  });
  it('hours show h + m', () => {
    expect(formatHuddleDuration(3600)).toBe('1h');
    expect(formatHuddleDuration(3720)).toBe('1h 2m');
  });
  it('guards bad input', () => {
    expect(formatHuddleDuration(-5)).toBe('0s');
    expect(formatHuddleDuration(NaN)).toBe('0s');
  });
});
