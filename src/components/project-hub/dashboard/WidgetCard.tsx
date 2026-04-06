/**
 * WidgetCard — Standard card wrapper for dashboard widgets
 * Premium enterprise styling with hover shadow, error state, ARIA
 */
import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  title: string;
  subtitle?: ReactNode;
  count?: number;
  countColor?: string;
  leftBorder?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  maxHeight?: number;
  actionLabel?: string;
  onAction?: () => void;
  error?: string | null;
  onRetry?: () => void;
}

export function WidgetCard(props: Props) {
  return <WidgetCardInner {...props} />;
}

function WidgetCardInner({ title, subtitle, count, countColor, leftBorder, headerRight, children, maxHeight, actionLabel, onAction, error, onRetry }: Props) {
  const { isDark: dark } = useTheme();
  

  const getCountBadgeStyle = () => {
    if (!countColor) return dark
      ? { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.72)', border: 'rgba(255,255,255,0.12)' }
      : { bg: 'var(--cp-bd-zone)', text: 'var(--fg-2)', border: 'rgba(237,237,237,0.53)' };
    if (countColor === '#D97706' || countColor === '#EF4444') return dark
      ? { bg: 'rgba(220,38,38,0.15)', text: '#FCA5A5', border: 'rgba(220,38,38,0.3)' }
      : { bg: 'rgba(251,191,36,0.10)', text: '#FBBF24', border: '#FCD34D' };
    if (countColor === '#16A34A') return dark
      ? { bg: 'rgba(22,163,74,0.15)', text: '#86EFAC', border: 'rgba(22,163,74,0.3)' }
      : { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    return dark
      ? { bg: 'rgba(37,99,235,0.15)', text: '#93C5FD', border: 'rgba(37,99,235,0.3)' }
      : { bg: '#DBEAFE', text: '#7DB8FC', border: '#93C5FD' };
  };
  const countStyle = getCountBadgeStyle();

  return (
    <div
      role="region"
      aria-label={title}
      className={`ph-widget-card ${dark ? 'bg-[#0A0A0A]' : 'bg-[var(--bg-app)]'}`}
      style={{
        border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--divider)',
        borderRadius: 12,
        borderLeft: leftBorder ? `3px solid ${leftBorder}` : undefined,
        overflow: 'hidden',
        boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 150ms ease',
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--cp-bd-zone)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#EDEDED' : 'var(--fg-1)', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
            {title}
          </span>
          {count !== undefined && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 22, height: 22,
                fontSize: 11, fontWeight: 800,
                color: countStyle.text,
                background: countStyle.bg,
                border: `1px solid ${countStyle.border}`,
                padding: '0 6px', borderRadius: 9999,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {count}
            </span>
          )}
          {subtitle && <span style={{ fontSize: 11, color: dark ? '#A1A1A1' : 'var(--fg-3)', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{subtitle}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {headerRight}
          {actionLabel && (
            <button
              onClick={onAction}
              className="ph-focus-ring"
              style={{ fontSize: 12, color: dark ? 'var(--cp-blue-light)' : 'var(--cp-blue)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--sem-danger)', fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`ph-focus-ring ${dark ? 'bg-[rgba(37,99,235,0.15)]' : 'bg-[var(--cp-blue-wash)]'}`}
              style={{ fontSize: 11, fontWeight: 600, color: dark ? 'var(--cp-blue-light)' : 'var(--cp-blue)', border: dark ? '1px solid rgba(37,99,235,0.3)' : '1px solid var(--cp-primary-20)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: maxHeight ? 'auto' : undefined, maxHeight }}>
          {children}
        </div>
      )}

      <style>{`
        .ph-widget-card:hover { box-shadow: ${dark ? 'none' : '0 4px 12px rgba(0,0,0,.1)'} !important; }
        .ph-focus-ring:focus-visible { outline: 2px solid var(--cp-blue); outline-offset: 2px; border-radius: 4px; }
      `}</style>
    </div>
  );
}

export default WidgetCardInner;
