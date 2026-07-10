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
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        borderRadius: 3,
        padding: '0 6px',
        whiteSpace: 'nowrap',
        backgroundColor: s.bg,
        color: s.color,
        fontFamily: 'var(--cp-font-body)',
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
  on_track:  { bg: 'var(--ds-background-success)', color: 'var(--ds-text-success)', dot: 'var(--ds-text-success)' },
  at_risk:   { bg: 'var(--ds-background-warning-subtle)', color: 'var(--ds-text-warning)', dot: 'var(--ds-text-warning)' },
  off_track: { bg: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)', dot: 'var(--ds-text-danger)' },
};

export function HealthBadge({ health }: { health: string | null }) {
  if (!health) return <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>—</span>;
  const s = HEALTH_STYLES[health] || HEALTH_STYLES.on_track;
  const label = health.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 20,
        lineHeight: '20px',
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 600,
        borderRadius: 3,
        padding: '0 6px',
        backgroundColor: s.bg,
        color: s.color,
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.dot, display: 'inline-block', flexShrink: 0 }}
      />
      {label}
    </span>
  );
}
const AVATAR_COLORS = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', 'var(--cp-teal-60)', 'var(--ds-text-danger, var(--cp-danger))', 'var(--cp-purple-60)', 'var(--ds-text-warning, var(--cp-warning))', 'var(--quality-high)', 'var(--ds-text-information, var(--cp-workstream-catalyst-primary))', 'var(--ds-background-accent-magenta-bolder)'];

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
  if (names.length === 0) return <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>—</span>;

  const show = Math.min(names.length, 4);
  const overflow = names.length - show;

  return (
    <div className="flex items-center" style={{ paddingLeft: 0 }}>
      {names.slice(0, show).map((name, i) => (
        <div
          key={name}
          title={name}
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            marginLeft: i > 0 ? -6 : 0,
            backgroundColor: AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length],
            color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            fontSize: 'var(--ds-font-size-50)',
            fontWeight: 600,
            border: '2px solid var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            fontFamily: 'var(--cp-font-body)',
            zIndex: show - i,
            position: 'relative',
            boxShadow: '0 0 0 1px var(--ds-shadow-raised)',
          }}
        >
          {getInitials(name)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          title={names.slice(show).join(', ')}
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            marginLeft: -6,
            backgroundColor: 'var(--ds-background-neutral)',
            color: 'var(--ds-text-subtle)',
            fontSize: 'var(--ds-font-size-50)',
            fontWeight: 700,
            border: '2px solid var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            fontFamily: 'var(--cp-font-body)',
            boxShadow: '0 0 0 1px var(--ds-shadow-raised)',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
