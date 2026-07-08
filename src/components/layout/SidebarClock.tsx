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
 * CAT-HOME-NOISECUT-20260708-001 (2026-07-08): dropped the live weather chip
 * (temp + icon) — the timezone need is real, the weather wasn't; it just sat
 * in the highest-traffic real estate on the page decorating, not informing.
 * The two clock rows are the whole job now.
 *
 * ADS tokens only (color.text.*, surface, border). Sentence case. 4/8/12 grid.
 * Source: https://atlassian.design/foundations/typography · /foundations/color
 */
import React, { useEffect, useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import ClockIcon from '@atlaskit/icon/core/clock';
import { Tooltip } from '@/components/ads';
import { resolveClockZones } from '@/lib/sidebar-clock';
import { useResourceHomeTimezone } from '@/hooks/useResourceHomeTimezone';

interface SidebarClockProps {
  expanded: boolean;
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

  const muted = token('color.text.subtlest', 'var(--ds-icon-subtle)');
  const primary = token('color.text', 'var(--ds-text)');

  // Collapsed rail (56px): icon only, full read in the tooltip.
  if (!expanded) {
    const tip = zones.rows.map((r) => `${r.time} ${r.label}`).join(' · ');
    return (
      <Tooltip content={`${zones.dateLabel} — ${tip}`} position="right">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '32px' }}>
          <ClockIcon label="" color="var(--ds-icon-subtle)" />
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
          city | time. Tabular figures keep digits from jittering each tick. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          columnGap: '12px',
          rowGap: '8px',
          paddingLeft: '24px',
          alignItems: 'baseline',
        }}
      >
        {zones.rows.map((r) => (
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
