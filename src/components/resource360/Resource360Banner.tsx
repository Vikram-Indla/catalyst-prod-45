import React from 'react';
import type { Resource360Summary } from '@/types/resource360';

interface Props {
  summary: Resource360Summary | null;
  isLoading: boolean;
}

/** Resource banner: 66px, gradient avatar initials (NO photo), name, subtitle, 5 stat boxes */
export function Resource360Banner({ summary, isLoading }: Props) {
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

  const totalItems = summary.total_items ?? 0;
  const doneItems = summary.done_count ?? 0;
  const closureRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const pending = (summary.todo_count ?? 0) + (summary.progress_count ?? 0);
  const avgAge = 0; // derived from items if needed
  const staleCount = 0; // derived from items if needed

  const stats = [
    { label: 'Total', value: String(totalItems), danger: false },
    { label: 'Closure%', value: `${closureRate}%`, danger: false },
    { label: 'Pending', value: String(pending), danger: false },
    { label: 'Avg Age', value: `${avgAge}d`, danger: false },
    { label: 'Stale', value: String(staleCount), danger: staleCount > 0 },
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
        <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.3 }}>
          {summary.role}{summary.department ? ` · ${summary.department}` : ''}
        </span>
      </div>

      {/* Stat boxes — pushed right */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            minWidth: 64, padding: '5px 12px', textAlign: 'center',
            borderRadius: 8,
            background: s.danger ? '#FEF2F2' : '#F8FAFC',
            border: `1px solid ${s.danger ? '#FECACA' : '#E2E8F0'}`,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 800,
              color: s.danger ? '#EF4444' : '#0F172A', lineHeight: 1.2,
            }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
