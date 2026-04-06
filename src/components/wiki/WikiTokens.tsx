import React from 'react';

// ── Shared style constants ──────────────────────────────────
export const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  fontFamily: 'var(--cp-font-body)',
  textTransform: 'uppercase',
  letterSpacing: '1.2px',
  color: 'var(--cp-text-secondary)',
  borderTop: '2px solid var(--cp-primary-60)',
  paddingTop: 12,
  marginBottom: 16,
  marginTop: 32,
};

// ── Skeleton loader (pulse placeholder) ─────────────────────
export const SkeletonBlock: React.FC<{ width?: string | number; height?: number; radius?: number; style?: React.CSSProperties }> = ({
  width = '100%', height = 14, radius = 4, style,
}) => (
  <div
    style={{
      width, height, borderRadius: radius,
      background: 'var(--cp-bg-sunken)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }}
    aria-hidden="true"
  />
);

export const SkeletonRow: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock key={i} width={i === lines - 1 ? '60%' : '100%'} />
    ))}
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div style={{
    padding: 20, borderRadius: 6, border: '1px solid var(--cp-border-default)',
    background: 'var(--cp-bg-elevated)',
  }}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <SkeletonBlock width={28} height={28} radius={6} />
      <SkeletonBlock width={40} height={18} />
    </div>
    <SkeletonBlock height={16} style={{ marginBottom: 8 }} />
    <SkeletonBlock width="80%" height={12} style={{ marginBottom: 4 }} />
    <SkeletonBlock width="60%" height={12} style={{ marginBottom: 12 }} />
    <SkeletonBlock width="50%" height={10} />
  </div>
);

export const SkeletonArticleRow: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
    <SkeletonBlock width={14} height={14} radius={3} />
    <div style={{ flex: 1 }}>
      <SkeletonBlock width="70%" height={14} style={{ marginBottom: 4 }} />
      <SkeletonBlock width="40%" height={10} />
    </div>
  </div>
);

// ── StatusLozenge (3-color guardrail: Grey/Blue/Green) ──────
export const StatusLozenge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toLowerCase() || '';
  let bg = 'var(--cp-lozenge-grey-bg)';
  let color = 'var(--cp-lozenge-grey-text)';
  let ariaLabel = `Status: ${status || 'unknown'}`;
  if (['done', 'complete', 'completed', 'published', 'closed', 'resolved'].includes(s)) {
    bg = 'var(--cp-lozenge-green-bg)'; color = 'var(--cp-lozenge-green-text)';
  } else if (['in progress', 'active', 'review', 'in review', 'in_progress'].includes(s)) {
    bg = 'var(--cp-lozenge-blue-bg)'; color = 'var(--cp-lozenge-blue-text)';
  }
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      style={{
        display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.03em', padding: '2px 6px', borderRadius: 4, lineHeight: '16px',
        height: 20, boxSizing: 'border-box',
        background: bg, color, whiteSpace: 'nowrap',
      }}
    >{status || '—'}</span>
  );
};

// ── JiraPill (always LTR for ticket IDs) ────────────────────
export const JiraPill: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
  <span
    onClick={onClick}
    dir="ltr"
    style={{
      fontFamily: 'var(--cp-font-mono)', fontSize: 11.5, fontWeight: 500,
      background: 'var(--cp-primary-5)', color: 'var(--cp-primary-60)',
      padding: '2px 7px', borderRadius: 4, cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap', unicodeBidi: 'embed',
    }}
  >{label}</span>
);

// ── AiBadge ─────────────────────────────────────────────────
export const AiBadge: React.FC<{ small?: boolean }> = ({ small }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 3,
    fontSize: small ? 9 : 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.04em', padding: small ? '1px 5px' : '2px 7px',
    borderRadius: 4, background: 'var(--cp-purple-5)', color: 'var(--cp-purple-60)',
    whiteSpace: 'nowrap',
  }}>✦ AI-Generated</span>
);

// ── DomainBadge (always LTR for codes) ──────────────────────
export const DomainBadge: React.FC<{ code: string; size?: 'sm' | 'md' }> = ({ code, size = 'sm' }) => (
  <span
    dir="ltr"
    style={{
      fontFamily: 'var(--cp-font-mono)', fontSize: size === 'sm' ? 10 : 11,
      fontWeight: 600, padding: size === 'sm' ? '1px 5px' : '2px 7px',
      borderRadius: 4, background: 'var(--cp-bg-sunken)',
      color: 'var(--cp-text-secondary)', letterSpacing: '0.02em',
      whiteSpace: 'nowrap', unicodeBidi: 'embed',
    }}
  >{code}</span>
);

// ── ConfidenceBadge ─────────────────────────────────────────
export const ConfidenceBadge: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.round(value * 100);
  const bg = pct >= 90 ? 'var(--cp-lozenge-green-bg)' : pct >= 80 ? 'var(--cp-lozenge-blue-bg)' : 'var(--cp-lozenge-grey-bg)';
  const color = pct >= 90 ? 'var(--cp-lozenge-green-text)' : pct >= 80 ? 'var(--cp-lozenge-blue-text)' : 'var(--cp-lozenge-grey-text)';
  return (
    <span
      dir="ltr"
      aria-label={`AI confidence: ${pct}%`}
      style={{
        fontSize: 11, fontWeight: 700, fontFamily: 'var(--cp-font-mono)',
        padding: '2px 6px', borderRadius: 4, background: bg, color,
        letterSpacing: '0.03em', unicodeBidi: 'embed',
      }}
    >{pct}%</span>
  );
};

// ── LiveDataBadge ───────────────────────────────────────────
export const LiveDataBadge: React.FC = () => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 10, fontWeight: 600, color: 'var(--cp-teal-60)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: 'var(--cp-teal-60)',
      animation: 'wiki-pulse 2s ease-in-out infinite',
    }} />
    Live data
  </span>
);

// ── EmDash helper for null values ───────────────────────────
export const EmDash: React.FC = () => <span style={{ color: 'var(--cp-text-muted)' }}>—</span>;

// ── Truncated text helpers ──────────────────────────────────
export const truncateStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});
