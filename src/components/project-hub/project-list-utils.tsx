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
  active:    { bg: 'var(--status-inprogress-bg)', color: 'var(--status-inprogress-text)' },
  on_hold:   { bg: 'var(--status-todo-bg)', color: 'var(--status-todo-text)' },
  planning:  { bg: 'var(--status-todo-bg)', color: 'var(--status-todo-text)' },
  completed: { bg: 'var(--status-done-bg)', color: 'var(--status-done-text)' },
  archived:  { bg: 'var(--status-todo-bg)', color: 'var(--status-todo-text)' },
  backlog:   { bg: 'var(--status-todo-bg)', color: 'var(--status-todo-text)' },
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

const AVATAR_COLORS = ['#2563EB', '#0D9488', '#DC2626', '#7C3AED', '#D97706', '#059669', '#0369A1', '#BE185D'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function AvatarStack({ names }: { names: string[] }) {
  if (names.length === 0) return <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>;

  const show = Math.min(names.length, 5);
  const overflow = names.length - show;

  return (
    <div className="flex items-center -space-x-1.5">
      {names.slice(0, show).map((name, i) => (
        <div
          key={name}
          title={name}
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 26,
            height: 26,
            backgroundColor: AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length],
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 600,
            border: '2px solid var(--cp-float)',
            fontFamily: "'Inter', sans-serif",
            zIndex: show - i,
          }}
        >
          {getInitials(name)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 26,
            height: 26,
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
