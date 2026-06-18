/**
 * weather-geo — pure helpers for the sidebar clock's inline weather chip.
 *
 *  - countryToGeo: resource home-country name → capital city lat/lon, for the
 *    Open-Meteo lookup. Riyadh (the work zone) has a fixed constant.
 *  - weatherCodeToIcon: WMO weather code (Open-Meteo `current.weather_code`)
 *    → a stable icon key + human label. The component maps the key to a Lucide
 *    icon; keeping the key here makes the mapping unit-testable.
 *
 * Single-zone countries only, mirroring country-timezone.ts. An unknown name
 * returns null and the caller renders the row with no weather (silence beats a
 * fabricated reading — CLAUDE.md zero-assumption rule).
 */

export interface Geo {
  lat: number;
  lon: number;
}

/** Riyadh — the always-present work zone. */
export const RIYADH_GEO: Geo = { lat: 24.71, lon: 46.68 };

const CAPITAL_GEO: Record<string, Geo> = {
  albania: { lat: 41.33, lon: 19.82 }, // Tirana
  egypt: { lat: 30.04, lon: 31.24 }, // Cairo
  india: { lat: 28.61, lon: 77.21 }, // New Delhi
  jordan: { lat: 31.95, lon: 35.93 }, // Amman
  pakistan: { lat: 33.69, lon: 73.06 }, // Islamabad
  'saudi arabia': { lat: 24.71, lon: 46.68 }, // Riyadh
  sudan: { lat: 15.5, lon: 32.56 }, // Khartoum
  kosovo: { lat: 42.66, lon: 21.17 }, // Pristina
};

/** Resolve a country name to its capital's geo, or null when unknown. */
export function countryToGeo(name: string | null | undefined): Geo | null {
  if (!name) return null;
  return CAPITAL_GEO[name.trim().toLowerCase()] ?? null;
}

export type WeatherIconKey = 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog';

export interface WeatherSymbol {
  icon: WeatherIconKey;
  label: string;
}

/**
 * Map a WMO weather code to an icon key + label.
 * Reference: Open-Meteo WMO code table (0 clear … 99 thunderstorm w/ hail).
 */
export function weatherCodeToIcon(code: number | null | undefined): WeatherSymbol {
  if (code == null) return { icon: 'cloud', label: 'Unknown' };
  if (code === 0) return { icon: 'sun', label: 'Clear' };
  if (code === 1 || code === 2) return { icon: 'cloud', label: 'Partly cloudy' };
  if (code === 3) return { icon: 'cloud', label: 'Cloudy' };
  if (code === 45 || code === 48) return { icon: 'fog', label: 'Fog' };
  if (code >= 51 && code <= 57) return { icon: 'rain', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { icon: 'rain', label: 'Rain' };
  if (code >= 71 && code <= 77) return { icon: 'snow', label: 'Snow' };
  if (code >= 80 && code <= 82) return { icon: 'rain', label: 'Showers' };
  if (code === 85 || code === 86) return { icon: 'snow', label: 'Snow showers' };
  if (code >= 95 && code <= 99) return { icon: 'storm', label: 'Thunderstorm' };
  return { icon: 'cloud', label: 'Cloudy' };
}
