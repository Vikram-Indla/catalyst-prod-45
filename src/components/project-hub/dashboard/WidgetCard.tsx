import { ReactNode } from 'react';

interface WidgetCardProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}

export function WidgetCard({ title, actionLabel, onAction, children }: WidgetCardProps) {
  return (
    <div className="ph-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 170 }}>
      <div className="flex items-center justify-between" style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
          {title}
        </span>
        {actionLabel && (
          <button
            onClick={onAction}
            style={{ fontSize: 12, color: '#2563EB', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
