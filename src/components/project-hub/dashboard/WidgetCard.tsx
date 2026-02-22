/**
 * WidgetCard — Standard card wrapper for dashboard widgets
 * Catalyst V11 compliant with hover shadow, error state, ARIA
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
  error?: string | null;
  onRetry?: () => void;
}

export function WidgetCard(props: Props) {
  return <WidgetCardInner {...props} />;
}

function WidgetCardInner({ title, subtitle, count, countColor, leftBorder, headerRight, children, maxHeight, actionLabel, onAction, error, onRetry }: Props) {
  return (
    <div
      role="region"
      aria-label={title}
      className="ph-widget-card"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        borderLeft: leftBorder ? `3px solid ${leftBorder}` : undefined,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 150ms ease',
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
          {subtitle && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{subtitle}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {headerRight}
          {actionLabel && (
            <button
              onClick={onAction}
              className="ph-focus-ring"
              style={{ fontSize: 12, color: '#2563EB', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ph-focus-ring"
              style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
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
        .ph-widget-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08) !important; }
        .ph-focus-ring:focus-visible { outline: 2px solid #2563EB; outline-offset: 2px; border-radius: 4px; }
      `}</style>
    </div>
  );
}

export default WidgetCardInner;
