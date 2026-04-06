import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { KanbanCard } from './KanbanCard';
import { QuickAddCard } from './QuickAddCard';
import { SwimlaneHeader } from './SwimlaneHeader';

export interface ColumnConfig {
  key: InitiativeStatus;
  label: string;
  color: string;
}

export type SwimlaneField = 'none' | 'department' | 'assignee' | 'quarter' | 'priority';

interface KanbanColumnProps {
  config: ColumnConfig;
  items: Initiative[];
  onCardClick: (initiative: Initiative) => void;
  onCardContextMenu: (e: React.MouseEvent, initiative: Initiative) => void;
  activeId: string | null;
  swimlane: SwimlaneField;
  focusedCardId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function getSwimlaneKey(item: Initiative, swimlane: SwimlaneField): string {
  switch (swimlane) {
    case 'department': return item.department_name || 'Unassigned';
    case 'assignee': return item.assignee_name || 'Unassigned';
    case 'quarter': return item.target_quarter || 'No Quarter';
    case 'priority': {
      const s = item.computed_score;
      if (s === null) return 'Unscored';
      if (s >= 4.0) return 'High';
      if (s >= 3.0) return 'Medium';
      return 'Low';
    }
    default: return '__all__';
  }
}

function groupBySwimlane(items: Initiative[], swimlane: SwimlaneField): Record<string, Initiative[]> {
  if (swimlane === 'none') return { __all__: items };
  const groups: Record<string, Initiative[]> = {};
  for (const item of items) {
    const key = getSwimlaneKey(item, swimlane);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function getCountStyle(count: number) {
  if (count > 50) return { color: '#DC2626', background: 'rgba(248,113,113,0.06)' };
  if (count > 10) return { color: '#D97706', background: '#FFFBEB' };
  return { color: 'rgba(237,237,237,0.40)', background: '#1A1A1A' };
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  config,
  items,
  onCardClick,
  onCardContextMenu,
  activeId,
  swimlane,
  focusedCardId,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: config.key });
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});
  const [showMenu, setShowMenu] = useState(false);

  const grouped = useMemo(() => groupBySwimlane(items, swimlane), [items, swimlane]);
  const laneKeys = Object.keys(grouped).sort();
  const countStyle = getCountStyle(items.length);

  const toggleLane = (key: string) =>
    setCollapsedLanes(prev => ({ ...prev, [key]: !prev[key] }));

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="pk-column-collapsed"
        aria-label={`Expand ${config.label} column`}
      >
        <div style={{ width: '100%', height: 4, backgroundColor: config.color, borderRadius: '2px 2px 0 0', flexShrink: 0 }} />
        <span className="pk-column-collapsed-name">{config.label}</span>
        <span className="pk-column-collapsed-count">{items.length}</span>
        <ChevronRight size={14} style={{ color: 'var(--fg-4)', marginTop: 8 }} />
      </button>
    );
  }

  return (
    <div
      className={`pk-column${isOver ? ' pk-column--over' : ''}`}
      aria-label={`${config.label} column with ${items.length} items`}
    >
      {/* 4px colour bar */}
      <div style={{ width: '100%', height: 4, backgroundColor: config.color, flexShrink: 0 }} />

      {/* Header */}
      <div className="pk-column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span className="pk-column-name">{config.label}</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              color: countStyle.color,
              background: countStyle.background,
              padding: '2px 6px',
              borderRadius: 4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {items.length}
          </span>
        </div>
        <div className="pk-column-actions">
          <button onClick={onToggleCollapse} className="pk-column-action-btn" aria-label={`Collapse ${config.label}`}>
            <ChevronLeft size={14} />
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} className="pk-column-action-btn">
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="pk-dropdown" style={{ right: 0, left: 'auto' }}>
                  <button onClick={() => { onToggleCollapse(); setShowMenu(false); }} className="pk-dropdown-item">
                    Collapse Column
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body — ALL cards, vertical scroll, NO pagination */}
      <div
        ref={setNodeRef}
        className="pk-column-body"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
        role="listbox"
        aria-label={`${config.label} cards`}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {swimlane === 'none' ? (
            items.map(item => (
              <KanbanCard
                key={item.id}
                initiative={item}
                onClick={() => onCardClick(item)}
                onContextMenu={onCardContextMenu}
                isFocused={focusedCardId === item.id}
              />
            ))
          ) : (
            laneKeys.map(laneKey => (
              <div key={laneKey}>
                <SwimlaneHeader
                  label={laneKey}
                  count={grouped[laneKey].length}
                  isCollapsed={!!collapsedLanes[laneKey]}
                  onToggle={() => toggleLane(laneKey)}
                />
                {!collapsedLanes[laneKey] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, marginBottom: 8 }}>
                    {grouped[laneKey].map(item => (
                      <KanbanCard
                        key={item.id}
                        initiative={item}
                        onClick={() => onCardClick(item)}
                        onContextMenu={onCardContextMenu}
                        isFocused={focusedCardId === item.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </SortableContext>

        {items.length === 0 && (
          <div className="pk-empty">
            <Inbox size={28} className="pk-empty-icon" />
            <p className="pk-empty-text">No initiatives</p>
            <p className="pk-empty-hint">Drag cards here or add new</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pk-column-footer">
        <QuickAddCard status={config.key} />
      </div>
    </div>
  );
};
