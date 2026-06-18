import { describe, it, expect } from 'vitest';
import { countryToGeo, weatherCodeToIcon, RIYADH_GEO } from './weather-geo';

describe('countryToGeo', () => {
  it('maps the resource countries to their capitals', () => {
    expect(countryToGeo('India')).toEqual({ lat: 28.61, lon: 77.21 });
    expect(countryToGeo('Pakistan')).toEqual({ lat: 33.69, lon: 73.06 });
    expect(countryToGeo('Kosovo')).toEqual({ lat: 42.66, lon: 21.17 });
  });
  it('is case- and whitespace-insensitive', () => {
    expect(countryToGeo('  saudi arabia ')).toEqual(RIYADH_GEO);
  });
  it('returns null for unknown (no fabricated geo)', () => {
    expect(countryToGeo('Atlantis')).toBeNull();
    expect(countryToGeo(null)).toBeNull();
  });
});

describe('weatherCodeToIcon', () => {
  it('maps clear / cloud / rain / snow / storm / fog', () => {
    expect(weatherCodeToIcon(0)).toEqual({ icon: 'sun', label: 'Clear' });
    expect(weatherCodeToIcon(2).icon).toBe('cloud');
    expect(weatherCodeToIcon(63).icon).toBe('rain');
    expect(weatherCodeToIcon(75).icon).toBe('snow');
    expect(weatherCodeToIcon(95).icon).toBe('storm');
    expect(weatherCodeToIcon(48).icon).toBe('fog');
  });
  it('falls back to cloud for null/unknown', () => {
    expect(weatherCodeToIcon(null).icon).toBe('cloud');
    expect(weatherCodeToIcon(123).icon).toBe('cloud');
  });
});
