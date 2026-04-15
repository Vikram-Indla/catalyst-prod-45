/**
 * SortableCard — DnD-enabled wrapper around WorkItemCard (memoized)
 */
import React, { useCallback, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkItemCard } from './WorkItemCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';

interface SortableCardProps {
  issue: BoardIssue;
  avatarUrl?: string | null;
  onClick: () => void;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  isSelected?: boolean;
  isFocused?: boolean;
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
  onOpenDetail?: (id: string) => void;
}

export const SortableCard = memo(function SortableCard({ issue, avatarUrl, onClick, d, tk, isSelected, isFocused, onToggleFlag, onCopyLink, onChangeStatus, onOpenDetail }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });

  const cardStyle: React.CSSProperties = {
    background: tk.cardBg,
    borderRadius: 3,
    border: `1px solid ${tk.cardBorder}`,
    borderLeft: isSelected ? `3px solid ${tk.selectedAccent}` : `1px solid ${tk.cardBorder}`,
    padding: d.cardPad,
    cursor: 'pointer',
    transition: 'background 80ms, box-shadow 80ms',
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 999 : 'auto',
    boxShadow: isDragging ? tk.cardDragShadow : isFocused ? `0 0 0 2px ${tk.selectedAccent}` : 'none',
    ...(transition ? { transition } : {}),
    position: 'relative' as const,
    outline: 'none',
  };

  const handleClick = useCallback(() => {
    if (!isDragging) onClick();
  }, [isDragging, onClick]);

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.background = tk.cardHoverBg;
          e.currentTarget.style.boxShadow = tk.cardHoverShadow;
          const menuBtn = e.currentTarget.querySelector('.kanban-card-menu-btn') as HTMLElement;
          if (menuBtn) menuBtn.style.opacity = '1';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = tk.cardBg;
        e.currentTarget.style.boxShadow = isDragging ? tk.cardDragShadow : isFocused ? `0 0 0 2px ${tk.selectedAccent}` : 'none';
        const menuBtn = e.currentTarget.querySelector('.kanban-card-menu-btn') as HTMLElement;
        if (menuBtn) menuBtn.style.opacity = '0';
      }}
      tabIndex={-1}
      role="listitem"
      aria-label={`${issue.issueKey}: ${issue.summary}`}
      aria-selected={isSelected}
      data-issue-id={issue.id}
    >
      <WorkItemCard
        issue={issue}
        avatarUrl={avatarUrl}
        d={d}
        tk={tk}
        isSelected={isSelected}
        onToggleFlag={onToggleFlag}
        onCopyLink={onCopyLink}
        onChangeStatus={onChangeStatus}
        onOpenDetail={onOpenDetail}
      />
    </div>
  );
});

export const OverlayCard = memo(function OverlayCard({ issue, avatarUrl, d, tk }: { issue: BoardIssue; avatarUrl?: string | null; d: DensityConfig; tk: KanbanThemeTokens }) {
  return (
    <div style={{
      background: tk.cardBg, borderRadius: 3, border: `1px solid ${tk.selectedAccent}`,
      padding: d.cardPad, width: 220, boxShadow: tk.cardDragShadow,
      transform: 'rotate(2deg)', cursor: 'grabbing',
    }}>
      <WorkItemCard issue={issue} avatarUrl={avatarUrl} d={d} tk={tk} />
    </div>
  );
});
