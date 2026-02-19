// Shared display utilities for ProjectHub list views

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: '#F0FDFA', color: '#0D9488' },
  on_hold: { bg: '#FFFBEB', color: '#D97706' },
  completed: { bg: '#F0FDF4', color: '#16A34A' },
  archived: { bg: '#F1F5F9', color: '#64748B' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.active;
  const label = status.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        background: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
    </span>
  );
}

const HEALTH_STYLES: Record<string, { bg: string; color: string }> = {
  on_track: { bg: '#F0FDF4', color: '#16A34A' },
  at_risk: { bg: '#FFFBEB', color: '#D97706' },
  off_track: { bg: '#FEF2F2', color: '#EF4444' },
};

export function HealthBadge({ health }: { health: string | null }) {
  if (!health) return <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>;
  const s = HEALTH_STYLES[health] || HEALTH_STYLES.on_track;
  const label = health.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full"
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        background: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span
        className="rounded-full"
        style={{ width: 6, height: 6, background: s.color, display: 'inline-block' }}
      />
      {label}
    </span>
  );
}

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DC2626'];

export function AvatarStack({ count }: { count: number }) {
  if (count === 0) return <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>;

  const show = Math.min(count, 3);
  const overflow = count - show;

  return (
    <div className="flex items-center -space-x-1.5">
      {Array.from({ length: show }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            background: AVATAR_COLORS[i % AVATAR_COLORS.length],
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 600,
            border: '2px solid #FFFFFF',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            background: '#F1F5F9',
            color: '#64748B',
            fontSize: 9,
            fontWeight: 600,
            border: '2px solid #FFFFFF',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
