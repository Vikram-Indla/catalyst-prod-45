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

export const StatusLozenge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toLowerCase() || '';
  let bg = 'var(--cp-lozenge-grey-bg)';
  let color = 'var(--cp-lozenge-grey-text)';
  if (['done', 'complete', 'completed', 'published', 'closed', 'resolved'].includes(s)) {
    bg = 'var(--cp-lozenge-green-bg)'; color = 'var(--cp-lozenge-green-text)';
  } else if (['in progress', 'active', 'review', 'in review', 'in_progress'].includes(s)) {
    bg = 'var(--cp-lozenge-blue-bg)'; color = 'var(--cp-lozenge-blue-text)';
  }
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', padding: '2px 6px', borderRadius: 3, lineHeight: '16px',
      background: bg, color, whiteSpace: 'nowrap',
    }}>{status}</span>
  );
};

export const JiraPill: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
  <span onClick={onClick} style={{
    fontFamily: 'var(--cp-font-mono)', fontSize: 11.5, fontWeight: 500,
    background: 'var(--cp-primary-5)', color: 'var(--cp-primary-60)',
    padding: '2px 7px', borderRadius: 3, cursor: onClick ? 'pointer' : 'default',
    whiteSpace: 'nowrap',
  }}>{label}</span>
);

export const AiBadge: React.FC<{ small?: boolean }> = ({ small }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 3,
    fontSize: small ? 9 : 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.04em', padding: small ? '1px 5px' : '2px 7px',
    borderRadius: 3, background: 'var(--cp-purple-5)', color: 'var(--cp-purple-60)',
    whiteSpace: 'nowrap',
  }}>✦ AI-Generated</span>
);

export const DomainBadge: React.FC<{ code: string; size?: 'sm' | 'md' }> = ({ code, size = 'sm' }) => (
  <span style={{
    fontFamily: 'var(--cp-font-mono)', fontSize: size === 'sm' ? 10 : 11,
    fontWeight: 600, padding: size === 'sm' ? '1px 5px' : '2px 7px',
    borderRadius: 3, background: 'var(--cp-bg-sunken)',
    color: 'var(--cp-text-secondary)', letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  }}>{code}</span>
);

export const ConfidenceBadge: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.round(value * 100);
  const bg = pct >= 90 ? 'var(--cp-lozenge-green-bg)' : pct >= 80 ? 'var(--cp-lozenge-blue-bg)' : 'var(--cp-lozenge-grey-bg)';
  const color = pct >= 90 ? 'var(--cp-lozenge-green-text)' : pct >= 80 ? 'var(--cp-lozenge-blue-text)' : 'var(--cp-lozenge-grey-text)';
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: 'var(--cp-font-mono)',
      padding: '2px 6px', borderRadius: 3, background: bg, color,
      letterSpacing: '0.03em',
    }}>{pct}%</span>
  );
};

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
