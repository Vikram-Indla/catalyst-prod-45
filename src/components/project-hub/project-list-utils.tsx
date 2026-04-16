// Shared display utilities for ProjectHub list views — V12 StatusLozenge guardrail

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

/**
 * StatusBadge — 3-colour guardrail ONLY:
 *   GREY  → To Do / Backlog / On Hold / Archived / Planning
 *   BLUE  → In Progress / In Review / Active
 *   GREEN → Done / Approved / Completed
 */
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#0C66E4', color: '#FFFFFF' },
  on_hold:   { bg: '#42526E', color: '#FFFFFF' },
  planning:  { bg: '#42526E', color: '#FFFFFF' },
  completed: { bg: '#1B7F37', color: '#FFFFFF' },
  archived:  { bg: '#42526E', color: '#FFFFFF' },
  backlog:   { bg: '#42526E', color: '#FFFFFF' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.active;
  const label = status.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return (
    <span
      style={{
        display: 'inline-block',
        height: 20,
        lineHeight: '20px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        borderRadius: 3,
        padding: '0 6px',
        whiteSpace: 'nowrap',
        backgroundColor: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
    </span>
  );
}

/**
 * HealthBadge — semantic health indicator (On Track / At Risk / Off Track)
 * Uses dot + label with muted backgrounds
 */
const HEALTH_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  on_track:  { bg: '#E3FCEF', color: '#006644', dot: '#006644' },
  at_risk:   { bg: '#FFF7E6', color: '#974F0C', dot: '#974F0C' },
  off_track: { bg: '#FFEBE6', color: '#BF2600', dot: '#BF2600' },
};

export function HealthBadge({ health }: { health: string | null }) {
  if (!health) return <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>;
  const s = HEALTH_STYLES[health] || HEALTH_STYLES.on_track;
  const label = health.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 20,
        lineHeight: '20px',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 3,
        padding: '0 6px',
        backgroundColor: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.dot, display: 'inline-block', flexShrink: 0 }}
      />
      {label}
    </span>
  );
}

const AVATAR_COLORS = ['#2563EB', '#0D9488', '#DC2626', '#7C3AED', '#D97706'];

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
            backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 600,
            border: '2px solid var(--cp-float)',
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
            backgroundColor: '#EBECF0',
            color: '#6B778C',
            fontSize: 9,
            fontWeight: 600,
            border: '2px solid var(--cp-float)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
