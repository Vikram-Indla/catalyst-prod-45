/**
 * SortableCard — DnD-enabled wrapper around WorkItemCard (memoized)
 * Jira parity: 4px radius, shadow-only (no border), dual-stack shadow.
 */
import React, { useCallback, memo, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkItemCard } from './WorkItemCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';
import type { AssigneeOption } from './AssigneePickerPopover';
import type { VisibleFields } from '@/hooks/useKanbanViewSettings';

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
  onCopyKey?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
  onOpenDetail?: (id: string) => void;
  onSaveSummary?: (id: string, newSummary: string) => void;
  onChangeAssignee?: (issueId: string, newAssignee: string | null) => void;
  assigneeOptions?: AssigneeOption[];
  avatarsByName?: Map<string, string>;
  projectKey?: string;
  onLabelsUpdated?: (issueId: string, newLabels: string[]) => void;
  onParentChange?: (issueId: string, newParentKey: string | null) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMoved?: (issueId: string, newProjectKey: string) => void;
  onLinked?: () => void;
  visibleFields?: VisibleFields;
}

export const SortableCard = memo(function SortableCard({ issue, avatarUrl, onClick, d, tk, isSelected, isFocused, onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onOpenDetail, onSaveSummary, onChangeAssignee, assigneeOptions, avatarsByName, projectKey, onLabelsUpdated, onParentChange, onArchive, onDelete, onMoved, onLinked, visibleFields }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });

  const restShadow = tk.cardShadowRest;
  const hoverShadow = tk.cardHoverShadow;
  const focusShadow = `0 0 0 2px ${tk.selectedAccent}`;

  /* ─── Right-click context menu — Jira parity for swimlane mode ─── */
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  const cardStyle: React.CSSProperties = {
    background: tk.cardBg,
    borderRadius: 4,                                    /* Jira parity: 4px */
    border: 'none',                                     /* Jira: shadow-only, no border */
    borderLeft: isSelected ? `3px solid ${tk.selectedAccent}` : 'none',
    padding: d.cardPad,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: transition || 'background 150ms ease, box-shadow 150ms ease, border-left 120ms ease',
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 999 : 'auto',
    boxShadow: isDragging ? tk.cardDragShadow : isFocused ? focusShadow : restShadow,
    position: 'relative' as const,
    outline: 'none',
    overflow: 'visible',
  };

  const handleClick = useCallback(() => {
    if (!isDragging) onClick();
  }, [isDragging, onClick]);

  return (
    <>
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.background = tk.cardHoverBg;
          e.currentTarget.style.boxShadow = hoverShadow;
          e.currentTarget.querySelectorAll('.kanban-card-menu-btn, .kanban-card-edit-btn').forEach((el) => {
            (el as HTMLElement).style.opacity = '1';
          });
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = tk.cardBg;
        e.currentTarget.style.boxShadow = isDragging ? tk.cardDragShadow : isFocused ? focusShadow : restShadow;
        e.currentTarget.querySelectorAll('.kanban-card-menu-btn, .kanban-card-edit-btn').forEach((el) => {
          (el as HTMLElement).style.opacity = '0';
        });
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
        onCopyKey={onCopyKey}
        onChangeStatus={onChangeStatus}
        onOpenDetail={onOpenDetail}
        onSaveSummary={onSaveSummary}
        onChangeAssignee={onChangeAssignee}
        assigneeOptions={assigneeOptions}
        avatarsByName={avatarsByName}
        projectKey={projectKey}
        onLabelsUpdated={onLabelsUpdated}
        onParentChange={onParentChange}
        onArchive={onArchive}
        onDelete={onDelete}
        onMoved={onMoved}
        onLinked={onLinked}
        visibleFields={visibleFields}
      />
    </div>
    {/* Jira-parity right-click context menu (swimlane mode) */}
    {ctxMenu && (
      <div
        data-testid={`kanban-card-context-menu-${issue.id}`}
        role="menu"
        aria-label={`Actions for ${issue.issueKey}`}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          left: ctxMenu.x,
          top: ctxMenu.y,
          zIndex: 9999,
          minWidth: 180,
          background: 'var(--ds-surface, #FFFFFF)',
          borderRadius: 4,
          boxShadow: 'rgba(9,30,66,0.31) 0 0 1px, rgba(9,30,66,0.25) 0 4px 8px -2px',
          padding: '4px 0',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        {[
          { key: 'open',     label: 'Open',            act: () => onClick() },
          { key: 'copyKey',  label: 'Copy issue key',  act: () => onCopyKey?.(issue.issueKey) },
          { key: 'copyLink', label: 'Copy link',       act: () => onCopyLink?.(issue.issueKey) },
          { key: 'flag',     label: issue.isFlagged ? 'Unflag' : 'Flag', act: () => onToggleFlag?.(issue.id) },
          { key: 'archive',  label: 'Archive',         act: () => onArchive?.(issue.id) },
          { key: 'delete',   label: 'Delete',          act: () => onDelete?.(issue.id), danger: true },
        ].map((item) => (
          <button
            key={item.key}
            role="menuitem"
            onClick={() => { item.act(); setCtxMenu(null); }}
            style={{
              display: 'flex',
              width: '100%',
              padding: '6px 16px',
              fontSize: 13,
              color: (item as { danger?: boolean }).danger ? '#AE2A19' : tk.textPrimary,
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = tk.surfaceHover || '#F7F8F9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            {item.label}
          </button>
        ))}
      </div>
    )}
    </>
  );
});

export const OverlayCard = memo(function OverlayCard({ issue, avatarUrl, d, tk }: { issue: BoardIssue; avatarUrl?: string | null; d: DensityConfig; tk: KanbanThemeTokens }) {
  return (
    <div style={{
      background: tk.cardBg, borderRadius: 4, border: 'none',
      padding: d.cardPad, width: 247, minHeight: d.cardMinHeight,   /* 267 col - 2×10 gutter ≈ 247 */
      boxShadow: tk.cardDragShadow,
      transform: 'rotate(2deg)', cursor: 'grabbing', display: 'flex', flexDirection: 'column',
    }}>
      <WorkItemCard issue={issue} avatarUrl={avatarUrl} d={d} tk={tk} />
    </div>
  );
});