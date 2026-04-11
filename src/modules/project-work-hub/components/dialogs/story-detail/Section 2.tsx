/**
 * Section — Collapsible section with title, count badge, and optional actions
 */
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { V } from './tokens';

export function Section({ title, count, defaultOpen = false, actions, children }: {
  title: string; count?: number; defaultOpen?: boolean;
  actions?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', borderBottom: `0.75px solid ${V.border}`,
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChevronDown size={14} color={V.textMuted} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 200ms ease' }} />
          <span style={{ fontSize: 14, fontWeight: 650, color: V.textPrimary }}>{title}</span>
          {count !== undefined && (
            <span style={{ background: V.insetBg, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600, color: V.textMuted }}>{count}</span>
          )}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>
      <div style={{ maxHeight: open ? 5000 : 0, overflow: 'hidden', transition: 'max-height 250ms ease' }}>
        {open && <div style={{ paddingTop: 8 }}>{children}</div>}
      </div>
    </div>
  );
}
