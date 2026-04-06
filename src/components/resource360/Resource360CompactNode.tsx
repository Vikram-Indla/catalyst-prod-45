import React from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS } from '@/types/resource360';

interface Props {
  item: Resource360Item;
  x: number;
  y: number;
  onClick: () => void;
}

/** Compact pill node positioned on the inner ring */
export function Resource360CompactNode({ item, x, y, onClick }: Props) {
  const cat = getStatusCategory(item.status, item.status_category);
  const sc = STATUS_COLORS[cat];

  return (
    <div
      className="absolute cursor-pointer transition-all"
      style={{
        left: x, top: y,
        transform: 'translate(-50%, -50%)',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--bg-app, #FFFFFF)',
        border: '1px solid var(--bd-default, #E2E8F0)',
        borderRadius: 12,
        padding: '3px 8px',
        boxShadow: '0 1px 2px rgba(0,0,0,.03)',
        zIndex: 5,
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,.08)';
        (e.currentTarget as HTMLElement).style.zIndex = '20';
        (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,.03)';
        (e.currentTarget as HTMLElement).style.zIndex = '5';
        (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%)';
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: '#334155', fontFamily: "'Inter', monospace" }}>
        {item.item_key}
      </span>
    </div>
  );
}
