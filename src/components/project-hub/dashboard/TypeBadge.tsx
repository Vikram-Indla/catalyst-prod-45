/**
 * TypeBadge — Solid color with white text, enterprise style
 */

const TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  story: { bg: '#2563EB', label: 'Story' },
  feature: { bg: '#2563EB', label: 'Feature' },
  bug: { bg: '#EF4444', label: 'Bug' },
  incident: { bg: '#F59E0B', label: 'Incident' },
  subtask: { bg: '#64748B', label: 'Subtask' },
  task: { bg: '#64748B', label: 'Task' },
  epic: { bg: '#7C3AED', label: 'Epic' },
};

const DEFAULT_STYLE = { bg: '#64748B', label: 'Item' };

export function TypeBadge({ type }: { type: string }) {
  const key = (type || '').toLowerCase();
  const s = TYPE_STYLES[key] || DEFAULT_STYLE;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 9999,
        backgroundColor: s.bg,
        color: '#FFFFFF',
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {s.label}
    </span>
  );
}

export default TypeBadge;
