/**
 * TypeFilterChips — Clickable type filter chips above the table (F27)
 * Shows counts per type, dynamically updated.
 */

import { useMemo } from 'react';
import type { WorkItem } from '@/types/hierarchy';

interface TypeFilterChipsProps {
  items: WorkItem[];
  activeType: string | null;
  onTypeChange: (type: string | null) => void;
}

function countByType(items: WorkItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  function walk(nodes: WorkItem[]) {
    for (const n of nodes) {
      const t = n.issueType || 'Unknown';
      counts[t] = (counts[t] || 0) + 1;
      walk(n.children);
    }
  }
  walk(items);
  return counts;
}

const TYPE_COLORS: Record<string, string> = {
  'Epic': '#2563EB',
  'Feature': '#7C3AED',
  'Story': '#16A34A',
  'Sub-task': 'rgba(237,237,237,0.40)',
  'Task': 'rgba(237,237,237,0.40)',
  'Bug': '#DC2626',
};

export function TypeFilterChips({ items, activeType, onTypeChange }: TypeFilterChipsProps) {
  const counts = useMemo(() => countByType(items), [items]);
  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  const types = useMemo(() =>
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  [counts]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {/* All chip */}
      <ChipButton
        label={`All (${total})`}
        active={activeType === null}
        color="#2563EB"
        onClick={() => onTypeChange(null)}
      />
      {types.map(([type, count]) => (
        <ChipButton
          key={type}
          label={`${type} (${count})`}
          active={activeType === type}
          color={TYPE_COLORS[type] || 'rgba(237,237,237,0.40)'}
          onClick={() => onTypeChange(activeType === type ? null : type)}
        />
      ))}
    </div>
  );
}

function ChipButton({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        color: active ? color : 'rgba(237,237,237,0.40)',
        background: active ? `${color}10` : '#FFFFFF',
        border: `1px solid ${active ? color : 'var(--bd-default, rgba(255,255,255,0.10))'}`,
        borderRadius: 9999, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        transition: 'all 120ms ease',
      }}
    >
      {label}
    </button>
  );
}
