import React, { useState } from 'react';
import type { Resource360Item } from '@/types/resource360';

/** Highlight matching text for search */
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FEF08A', padding: '0 1px', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/** Stale badge rendered next to age */
export function StaleBadge({ ageDays, status, statusCategory }: { ageDays: number; status: string; statusCategory?: string }) {
  const { getStaleIndicator } = require('@/types/resource360');
  const stale = getStaleIndicator(ageDays, status, statusCategory);
  if (!stale) return null;
  return (
    <span title={stale.label} style={{ fontSize: 10, marginLeft: 2, cursor: 'help' }}>
      {stale.icon}
    </span>
  );
}

/** Inline expansion panel for item details */
export function InlineExpansionPanel({ item, onOpenDetail }: { item: Resource360Item; onOpenDetail: () => void }) {
  return (
    <div style={{
      padding: '10px 16px 10px 28px', background: '#FAF8F5',
      borderBottom: '1px solid var(--divider)', borderLeft: '4px solid var(--cp-blue)',
      animation: 'expandIn 200ms ease-out',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 11 }}>
        {[
          ['Full Title', item.title],
          ['Type', item.item_type],
          ['Priority', item.priority ?? 'None'],
          ['Hub', item.hub],
          ['Assigned By', item.assigner_name ?? '—'],
          ['Assigned Date', item.assigned_at?.slice(0, 10) ?? ''],
        ].map(([label, value]) => (
          <div key={label}>
            <p style={{ color: 'var(--fg-3)', fontWeight: 700, fontSize: 9, margin: '0 0 2px', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ color: 'var(--fg-1)', fontWeight: 600, margin: 0 }}>{value}</p>
          </div>
        ))}
        {item.parent_key && (
          <div>
            <p style={{ color: 'var(--fg-3)', fontWeight: 700, fontSize: 9, margin: '0 0 2px', textTransform: 'uppercase' }}>Parent</p>
            <p style={{ color: 'var(--fg-1)', fontWeight: 600, margin: 0 }}>{item.parent_key} — {item.parent_title ?? ''}</p>
          </div>
        )}
        {item.project_name && (
          <div>
            <p style={{ color: 'var(--fg-3)', fontWeight: 700, fontSize: 9, margin: '0 0 2px', textTransform: 'uppercase' }}>Project</p>
            <p style={{ color: 'var(--fg-1)', fontWeight: 600, margin: 0 }}>{item.project_name}</p>
          </div>
        )}
        {item.release_name && (
          <div>
            <p style={{ color: 'var(--fg-3)', fontWeight: 700, fontSize: 9, margin: '0 0 2px', textTransform: 'uppercase' }}>Release</p>
            <p style={{ color: 'var(--fg-1)', fontWeight: 600, margin: 0 }}>{item.release_name}</p>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={onOpenDetail} style={{
          fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 6,
          background: '#1A1A2E', color: '#fff', border: 'none', cursor: 'pointer',
        }}>Open Full Detail</button>
      </div>
    </div>
  );
}

/** Expand animation CSS — inject once */
export const expandAnimationCSS = `@keyframes expandIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 300px; } }`;

/** useExpandedRow hook */
export function useExpandedRow() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);
  return { expandedId, toggleExpand };
}

/** Expand chevron */
export function ExpandChevron({ expanded, onClick }: { expanded: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        cursor: 'pointer', fontSize: 10, color: 'var(--fg-3)',
        transition: 'transform .15s', display: 'inline-block',
        transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
        marginRight: 6, flexShrink: 0, width: 14, userSelect: 'none',
      }}
      title="Expand details"
    >
      ▶
    </span>
  );
}
