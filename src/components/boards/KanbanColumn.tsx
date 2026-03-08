import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ArrowDown } from 'lucide-react';
import KanbanCardComponent from './KanbanCard';
import type { BoardColumn as ColumnType, KanbanCard } from '@/types/board';

interface Props {
  column: ColumnType;
  cards: KanbanCard[];
}

export default function KanbanColumn({ column, cards }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const cardIds = cards.map(c => c.id);

  return (
    <div ref={setNodeRef} style={{
      width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column',
      minHeight: 80,
    }}>
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {cards.map(card => (
            <KanbanCardComponent key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>

      {/* Empty drop zone */}
      {cards.length === 0 && (
        <div style={{
          minHeight: 60, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          border: `1.5px dashed ${isOver ? 'var(--cp-primary-60)' : 'var(--cp-border-subtle)'}`,
          borderRadius: 6,
          background: isOver ? 'var(--cp-primary-5)' : 'transparent',
          transition: 'all 150ms',
        }}>
          <ArrowDown size={14} color={isOver ? 'var(--cp-primary-60)' : 'var(--cp-text-muted)'} />
          <span style={{
            fontSize: 11, color: isOver ? 'var(--cp-primary-60)' : 'var(--cp-text-muted)',
            fontFamily: 'var(--cp-font-body)',
          }}>Drop issues here</span>
        </div>
      )}

      {/* Active drop indicator when cards exist */}
      {cards.length > 0 && isOver && (
        <div style={{
          height: 2, background: 'var(--cp-primary-60)',
          borderRadius: 1, margin: '4px 0',
          boxShadow: '0 0 4px rgba(37,99,235,0.5)',
        }} />
      )}

      {/* Add button */}
      <button style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 8px', marginTop: 6,
        border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: 12, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-body)',
        borderRadius: 4,
        transition: 'background 80ms',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-interact-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus size={13} /> Create issue
      </button>
    </div>
  );
}
