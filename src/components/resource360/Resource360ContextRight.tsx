import React from 'react';
import type { Resource360Item, Resource360Sibling } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS, WH_HUB_COLORS } from '@/types/resource360';

interface Props {
  item: Resource360Item;
  parentItem: Resource360Item | null;
  siblings: Resource360Sibling[];
  childItems: Resource360Item[];
  onSiblingClick: (key: string) => void;
  onParentClick: () => void;
}

export function Resource360ContextRight({
  item,
  parentItem,
  siblings,
  childItems,
  onSiblingClick,
  onParentClick,
}: Props) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 320, minWidth: 320,
        background: 'var(--bg-1)',
        fontFamily: 'Inter, sans-serif',
        overflowY: 'auto',
      }}
    >
      {parentItem ? (
        <>
          {/* Parent section */}
          <div style={{ padding: '20px 18px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--fg-4)', textTransform: 'uppercase' as const, marginBottom: 8 }}>
              Parent
            </div>

            <span
              onClick={onParentClick}
              className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--cp-blue)', fontFamily: "'Inter', monospace" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
            >
              {parentItem.item_key}
            </span>

            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', lineHeight: 1.35, marginTop: 4 }}>
              {parentItem.title}
            </div>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <StatusPill status={parentItem.status} />
              <HubBadge hub={parentItem.hub} />
              <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>
                {parentItem.project_name ?? ''}
              </span>
            </div>
          </div>

          {/* Siblings list */}
          <SiblingList
            label={`Siblings (${siblings.length})`}
            items={siblings}
            currentKey={item.item_key}
            onItemClick={onSiblingClick}
          />
        </>
      ) : (
        <>
          <div style={{ padding: '20px 18px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--fg-4)', textTransform: 'uppercase' as const, marginBottom: 8 }}>
              Top-Level Item
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>
              No parent work item.
            </div>
          </div>

          {childItems.length > 0 && (
            <SiblingList
              label={`Children (${childItems.length})`}
              items={childItems.map((c) => ({
                id: c.work_item_id,
                item_key: c.item_key,
                title: c.title,
                item_type: c.item_type,
                status: c.status,
                hub: c.hub,
                assigner_name: c.assigner_name,
                age_days: c.age_days,
              }))}
              currentKey=""
              onItemClick={onSiblingClick}
            />
          )}

          {childItems.length === 0 && (
            <div style={{ padding: '0 18px', fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>
              No children to display
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cat = getStatusCategory(status);
  const sc = STATUS_COLORS[cat];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 600,
      color: sc.text, background: sc.bg,
      padding: '2px 7px', borderRadius: 4,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
      {status}
    </span>
  );
}

function HubBadge({ hub }: { hub: string }) {
  const color = WH_HUB_COLORS[hub] ?? '#64748B';
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
      color, background: `${color}12`,
      padding: '2px 6px', borderRadius: 4,
    }}>
      {hub}
    </span>
  );
}

interface SiblingListProps {
  label: string;
  items: Array<{
    id?: string;
    item_key: string;
    title: string;
    item_type?: string;
    status: string;
    hub?: string;
    assigner_name?: string | null;
    age_days: number;
  }>;
  currentKey: string;
  onItemClick: (key: string) => void;
}

function SiblingList({ label, items, currentKey, onItemClick }: SiblingListProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 2,
          padding: '10px 18px',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          color: 'var(--fg-3)', textTransform: 'uppercase' as const,
          background: 'var(--bg-1)',
          borderBottom: '1px solid #F0F0F3',
        }}
      >
        {label}
      </div>

      {items.map((s) => {
        const isCurrent = s.item_key === currentKey;
        const sCat = getStatusCategory(s.status);
        const sSc = STATUS_COLORS[sCat];

        return (
          <div
            key={s.item_key}
            onClick={() => onItemClick(s.item_key)}
            className="cursor-pointer transition-colors"
            style={{
              padding: isCurrent ? '10px 18px 10px 15px' : '10px 18px',
              borderBottom: '1px solid #F0F0F3',
              background: isCurrent ? '#EFF6FF' : 'transparent',
              borderLeft: isCurrent ? '3px solid var(--cp-blue)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isCurrent) (e.currentTarget as HTMLElement).style.background = '#F0F5FF';
            }}
            onMouseLeave={(e) => {
              if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', fontFamily: "'Inter', monospace" }}>
                {s.item_key}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 600,
                color: sSc.text, background: sSc.bg,
                padding: '1px 6px', borderRadius: 4,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: sSc.dot }} />
                {s.status}
              </span>
            </div>

            <div style={{
              fontSize: 12, fontWeight: 500, color: 'var(--fg-2)',
              lineHeight: 1.35,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden', marginBottom: 3,
            }}>
              {s.title}
            </div>

            <div className="flex items-center justify-between">
              <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>
                {s.assigner_name ?? '—'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: "'Inter', monospace" }}>
                {s.age_days}d
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
