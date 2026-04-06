/**
 * WorkHubGroupHeader — Collapsible group (Stage E: polished)
 * 32px height, chevron rotation, aria-expanded
 */
import { ChevronRight, Plus } from 'lucide-react';

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
      role="button"
      aria-expanded={!collapsed}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      style={{
        display: 'flex', alignItems: 'center', height: 32, padding: '8px 12px', gap: 8,
        borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))', cursor: 'pointer',
        background: 'transparent', userSelect: 'none', outline: 'none',
      }}
      onClick={onToggle}
      onFocus={e => (e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #2563EB')}
      onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <ChevronRight size={16} color="#334155" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 200ms ease' }} />
      <span style={{ fontSize: 12, fontWeight: 650, textTransform: 'uppercase', color: 'var(--fg-2)', letterSpacing: '0.03em' }}>{label}</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: 16, minWidth: 16, padding: '0 8px', borderRadius: 12,
        background: 'var(--bg-1)', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)',
      }}>{count}</span>
      <button
        onClick={e => { e.stopPropagation(); onAddItem(); }}
        style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg-3)',
          opacity: 0, transition: 'opacity 120ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
      >
        <Plus size={12} /> Add item
      </button>

      <style>{`
        div:hover > button:last-child { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
