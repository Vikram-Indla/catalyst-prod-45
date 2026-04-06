import React from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';

interface Props {
  item: Resource360Item;
  x: number;
  y: number;
  onClick: () => void;
}

/** Full detail card positioned on the outer ring */
export function Resource360RingNode({ item, x, y, onClick }: Props) {
  const cat = getStatusCategory(item.status, item.status_category);
  const sc = STATUS_COLORS[cat];
  const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';
  const hubShort = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();

  return (
    <div
      className="absolute cursor-pointer transition-all"
      style={{
        left: x, top: y,
        transform: 'translate(-50%, -50%)',
        width: 160, minHeight: 72,
        background: 'var(--bg-app, #FFFFFF)',
        border: '1px solid var(--bd-default, #E2E8F0)',
        borderRadius: 12,
        padding: '8px 10px 8px 13px',
        boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        zIndex: 5,
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.08)';
        (e.currentTarget as HTMLElement).style.zIndex = '20';
        (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.04)';
        (e.currentTarget as HTMLElement).style.zIndex = '5';
        (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%)';
      }}
    >
      {/* Left status color bar */}
      <div
        className="absolute left-0 top-2 bottom-2 rounded-full"
        style={{ width: 3, background: sc.dot }}
      />

      {/* Row 1: Key + Hub badge */}
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', fontFamily: "'Inter', monospace" }}>
          {item.item_key}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
          color: hubColor, background: `${hubColor}12`,
          padding: '1px 5px', borderRadius: 4,
        }}>
          {hubShort}
        </span>
      </div>

      {/* Row 2: Title (2-line clamp) */}
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--fg-1, #0F172A)',
        lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 4,
      }}>
        {item.title}
      </div>

      {/* Row 3: Status pill + assigned date */}
      <div className="flex items-center gap-1.5">
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 9, fontWeight: 600,
          color: sc.text, background: sc.bg,
          padding: '1px 6px', borderRadius: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
          {item.status}
        </span>
        <span style={{ fontSize: 9, color: '#94A3B8' }}>
          {item.assigned_at?.slice(0, 10)}
        </span>
      </div>
    </div>
  );
}
