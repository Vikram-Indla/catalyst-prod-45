/**
 * TypeBadge — Color-coded work item type badge
 * Story: blue, Bug: red, Incident: amber, Subtask: slate, Feature: blue, Task: amber
 */

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  story: { bg: '#EFF6FF', text: '#2563EB', label: 'Story' },
  feature: { bg: '#EFF6FF', text: '#2563EB', label: 'Feature' },
  bug: { bg: '#FEF2F2', text: '#DC2626', label: 'Bug' },
  incident: { bg: '#FFFBEB', text: '#D97706', label: 'Incident' },
  subtask: { bg: '#F8FAFC', text: '#64748B', label: 'Subtask' },
  task: { bg: '#FFFBEB', text: '#D97706', label: 'Task' },
  epic: { bg: '#F5F3FF', text: '#7C3AED', label: 'Epic' },
};

const DEFAULT_STYLE = { bg: '#F1F5F9', text: '#64748B', label: 'Item' };

export function TypeBadge({ type }: { type: string }) {
  const key = (type || '').toLowerCase();
  const s = TYPE_STYLES[key] || DEFAULT_STYLE;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 4,
        background: s.bg,
        color: s.text,
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {s.label}
    </span>
  );
}

export default TypeBadge;
