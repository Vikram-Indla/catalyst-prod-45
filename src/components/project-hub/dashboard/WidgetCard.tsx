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
      ? { bg: '#292929', text: '#B8B8B8', border: '#454545' }
      : { bg: '#EBECF0', text: '#42526E', border: '#C1C7D0' };
    if (countColor === '#D97706' || countColor === '#EF4444') return dark
      ? { bg: '#3D1C1C', text: '#FCA5A5', border: '#5C2626' }
      : { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
    if (countColor === '#16A34A') return dark
      ? { bg: '#1C3D2A', text: '#86EFAC', border: '#265C3A' }
      : { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    return dark
      ? { bg: '#0D1526', text: '#93C5FD', border: '#1E3A5F' }
      : { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' };
  };
  const countStyle = getCountBadgeStyle();

  return (
    <div
      role="region"
      aria-label={title}
      className={`ph-widget-card transition-shadow duration-150 ${dark ? 'bg-[#0A0A0A] hover:shadow-none' : 'bg-white hover:shadow-md'}`}
      style={{
        border: dark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
        borderRadius: 8,
        borderLeft: leftBorder ? `3px solid ${leftBorder}` : undefined,
        overflow: 'hidden',
        boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: dark ? '1px solid #2E2E2E' : '1px solid #EBECF0',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#EDEDED' : '#0F172A', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
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
          {subtitle && <span style={{ fontSize: 11, color: dark ? '#A1A1A1' : '#6B778C', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{subtitle}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {headerRight}
          {actionLabel && (
            <button
              onClick={onAction}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded"
              style={{ fontSize: 12, color: dark ? '#4C9AFF' : '#0052CC', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#BF2600', fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${dark ? 'bg-[#0D1526]' : 'bg-[#DEEBFF]'}`}
              style={{ fontSize: 11, fontWeight: 600, color: dark ? '#4C9AFF' : '#0052CC', border: dark ? '1px solid #1E3A5F' : '1px solid #B3D4FF', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
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
    </div>
  );
}

export default WidgetCardInner;
