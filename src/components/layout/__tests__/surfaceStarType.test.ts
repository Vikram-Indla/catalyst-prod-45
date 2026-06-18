import { describe, it, expect } from 'vitest';
import { surfaceStarType } from '../ProjectPageHeader';

describe('surfaceStarType', () => {
  it('maps starrable surface route words to a StarredItemType', () => {
    expect(surfaceStarType('Backlog')).toBe('backlog');
    expect(surfaceStarType('backlog')).toBe('backlog');
    expect(surfaceStarType('Dashboard')).toBe('dashboard');
  });

  it('returns undefined for non-starrable routes (no guessed star)', () => {
    expect(surfaceStarType('Overview')).toBeUndefined();
    expect(surfaceStarType('Settings')).toBeUndefined();
    expect(surfaceStarType('')).toBeUndefined();
  });
});
