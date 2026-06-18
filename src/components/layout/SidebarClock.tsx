/**
 * SidebarClock — quiet dual-zone clock pinned to the Home sidebar footer.
 *
 * Catalyst is built for Saudi Arabia, so Riyadh time is always shown. Users in
 * other zones also see their own local time; users already on UTC+3 see a
 * single chip (no duplicated identical time). All zone logic lives in the pure
 * `resolveClockZones` helper (sidebar-clock.ts) — this component only renders
 * and ticks.
 *
 * Option C — one-line ticker:
 *   [clock]  Wed 18 Jun
 *   14:32 GMT+5:30 · 12:02 AST        (away)
 *   12:02 Riyadh · AST                (in Riyadh)
 *
 * ADS tokens only (color.text.*, surface, border). Sentence case. 4/8/12 grid.
 * Source: https://atlassian.design/foundations/typography · /foundations/color
 */
import React, { useEffect, useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import ClockIcon from '@atlaskit/icon/core/clock';
import { Tooltip } from '@/components/ads';
import { resolveClockZones } from '@/lib/sidebar-clock';

interface SidebarClockProps {
  expanded: boolean;
}

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function SidebarClock({ expanded }: SidebarClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const zones = useMemo(() => resolveClockZones(LOCAL_TZ, now), [now]);

  // Collapsed rail (56px): icon only, full read in the tooltip.
  if (!expanded) {
    const tip = zones.showLocal
      ? `${zones.local!.time} ${zones.local!.abbr} · ${zones.riyadh.time} Riyadh`
      : `${zones.riyadh.time} Riyadh (AST)`;
    return (
      <Tooltip content={`${zones.dateLabel} — ${tip}`} position="right">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '32px',
          }}
        >
          <ClockIcon label="" color="var(--ds-icon-subtle, #626F86)" />
        </div>
      </Tooltip>
    );
  }

  const muted = token('color.text.subtlest', '#626F86');
  const primary = token('color.text', '#292A2E');

  return (
    <div style={{ padding: '4px 12px' }} aria-label={`Date and time. ${zones.dateLabel}.`}>
      {/* Date row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ display: 'inline-flex', flexShrink: 0 }} aria-hidden="true">
          <ClockIcon label="" color={muted} />
        </span>
        <span
          style={{
            color: muted,
            fontFamily: 'var(--cp-font-body)',
            fontSize: token('font.size.050', '11px'),
            lineHeight: '16px',
          }}
        >
          {zones.dateLabel}
        </span>
      </div>

      {/* Time chips row — tabular figures so digits don't jitter each tick */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: '6px',
          paddingLeft: '24px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {zones.showLocal && zones.local && (
          <>
            <span style={{ color: primary, fontSize: token('font.size.075', '12px'), fontWeight: 500, lineHeight: '16px' }}>
              {zones.local.time}
            </span>
            <span style={{ color: muted, fontSize: token('font.size.050', '11px'), lineHeight: '16px' }}>
              {zones.local.abbr}
            </span>
            <span style={{ color: 'var(--ds-border, #DFE1E6)' }} aria-hidden="true">·</span>
          </>
        )}
        <span style={{ color: primary, fontSize: token('font.size.075', '12px'), fontWeight: 500, lineHeight: '16px' }}>
          {zones.riyadh.time}
        </span>
        <span style={{ color: muted, fontSize: token('font.size.050', '11px'), lineHeight: '16px' }}>
          {zones.showLocal ? 'AST' : 'Riyadh · AST'}
        </span>
      </div>
    </div>
  );
}
