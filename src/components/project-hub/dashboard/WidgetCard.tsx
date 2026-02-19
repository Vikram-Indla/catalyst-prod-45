import { ReactNode } from 'react';

interface WidgetCardProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}

export function WidgetCard({ title, actionLabel, onAction, children }: WidgetCardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 170,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
          {title}
        </span>
        {actionLabel && (
          <button
            onClick={onAction}
            style={{
              fontSize: 12, color: '#2563EB', fontWeight: 500,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
