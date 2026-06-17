/**
 * iconUrlForKey — render-path contract for the create-project/product icon
 * pickers. A stored key (projects.icon / products.icon_key) must resolve to its
 * bundled SVG url, and an unknown/empty key must resolve to null so callers show
 * a neutral fallback rather than a broken image (zero-assumption: silence > lie).
 */
import { describe, it, expect } from 'vitest';
import { iconUrlForKey, type EntityIcon } from '../IconPickerGrid';

const SET: EntityIcon[] = [
  { key: 'rocket', label: 'Rocket', url: '/assets/rocket.svg' },
  { key: 'globe', label: 'Globe', url: '/assets/globe.svg' },
];

describe('iconUrlForKey', () => {
  it('resolves a known key to its bundled url', () => {
    expect(iconUrlForKey('rocket', SET)).toBe('/assets/rocket.svg');
  });

  it('returns null for an unknown key (neutral fallback, never a broken image)', () => {
    expect(iconUrlForKey('does-not-exist', SET)).toBeNull();
  });

  it('returns null for empty / null / undefined', () => {
    expect(iconUrlForKey('', SET)).toBeNull();
    expect(iconUrlForKey(null, SET)).toBeNull();
    expect(iconUrlForKey(undefined, SET)).toBeNull();
  });
});
