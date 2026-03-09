/**
 * WorkHubGroupHeader — Collapsible group header
 * 32px height, chevron + label + count badge + "+ Add item" on hover
 */
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

interface WorkHubGroupHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onAddItem: () => void;
}

export default function WorkHubGroupHeader({ label, count, collapsed, onToggle, onAddItem }: WorkHubGroupHeaderProps) {
  return (
    <div
      className="group"
      style={{
        display: 'flex', alignItems: 'center', height: 32, padding: '0 12px', gap: 8,
        borderBottom: '0.75px solid rgba(15,23,42,0.06)', cursor: 'pointer',
        background: 'transparent', userSelect: 'none',
      }}
      onClick={onToggle}
    >
      {collapsed
        ? <ChevronRight size={16} color="#334155" />
        : <ChevronDown size={16} color="#334155" />
      }
      <span style={{ fontSize: 12, fontWeight: 650, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: 16, minWidth: 16, padding: '0 8px', borderRadius: 10,
        background: '#F1F5F9', fontSize: 11, fontWeight: 600, color: '#64748B',
      }}>
        {count}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onAddItem(); }}
        className="opacity-0 group-hover:opacity-100"
        style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#64748B',
          transition: 'opacity 120ms',
        }}
      >
        <Plus size={12} /> Add item
      </button>
    </div>
  );
}
