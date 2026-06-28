/**
 * SortableCard — DnD-enabled wrapper around WorkItemCard (memoized)
 * Jira parity: 4px radius, shadow-only (no border), dual-stack shadow.
 */
import React, { useCallback, memo, useState, useEffect, useRef } from 'react';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { WorkItemCard } from './WorkItemCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';
import type { AssigneeOption } from './AssigneePickerPopover';
import type { VisibleFields, CardColorMode } from '@/hooks/useKanbanViewSettings';
import { CARD_COLOR_BY_PRIORITY, CARD_COLOR_BY_TYPE } from './kanban-types';

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
  cardColorMode?: CardColorMode;
  subtasks?: import('./kanban-types').BoardIssue[];
}

export const SortableCard = memo(function SortableCard({ issue, avatarUrl, onClick, d, tk, isSelected, isFocused, onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onOpenDetail, onSaveSummary, onChangeAssignee, assigneeOptions, avatarsByName, projectKey, onLabelsUpdated, onParentChange, onArchive, onDelete, onMoved, onLinked, visibleFields, cardColorMode, subtasks }: SortableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({ issueId: issue.id }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [issue.id]);

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
    border: 'none',
    /* 2026-06-15: lifted each card with a soft rest shadow instead of an
       inside-the-card hairline borderBottom. The shadow gives every card a
       consistent visual envelope so the 8px gap reads as rhythm rather than
       "stripes of varying height". Mirrors PragmaticCard. */
    borderBottom: 'none',
    borderLeft: isSelected
      ? `3px solid ${tk.selectedAccent}`
      : (() => {
          if (cardColorMode === 'priority') {
            const c = CARD_COLOR_BY_PRIORITY[(issue.priority ?? '').toLowerCase()];
            return c ? `3px solid ${c}` : 'none';
          }
          if (cardColorMode === 'issueType') {
            const c = CARD_COLOR_BY_TYPE[(issue.issueType ?? '').toLowerCase()];
            return c ? `3px solid ${c}` : 'none';
          }
          return 'none';
        })(),
    padding: d.cardPad,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'background 120ms ease, box-shadow 120ms ease, border-left 120ms ease',
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 999 : 'auto',
    boxShadow: isDragging
      ? tk.cardDragShadow
      : isFocused
        ? focusShadow
        : tk.cardShadowRest,
    position: 'relative' as const,
    outline: 'none',
    overflow: 'visible',
  };

  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <>
    <div
      ref={cardRef}
      style={cardStyle}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.background = tk.cardHoverBg;
          e.currentTarget.querySelectorAll('.kanban-card-menu-btn, .kanban-card-edit-btn').forEach((el) => {
            (el as HTMLElement).style.opacity = '1';
          });
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = tk.cardBg;
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
        subtasks={subtasks}
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
          background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
          borderRadius: 4,
          boxShadow: 'var(--ds-shadow-raised, rgba(9,30,66,0.31)) 0 0 1px, var(--ds-shadow-raised, rgba(9,30,66,0.25)) 0 4px 8px -2px',
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
            type="button"
            role="menuitem"
            onClick={() => { item.act(); setCtxMenu(null); }}
            style={{
              display: 'flex',
              width: '100%',
              padding: '8px 16px',
              fontSize: 13,
              color: (item as { danger?: boolean }).danger ? 'var(--ds-text-danger, var(--ds-text-danger, #AE2A19))' : tk.textPrimary,
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = tk.surfaceHover || 'var(--ds-surface-sunken, var(--ds-background-neutral-subtle, #F7F8F9))'; }}
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