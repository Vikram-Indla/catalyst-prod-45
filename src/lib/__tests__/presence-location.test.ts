import { describe, it, expect } from 'vitest';
import { formatGmtOffset, formatPresenceLocation } from '../presence-location';

describe('formatGmtOffset', () => {
  it('formats whole-hour offsets ahead of UTC', () => {
    expect(formatGmtOffset(-240)).toBe('GMT+4'); // UAE
    expect(formatGmtOffset(-180)).toBe('GMT+3'); // KSA
  });
  it('formats offsets behind UTC', () => {
    expect(formatGmtOffset(300)).toBe('GMT-5'); // US East
  });
  it('formats half-hour offsets', () => {
    expect(formatGmtOffset(-330)).toBe('GMT+5:30'); // India
  });
  it('formats UTC', () => {
    expect(formatGmtOffset(0)).toBe('GMT+0');
  });
});

describe('formatPresenceLocation', () => {
  it('joins city, country and gmt', () => {
    expect(formatPresenceLocation({ city: 'Dubai', country: 'UAE', gmt: 'GMT+4' }))
      .toBe('Dubai, UAE · GMT+4');
  });
  it('omits a missing city', () => {
    expect(formatPresenceLocation({ country: 'UAE', gmt: 'GMT+4' })).toBe('UAE · GMT+4');
  });
  it('returns just the gmt when only the timezone is known', () => {
    expect(formatPresenceLocation({ gmt: 'GMT+3' })).toBe('GMT+3');
  });
  it('returns null when nothing is known', () => {
    expect(formatPresenceLocation({})).toBeNull();
  });
});
