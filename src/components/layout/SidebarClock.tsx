/**
 * SidebarClock — quiet day/date + Riyadh/Home clock pinned to the Home sidebar
 * footer.
 *
 * Catalyst is built for Saudi Arabia, so the Riyadh (work) time is always
 * shown. A second "Home" row shows the signed-in resource's base-country time,
 * resolved from resource_inventory → resource_countries via
 * useResourceHomeTimezone. When the home zone is also UTC+3, or cannot be
 * resolved, only the Riyadh row renders (no duplicate, no fabricated zone).
 *
 * All zone logic is in the pure resolveClockZones helper (sidebar-clock.ts);
 * this component only renders and ticks.
 *
 * ADS tokens only (color.text.*, surface, border). Sentence case. 4/8/12 grid.
 * Source: https://atlassian.design/foundations/typography · /foundations/color
 */
import React, { useEffect, useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import ClockIcon from '@atlaskit/icon/core/clock';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react';
import { Tooltip } from '@/components/ads';
import { resolveClockZones } from '@/lib/sidebar-clock';
import { RIYADH_GEO, countryToGeo, weatherCodeToIcon, type WeatherIconKey } from '@/lib/weather-geo';
import { useResourceHomeTimezone } from '@/hooks/useResourceHomeTimezone';
import { useCityWeather, type CityWeather } from '@/hooks/useCityWeather';

interface SidebarClockProps {
  expanded: boolean;
}

const WEATHER_ICON: Record<WeatherIconKey, typeof Sun> = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  fog: CloudFog,
};

/** Inline weather chip — symbol + temperature, rendered in the row's gap. */
function WeatherChip({ weather, color }: { weather: CityWeather | null; color: string }) {
  if (!weather) return <span />; // no data → empty slot, row keeps label + time
  const { icon, label } = weatherCodeToIcon(weather.code);
  const Icon = WEATHER_ICON[icon];
  return (
    <span
      style={{ display: 'flex', alignItems: 'center', gap: '4px', color }}
      title={`${label} ${weather.tempC}°`}
    >
      <Icon size={13} aria-hidden="true" />
      <span style={{ fontSize: token('font.size.050', '11px'), fontVariantNumeric: 'tabular-nums' }}>
        {weather.tempC}°
      </span>
    </span>
  );
}

export default function SidebarClock({ expanded }: SidebarClockProps) {
  const { homeTz, homeCountry } = useResourceHomeTimezone();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const zones = useMemo(
    () => resolveClockZones(homeTz, homeCountry, now),
    [homeTz, homeCountry, now],
  );

  // Per-row weather: row 0 is always Riyadh; row 1 (when present) is Home.
  const riyadhWeather = useCityWeather(RIYADH_GEO);
  const homeWeather = useCityWeather(countryToGeo(homeCountry));
  const weatherForRow = (index: number) => (index === 0 ? riyadhWeather : homeWeather);

  const muted = token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)');
  const primary = token('color.text', 'var(--ds-text, #172B4D)');

  // Collapsed rail (56px): icon only, full read in the tooltip.
  if (!expanded) {
    const tip = zones.rows.map((r) => `${r.time} ${r.label}`).join(' · ');
    return (
      <Tooltip content={`${zones.dateLabel} — ${tip}`} position="right">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '32px' }}>
          <ClockIcon label="" color="var(--ds-icon-subtle, #626F86)" />
        </div>
      </Tooltip>
    );
  }

  return (
    <div style={{ padding: '4px 12px' }} aria-label={`Date and time. ${zones.dateLabel}.`}>
      {/* Day + date row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ display: 'inline-flex', flexShrink: 0 }} aria-hidden="true">
          <ClockIcon label="" color={muted} />
        </span>
        <span
          style={{
            color: muted,
            fontFamily: 'var(--cp-font-body)',
            fontSize: token('font.size.050', '11px'),
            lineHeight: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {zones.dateLabel}
        </span>
      </div>

      {/* Zone rows — Riyadh always, Home (country) when distinct. Aligned grid:
          country | weather | time, so temps and times line up vertically.
          Tabular figures keep digits from jittering each tick. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          columnGap: '12px',
          rowGap: '8px',
          paddingLeft: '24px',
          alignItems: 'baseline',
        }}
      >
        {zones.rows.map((r, i) => (
          <React.Fragment key={r.label}>
            {/* Country / city — prominent */}
            <span
              style={{
                color: primary,
                fontFamily: 'var(--cp-font-body)',
                fontSize: token('font.size.075', '12px'),
                fontWeight: 500,
                lineHeight: '18px',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.label}
            </span>
            {/* Weather chip — own column so temps align; empty when unavailable */}
            <span style={{ justifySelf: 'end' }}>
              <WeatherChip weather={weatherForRow(i)} color={muted} />
            </span>
            {/* Time — 12h, no timezone suffix */}
            <span
              style={{
                justifySelf: 'end',
                color: primary,
                fontSize: token('font.size.075', '12px'),
                fontWeight: 500,
                lineHeight: '18px',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {r.time}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
