import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal } from 'lucide-react';
import { WorkItemTypeIcon } from './WorkItemTypeIcons';
import type { KanbanCard } from '@/types/board';

interface Props {
  card: KanbanCard;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#FF5630',
  high: '#FF7452',
  medium: '#D97706',
  low: '#94A3B8',
};

export default function KanbanCardComponent({ card }: Props) {
  const [hover, setHover] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.6 : (card.statusId === 'done' ? 0.85 : 1),
    background: '#FFFFFF',
    border: `0.75px solid ${card.isBlocked ? 'var(--cp-danger-60)' : 'var(--cp-border-subtle)'}`,
    borderLeftWidth: card.isBlocked ? 3 : 0.75,
    borderRadius: 6,
    padding: '10px 11px 9px',
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: isDragging
      ? '0 8px 24px rgba(15,23,42,0.18)'
      : hover ? '0 2px 8px rgba(15,23,42,0.10)' : 'none',
    position: 'relative' as const,
    position: 'relative',
  };

  // Merge transforms
  const finalTransform = [
    CSS.Transform.toString(transform),
    isDragging ? 'rotate(1.5deg)' : (hover ? 'translateY(-1px)' : ''),
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...style,
        transform: finalTransform,
        transition: `box-shadow 150ms, transform 150ms${transition ? `, ${transition}` : ''}`,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <WorkItemTypeIcon type={card.type} size={16} />
        <span style={{
          fontSize: 11, fontWeight: 500,
          fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-text-tertiary)',
        }}>{card.key || '—'}</span>
        <div style={{ flex: 1 }} />
        <button style={{
          width: 22, height: 22, borderRadius: 3, border: 'none',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hover ? 1 : 0, transition: 'opacity 100ms',
        }} onClick={e => e.stopPropagation()}>
          <MoreHorizontal size={14} color="var(--cp-text-muted)" />
        </button>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 12.5, fontWeight: 500, lineHeight: 1.45,
        color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: card.epic ? 6 : 0,
      }}>
        {card.title || 'Untitled issue'}
      </div>

      {/* Epic label */}
      {card.epic && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 18, padding: '0 7px', borderRadius: 9,
          background: 'var(--cp-purple-5)', border: '0.75px solid var(--cp-purple-10)',
          maxWidth: '100%', overflow: 'hidden',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: card.epic.color || 'var(--cp-purple-60)', flexShrink: 0,
          }} />
          <span style={{
            fontSize: 10.5, color: 'var(--cp-purple-60)', fontFamily: 'var(--cp-font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{card.epic.title}</span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Priority dot */}
          {card.priority && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: PRIORITY_COLORS[card.priority.name] ?? '#94A3B8',
              flexShrink: 0,
            }} title={card.priority.name} />
          )}
          {/* Story points */}
          {card.storyPoints !== null && card.storyPoints !== undefined && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 18, minWidth: 22, padding: '0 5px', borderRadius: 4,
              background: 'var(--cp-success-5)', border: '0.75px solid var(--cp-success-10)',
              fontSize: 10.5, fontWeight: 650, color: 'var(--cp-success-60)',
              fontFamily: 'var(--cp-font-mono)',
            }}>{card.storyPoints}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Release pill */}
          {card.release && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 18,
              padding: '0 6px', borderRadius: 4, maxWidth: 88,
              background: 'var(--cp-bg-sunken)', border: '0.75px solid var(--cp-border-subtle)',
              fontSize: 10.5, fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-text-tertiary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{card.release.name}</span>
          )}
          {/* Assignee avatar */}
          {card.assignee && (
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: hashColor(card.assignee.id),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#FFFFFF',
              fontFamily: 'var(--cp-font-body)',
            }} title={card.assignee.displayName}>
              {card.assignee.initials}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function hashColor(id: string): string {
  const colors = ['#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#D97706', '#0D9488', '#0284C7', '#525252'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
