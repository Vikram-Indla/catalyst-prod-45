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

  const kpis = [
    { label: 'TOTAL', value: String(totalCount), color: 'var(--fg-1)', bg: 'var(--bg-app)' },
    { label: 'CLOSURE', value: `${closurePct}%`, color: 'var(--sem-success)', bg: isDark ? 'rgba(14,138,95,0.1)' : '#F0FDF4' },
    { label: 'PENDING', value: String(pendingCount), color: 'var(--sem-danger)', bg: isDark ? 'rgba(226,54,54,0.1)' : '#FEF2F2' },
    { label: 'AVG AGE', value: `${avgAge}d`, color: 'var(--fg-1)', bg: 'var(--bg-app)' },
    { label: 'STALE', value: String(staleCount), color: 'var(--fg-1)', bg: 'var(--bg-app)' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '20px 24px', background: 'var(--bg-app)', borderBottom: '1px solid var(--divider)',
      flexShrink: 0, fontFamily: 'var(--ds-font-family-body)',
    }}>
      {/* Avatar */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {summary.avatar_url ? (
          <img src={summary.avatar_url} alt={summary.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }} />
        ) : null}
        <span style={{
          fontFamily: 'var(--ds-font-family-heading)', fontSize: 20, fontWeight: 800, color: '#FFFFFF',
          ...(summary.avatar_url ? { display: 'none' } : {}),
        }}>{initials}</span>
      </div>

      {/* Name + subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--ds-font-family-heading)', fontSize: 18, fontWeight: 800,
          color: 'var(--fg-1)', lineHeight: 1.2,
        }}>{summary.name}</span>
        <span style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.3, fontWeight: 500 }}>
          {summary.role}{summary.department ? ` · ${summary.department}` : ''}
        </span>
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
              fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 22, fontWeight: 700,
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
