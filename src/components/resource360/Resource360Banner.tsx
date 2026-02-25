import React from 'react';
import type { Resource360Summary } from '@/types/resource360';

interface Props {
  summary: Resource360Summary | null;
  isLoading: boolean;
  /** Pass items array to derive Open + Stale counts */
  items?: any[];
}

/** Resource banner: 66px, gradient avatar initials (NO photo), name, subtitle, 2 stat boxes (Open + Stale only) */
export function Resource360Banner({ summary, isLoading, items = [] }: Props) {
  if (isLoading || !summary) {
    return (
      <div style={{
        height: 66, display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E2E8F0' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ width: 120, height: 14, borderRadius: 4, background: '#E2E8F0' }} />
          <div style={{ width: 180, height: 10, borderRadius: 4, background: '#F1F5F9' }} />
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

  // DEF-01: ONLY Open + Stale — user mandate
  const openCount = items.filter(i => {
    const cat = (i.status_category || i.statusCategory || '').toLowerCase();
    return !cat.includes('done') && !cat.includes('closed') && !cat.includes('resolved') && !cat.includes('complete');
  }).length;

  const staleCount = items.filter(i => {
    const cat = (i.status_category || i.statusCategory || '').toLowerCase();
    const isDone = cat.includes('done') || cat.includes('closed') || cat.includes('resolved') || cat.includes('complete');
    const age = i.age_days ?? i.ageDays ?? 0;
    return !isDone && age > 14;
  }).length;

  const stats = [
    { label: 'Open', value: String(openCount), isWarn: true },
    { label: 'Stale', value: String(staleCount), isWarn: false },
  ];

  return (
    <div style={{
      height: 66, display: 'flex', alignItems: 'center', gap: 14,
      padding: '0 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
      flexShrink: 0, fontFamily: "'Inter', sans-serif",
    }}>
      {/* Avatar — gradient, initials only, NO photo */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {summary.avatar_url ? (
          <img src={summary.avatar_url} alt={summary.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }} />
        ) : null}
        <span style={{
          fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 800, color: '#FFFFFF',
          ...(summary.avatar_url ? { display: 'none' } : {}),
        }}>{initials}</span>
      </div>

      {/* Name + subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{
          fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 800,
          color: '#0F172A', lineHeight: 1.2,
        }}>{summary.name}</span>
        <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.3, fontWeight: 500 }}>
          {summary.role}{summary.department ? ` · ${summary.department}` : ''}
        </span>
      </div>

      {/* Stat boxes — ONLY Open + Stale (DEF-01 fix) */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            minWidth: 80, padding: '5px 14px', textAlign: 'center',
            borderRadius: 8,
            background: s.isWarn ? '#FFFBEB' : '#F8FAFC',
            border: `1px solid ${s.isWarn ? '#FDE68A' : '#E2E8F0'}`,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700,
              color: '#020617', lineHeight: 1.2,
              fontVariantNumeric: 'tabular-nums',
            }}>{s.value}</div>
            <div style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
