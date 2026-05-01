/**
 * R360 Ticket List Drawer (OPEN / STALE)
 * Extracted from R360MemberDetail.tsx
 */
import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import type { R360WorkItem } from '@/types/r360';
import { StatusPill, AgeBadge } from './SmallComponents';

export function TicketListDrawer({ mode, items, onClose, onSelectItem }: {
  mode: 'open' | 'stale';
  items: R360WorkItem[];
  onClose: () => void;
  onSelectItem: (item: R360WorkItem) => void;
}) {
  const isStale = mode === 'stale';
  const title = isStale ? 'Stale Items' : 'Open Items';
  const { isDark } = useTheme();
  const accentColor = isStale ? 'var(--ds-text-danger, #DC2626)' : 'var(--ds-text-brand, #2563EB)';
  const accentBg = isStale ? 'var(--ds-background-danger, #FEF2F2)' : 'var(--ds-background-selected, #EFF6FF)';

  return (
    <>
      <div className="r3-overlay" onClick={onClose} />
      <div className="r3-panel r3-panel--open" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="r3-panel-header" style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: accentBg, color: accentColor, fontSize: 14, fontWeight: 700 }}>
                {items.length}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)' }}>{title}</span>
            </div>
            <button className="r3-panel-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>
            {isStale ? 'Items with no activity for 14+ days' : 'All currently open items across all periods'}
          </div>
        </div>

        {/* List */}
        <div className="r3-panel-body" style={{ padding: 0 }}>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--cp-text-muted, #94A3B8)', fontSize: 13 }}>
              No {mode} items
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  cursor: 'pointer', transition: 'background 80ms ease',
                  borderBottom: '1px solid rgba(15,23,42,0.05)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(15,23,42,0.04))'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Type icon */}
                <span style={{ flexShrink: 0, width: 18 }}>{getJiraIcon(item.item_type)}</span>
                {/* Key */}
                <span className="r3-card-key r3-card-key--sm" style={{ flexShrink: 0, width: 80 }}>{item.item_key}</span>
                {/* Title */}
                <span style={{ fontSize: 12, color: 'var(--cp-text-primary, #0F172A)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
                {/* Status */}
                <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
                {/* Age */}
                <AgeBadge days={item.age_days} ageClass={item.age_class} />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
