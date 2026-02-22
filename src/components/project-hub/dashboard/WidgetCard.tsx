/**
 * WidgetCard — Standard card wrapper for dashboard widgets
 */
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  countColor?: string;
  leftBorder?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  maxHeight?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export function WidgetCard(props: Props) {
  return <WidgetCardInner {...props} />;
}

function WidgetCardInner({ title, subtitle, count, countColor, leftBorder, headerRight, children, maxHeight, actionLabel, onAction }: Props) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        borderLeft: leftBorder ? `3px solid ${leftBorder}` : undefined,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '14px 16px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
            {title}
          </span>
          {count !== undefined && (
            <span
              style={{
                fontSize: 10, fontWeight: 700,
                color: countColor || '#64748B',
                background: countColor ? `${countColor}15` : '#F1F5F9',
                padding: '2px 7px', borderRadius: 8,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {count}
            </span>
          )}
          {subtitle && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{subtitle}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {headerRight}
          {actionLabel && (
            <button onClick={onAction} style={{ fontSize: 12, color: '#2563EB', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: maxHeight ? 'auto' : undefined, maxHeight }}>
        {children}
      </div>
    </div>
  );
}

export default WidgetCardInner;
