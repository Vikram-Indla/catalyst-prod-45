import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useBoardStore } from '@/stores/boardStore';

interface Props {
  id: string;
  name: string;
  count: number;
  children: React.ReactNode;
}

export default function SwimlaneRow({ id, name, count, children }: Props) {
  const { collapsedSwimlanes, toggleSwimlane } = useBoardStore();
  const collapsed = collapsedSwimlanes[id];

  return (
    <div style={{
      background: 'var(--bg-app, #FFFFFF)',
      border: '0.75px solid var(--cp-border-subtle)',
      borderRadius: 8,
      marginBottom: 10,
    }}>
      {/* Header */}
      <button onClick={() => toggleSwimlane(id)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '10px 14px', border: 'none', background: 'transparent',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          transition: 'transform 0.2s',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          display: 'flex',
        }}>
          <ChevronDown size={14} color="var(--cp-text-muted)" />
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--cp-text-primary)',
          fontFamily: 'var(--cp-font-mono)',
        }}>{name}</span>
        <span style={{
          fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
          background: 'var(--cp-bg-sunken)', color: 'var(--cp-text-muted)',
          fontFamily: 'var(--cp-font-mono)',
        }}>{count}</span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div style={{ display: 'flex', gap: 12, padding: '0 12px 12px', overflowX: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
}
