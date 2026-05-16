import React from 'react';
import type { Resource360Summary } from '@/types/resource360';
import { useIsDark } from '@/components/strategy/themes/useIsDark';

interface Props {
  summary: Resource360Summary | null;
  isLoading: boolean;
  items?: any[];
}

export function Resource360Banner({ summary, isLoading, items = [] }: Props) {
  const isDark = useIsDark();
  if (isLoading || !summary) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '20px 24px', background: 'var(--bg-app)', borderBottom: '1px solid var(--divider)',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--divider)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ width: 140, height: 16, borderRadius: 4, background: 'var(--divider)' }} />
          <div style={{ width: 200, height: 12, borderRadius: 4, background: 'var(--bg-3)' }} />
        </div>
      </div>
    );
  }

  const initials = summary.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Compute KPIs
  const totalCount = items.length;
  const doneCount = items.filter(i => {
    const cat = (i.status_category || '').toLowerCase();
    return cat.includes('done') || cat.includes('closed') || cat.includes('resolved') || cat.includes('complete');
  }).length;
  const closurePct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const pendingCount = totalCount - doneCount;
  const ages = items.filter(i => {
    const cat = (i.status_category || '').toLowerCase();
    return !cat.includes('done') && !cat.includes('closed') && !cat.includes('resolved') && !cat.includes('complete');
  }).map(i => i.age_days ?? 0);
  const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
  const staleCount = ages.filter(a => a > 14).length;

  // Release stats chips — group active (non-done) items by release name,
  // show top-3 by item count with days-until-end affordance.
  const releaseMap = new Map<string, { count: number; endDate: string | null }>();
  for (const item of items) {
    const rn = item.release_name as string | undefined;
    const cat = (item.status_category || '').toLowerCase();
    const isDone = cat.includes('done') || cat.includes('closed') || cat.includes('resolved') || cat.includes('complete');
    if (!isDone && rn) {
      const existing = releaseMap.get(rn) ?? { count: 0, endDate: (item.release_end_date as string | null) ?? null };
      existing.count++;
      releaseMap.set(rn, existing);
    }
  }
  const releaseChips = Array.from(releaseMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([name, info]) => {
      let daysLabel: string | null = null;
      if (info.endDate) {
        const diff = Math.ceil((new Date(info.endDate).getTime() - Date.now()) / 86_400_000);
        daysLabel = diff > 0 ? `${diff}d` : diff === 0 ? 'Today' : `${Math.abs(diff)}d ago`;
      }
      return { name, count: info.count, daysLabel, overdue: info.endDate ? new Date(info.endDate) < new Date() : false };
    });

  const kpis = [
    { label: 'TOTAL', value: String(totalCount), color: 'var(--fg-1)', bg: 'var(--bg-app)' },
    { label: 'CLOSURE', value: `${closurePct}%`, color: 'var(--sem-success)', bg: 'var(--cp-success-light, #F0FDF4)' },
    { label: 'PENDING', value: String(pendingCount), color: 'var(--sem-danger)', bg: 'var(--cp-danger-light, #FEF2F2)' },
    { label: 'AVG AGE', value: `${avgAge}d`, color: 'var(--fg-1)', bg: 'var(--bg-app)' },
    { label: 'STALE', value: String(staleCount), color: 'var(--fg-1)', bg: 'var(--bg-app)' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '20px 24px', background: 'var(--bg-app)', borderBottom: '1px solid var(--divider)',
      flexShrink: 0, fontFamily: 'var(--cp-font-body)',
    }}>
      {/* Avatar */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--ds-text-brand, #2563EB), var(--ds-background-brand-bold-hovered, #1D4ED8))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {summary.avatar_url ? (
          <img src={summary.avatar_url} alt={summary.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }} />
        ) : null}
        <span style={{
          fontFamily: 'var(--cp-font-heading)', fontSize: 20, fontWeight: 800, color: 'var(--ds-text-inverse, #FFFFFF)',
          ...(summary.avatar_url ? { display: 'none' } : {}),
        }}>{initials}</span>
      </div>

      {/* Name + subtitle + release chips */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 4 }}>
        <span style={{
          fontFamily: 'var(--cp-font-heading)', fontSize: 18, fontWeight: 800,
          color: 'var(--fg-1)', lineHeight: 1.2,
        }}>{summary.name}</span>
        <span style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.3, fontWeight: 500 }}>
          {summary.role}{summary.department ? ` · ${summary.department}` : ''}
        </span>
        {releaseChips.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {releaseChips.map(chip => (
              <span
                key={chip.name}
                title={`${chip.name} · ${chip.count} active item${chip.count === 1 ? '' : 's'}${chip.daysLabel ? ` · ${chip.daysLabel}` : ''}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 8px', borderRadius: 12,
                  background: chip.overdue ? 'var(--cp-danger-light, #FEF2F2)' : 'var(--ds-background-selected, #EFF6FF)',
                  border: `1px solid ${chip.overdue ? 'var(--sem-danger, #EF4444)' : 'var(--ds-border-selected, #B3D4FF)'}`,
                  fontSize: 11, fontWeight: 600,
                  color: chip.overdue ? 'var(--sem-danger, #B91C1C)' : 'var(--ds-text-brand, #1D4ED8)',
                  fontFamily: 'var(--cp-font-body)',
                  whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                  cursor: 'default',
                }}
              >
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{chip.name}</span>
                <span style={{
                  background: chip.overdue ? 'var(--sem-danger, #EF4444)' : 'var(--ds-text-brand, #2563EB)',
                  color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 10, fontWeight: 700,
                }}>{chip.count}</span>
                {chip.daysLabel && (
                  <span style={{ opacity: 0.75, fontSize: 10 }}>{chip.daysLabel}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            minWidth: 80, padding: '8px 16px', textAlign: 'center',
            borderRadius: 8, background: k.bg,
            border: '1px solid var(--divider)',
          }}>
            <div style={{
              fontFamily: 'var(--cp-font-mono)', fontSize: 22, fontWeight: 700,
              color: k.color, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums',
            }}>{k.value}</div>
            <div style={{
              fontSize: 10, color: 'var(--fg-3)', fontWeight: 700, marginTop: 2,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
