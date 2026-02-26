import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { KanbanCard } from './KanbanCard';
import { WipIndicator } from './WipIndicator';
import { QuickAddCard } from './QuickAddCard';
import { SwimlaneHeader } from './SwimlaneHeader';

export interface ColumnConfig {
  key: InitiativeStatus;
  label: string;
  color: string;
  wip: number | null;
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

  const overWip = config.wip !== null && items.length >= config.wip;
  const approachingWip = config.wip !== null && !overWip && items.length >= config.wip - 1;

  const grouped = useMemo(() => groupBySwimlane(items, swimlane), [items, swimlane]);
  const laneKeys = Object.keys(grouped).sort();

  const toggleLane = (key: string) =>
    setCollapsedLanes(prev => ({ ...prev, [key]: !prev[key] }));

  if (isCollapsed) {
    return (
      <button onClick={onToggleCollapse} className="pk-column-collapsed" aria-label={`Expand ${config.label} column`}>
        <span className="pk-column-dot" style={{ backgroundColor: config.color }} />
        <span className="pk-column-collapsed-name">{config.label}</span>
        <span className="pk-column-collapsed-count">{items.length}</span>
        <ChevronRight size={14} style={{ color: 'var(--pk-ink-muted)', marginTop: 8 }} />
      </button>
    );
  }

  const totalScore = items.reduce((sum, i) => sum + (i.computed_score ?? 0), 0);

  return (
    <div
      className={`pk-column${isOver ? ' pk-column--over' : ''}${overWip ? ' pk-column--wip-over' : ''}${approachingWip ? ' pk-column--wip-approaching' : ''}`}
      aria-label={`${config.label} column with ${items.length} items`}
    >
      {/* Header */}
      <div className="pk-column-header">
        <span className="pk-column-dot" style={{ backgroundColor: config.color }} />
        <span className="pk-column-name">{config.label}</span>
        <WipIndicator count={items.length} limit={config.wip} />
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
                  <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--pk-ink-muted)', fontFamily: 'var(--pk-font-mono)' }}>
                    Total Score: {totalScore.toFixed(1)}
                  </div>
                  <div className="pk-context-separator" />
                  <button onClick={() => { onToggleCollapse(); setShowMenu(false); }} className="pk-dropdown-item">
                    Collapse Column
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        ref={setNodeRef}
        className="pk-column-body"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
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
            <Inbox size={36} className="pk-empty-icon" />
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
