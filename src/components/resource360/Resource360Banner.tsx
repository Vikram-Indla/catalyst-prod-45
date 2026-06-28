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
    { label: 'CLOSURE', value: `${closurePct}%`, color: 'var(--sem-success)', bg: 'var(--cp-success-light)' },
    { label: 'PENDING', value: String(pendingCount), color: 'var(--sem-danger)', bg: 'var(--cp-danger-light)' },
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
        background: 'linear-gradient(135deg, var(--ds-text-brand, var(--cp-workstream-catalyst-primary)), var(--ds-background-brand-bold-hovered))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {summary.avatar_url ? (
          <img src={summary.avatar_url} alt={summary.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }} />
        ) : null}
        <span style={{
          fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-700)', fontWeight: 800, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
          ...(summary.avatar_url ? { display: 'none' } : {}),
        }}>{initials}</span>
      </div>

      {/* Name + subtitle + release chips */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 4 }}>
        <span style={{
          fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 800,
          color: 'var(--fg-1)', lineHeight: 1.2,
        }}>{summary.name}</span>
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--fg-3)', lineHeight: 1.3, fontWeight: 500 }}>
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
                  background: chip.overdue ? 'var(--cp-danger-light)' : 'var(--ds-background-selected)',
                  border: `1px solid ${chip.overdue ? 'var(--sem-danger)' : 'var(--ds-border-selected)'}`,
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                  color: chip.overdue ? 'var(--sem-danger)' : 'var(--ds-text-brand)',
                  fontFamily: 'var(--cp-font-body)',
                  whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                  cursor: 'default',
                }}
              >
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{chip.name}</span>
                <span style={{
                  background: chip.overdue ? 'var(--sem-danger)' : 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
                  color: 'var(--ds-text-inverse)', borderRadius: 8, padding: '0 5px', fontSize: 'var(--ds-font-size-50)', fontWeight: 700,
                }}>{chip.count}</span>
                {chip.daysLabel && (
                  <span style={{ opacity: 0.75, fontSize: 'var(--ds-font-size-50)' }}>{chip.daysLabel}</span>
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
              fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-700)', fontWeight: 700,
              color: k.color, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums',
            }}>{k.value}</div>
            <div style={{
              fontSize: 'var(--ds-font-size-50)', color: 'var(--fg-3)', fontWeight: 700, marginTop: 2,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
