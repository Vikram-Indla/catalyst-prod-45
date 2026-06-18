import { useQuery } from '@tanstack/react-query';
import type { Geo } from '@/lib/weather-geo';

/**
 * useCityWeather — current temperature + WMO weather code for a lat/lon, via
 * Open-Meteo (free, keyless, no attribution required). Powers the sidebar
 * clock's inline weather chip.
 *
 * Cached 30 min (weather barely moves within that window). Returns null when
 * `geo` is null or the request fails — the caller then renders the row with no
 * weather chip (silence beats a stale/fake reading — CLAUDE.md zero-assumption).
 *
 * No CSP change needed: index.html declares no connect-src directive, so fetch
 * is unrestricted (verified 2026-06-18).
 */
export interface CityWeather {
  tempC: number;
  code: number;
}

export function useCityWeather(geo: Geo | null) {
  const query = useQuery({
    queryKey: ['city-weather', geo?.lat ?? null, geo?.lon ?? null],
    enabled: !!geo,
    staleTime: 1000 * 60 * 30, // 30 min
    retry: 1,
    queryFn: async (): Promise<CityWeather | null> => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${geo!.lat}` +
        `&longitude=${geo!.lon}&current=temperature_2m,weather_code`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`weather ${res.status}`);
      const json = await res.json();
      const t = json?.current?.temperature_2m;
      const c = json?.current?.weather_code;
      if (typeof t !== 'number' || typeof c !== 'number') return null;
      return { tempC: Math.round(t), code: c };
    },
  });

  return query.data ?? null;
}
