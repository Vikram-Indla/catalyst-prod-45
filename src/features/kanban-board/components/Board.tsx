/**
 * Board — Jira-accurate layout (live-probed board 497).
 *  • Flat: column header strip once (sticky) + one lane of tall bodies.
 *  • Grouped: per swimlane → collapsible header + a full column set (headers +
 *    bodies + per-column counts), repeated per lane (matches Jira group-by).
 * Pragmatic DnD: cross-column drop = status change (optimistic + revert).
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import EpicIcon from '@atlaskit/icon-object/glyph/epic/16';
import { ColumnHeader, ColumnBody } from './Column';
import { DraggableCard } from './DraggableCard';
import { SwimlaneHeader } from './SwimlaneHeader';
import { PriorityIcon } from './PriorityIcon';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { indexColumns, resolveColumnId } from '../data/columnConfig';
import { SIZES, STRINGS } from '../constants';
import type { BoardConfig, BoardIssue, CardVisibleFields, GroupByMode, KanbanColumn, StatusCategory } from '../types';

/* ads-scanner:ignore-next-line — epic identity palette, user-data colors, no ADS token equivalent (probed 2026-07-01) */
const EPIC_PALETTE = ['#6554C0', '#FF7452', '#36B37E', '#00B8D9', '#FF5630', '#FFAB00', '#0052CC', '#403294', '#00875A', '#BF2600'];

function epicSwatchColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return EPIC_PALETTE[Math.abs(h) % EPIC_PALETTE.length];
}

interface BoardProps {
  boardConfig: BoardConfig;
  issues: BoardIssue[];
  avatars: Map<string, string | null>;
  visibleFields: CardVisibleFields;
  selectedId: string | null;
  groupBy: GroupByMode;
  /** Set of issue ids currently busy with a per-card mutation (reorder RPC in
   *  flight). Card renders a spinner overlay for members. */
  busyIds?: Set<string>;
  collapsed: Set<string>;
  onToggleGroup: (key: string) => void;
  onSelect: (id: string) => void;
  onAvatarClick?: (issue: BoardIssue, anchor: HTMLElement) => void;
  renderMenu?: (issue: BoardIssue) => React.ReactNode;
  columnFooter?: (columnId: string, groupKey: string) => React.ReactNode;
  onMove?: (issueId: string, status: string, category: StatusCategory) => Promise<void>;
  /** Called when a card is dropped between two other cards inside a column.
   *  destColId identifies the column; newColumnIds is the desired final order
   *  (used by kanban_reorder_column RPC to rewrite board_position).
   *  movedIssueId lets the host track per-card busy state during the RPC. */
  onReorderColumn?: (destColId: string, newColumnIds: string[], movedIssueId: string) => Promise<void>;
  onAddColumn?: (name: string) => void;
  onEditSummary?: (issue: BoardIssue, summary: string) => void;
  /** Returns a health request key for a card (product mode). Null/undefined = no badge. */
  cardHealthKey?: (issue: BoardIssue) => string | null | undefined;
  /** Map of issue id → ph_designs rows. Card renders a brush icon + popover when non-empty. */
  designsByIssue?: Map<string, import('../data/useCardDesigns').CardDesignRow[]>;
  /** When true, done-category columns are hidden and replaced with a collapsed "Archived" pill. */
  hideDone?: boolean;
  onToggleHideDone?: () => void;
}

const AddColumnSlot: React.FC<{ onAdd: (name: string) => void }> = ({ onAdd }) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) ref.current?.focus(); }, [adding]);
  const cancel = () => { setName(''); setAdding(false); };
  const submit = () => { const n = name.trim(); if (n) { onAdd(n); setName(''); setAdding(false); } else { cancel(); } };
  return (
    <div style={{ width: adding ? SIZES.COLUMN_WIDTH : 40, minWidth: adding ? SIZES.COLUMN_WIDTH : 40, margin: '0 4px', flexShrink: 0 }}>
      {adding ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              ref={ref} value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { e.stopPropagation(); cancel(); } }}
              // Blur commits when there's text (Jira inline-create), cancels when empty
              // so clicking away always dismisses an empty input — no mode trap.
              onBlur={() => { name.trim() ? submit() : cancel(); }}
              placeholder="Column name"
              style={{ flex: 1, minWidth: 0, height: 36, padding: '0 8px', borderRadius: 6, border: `2px solid ${token('color.border.focused', 'var(--ds-background-information-bold)')}`, outline: 'none', fontSize: 'var(--ds-font-size-300)', fontFamily: 'inherit' }}
            />
            {/* onMouseDown fires before the input's blur, so cancel wins even with text typed */}
            <button
              type="button" aria-label="Cancel" title="Cancel"
              onMouseDown={(e) => { e.preventDefault(); cancel(); }}
              style={{ width: 28, height: 28, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', color: token('color.icon.subtle', 'var(--ds-icon-subtle)'), fontSize: 'var(--ds-font-size-500)', lineHeight: 1 }}
            >✕</button>
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)'), padding: '4px 2px 0' }}>Enter to add · Esc to cancel</div>
        </div>
      ) : (
        <button
          aria-label="Create column" onClick={() => setAdding(true)}
          style={{ width: 40, height: 40, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: token('color.background.neutral', 'rgba(5,21,36,0.06)'), color: token('color.icon.subtle', 'var(--ds-icon-subtle, var(--ds-text-subtlest))'), fontSize: 'var(--ds-font-size-700)', lineHeight: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.hovered', 'rgba(5,21,36,0.10)'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = token('color.background.neutral', 'rgba(5,21,36,0.06)'); }}
        >+</button>
      )}
    </div>
  );
};

export interface BoardGroup { key: string; label: string; avatarName?: string | null; issues: BoardIssue[]; }
type Group = BoardGroup;

const DroppableBody: React.FC<{
  colId: string; groupKey: string; ariaLabel: string; fill: boolean;
  overKey: string | null; setOver: (k: string | null) => void;
  footer?: React.ReactNode;
  items: BoardIssue[]; renderItem: (issue: BoardIssue, index: number) => React.ReactNode;
}> = ({ colId, groupKey, ariaLabel, fill, overKey, setOver, footer, items, renderItem }) => {
  const ref = useRef<HTMLDivElement>(null);
  const myKey = `${groupKey}:${colId}`;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      getData: () => ({ colId, groupKey }),
      canDrop: ({ source }) => source.data?.type === 'card',
      onDragEnter: () => setOver(myKey),
      onDragLeave: () => setOver(null),
      onDrop: () => setOver(null),
    });
  }, [colId, groupKey, myKey, setOver]);
  return <ColumnBody ref={ref} ariaLabel={ariaLabel} fill={fill} isDragOver={overKey === myKey} footer={footer} items={items} renderItem={renderItem} colId={colId} groupKey={groupKey} />;
};

export function buildGroups(issues: BoardIssue[], groupBy: GroupByMode): Group[] {
  if (groupBy === 'none') return [{ key: '__all__', label: '', issues }];
  const map = new Map<string, Group>();
  const NONE = '__none__';
  for (const i of issues) {
    let key = NONE, label = '', avatarName: string | null | undefined;
    if (groupBy === 'assignee') { key = i.assigneeName ?? NONE; label = i.assigneeName ?? STRINGS.UNASSIGNED; avatarName = i.assigneeName; }
    else if (groupBy === 'priority') { key = i.priority || NONE; label = i.priority || STRINGS.NO_PRIORITY; }
    else { /* epic + subtask → parent */ key = i.parentKey ?? NONE; label = i.parentSummary || i.parentKey || STRINGS.NO_EPIC; }
    if (!map.has(key)) map.set(key, { key, label, avatarName, issues: [] });
    map.get(key)!.issues.push(i);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => (a.key === NONE ? 1 : b.key === NONE ? -1 : a.label.localeCompare(b.label)));
  return groups;
}

export const Board: React.FC<BoardProps> = ({
  boardConfig, issues, avatars, visibleFields, selectedId, groupBy, busyIds, collapsed, onToggleGroup,
  onSelect, onAvatarClick, renderMenu, columnFooter, onMove, onReorderColumn, onAddColumn, onEditSummary, cardHealthKey, designsByIssue,
  hideDone = true, onToggleHideDone,
}) => {
  const [overKey, setOverKey] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map());

  useEffect(() => { setOverrides(new Map()); }, [issues]);

  // Bound the scroll area to a definite height (viewport − top). The project-hub
  // shell wrapper grows to content (min-height: calc(100%-2px)), so the flex
  // chain alone never caps the board — without this the columns can't scroll
  // internally and the card virtualizer's viewport is the entire content height.
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const [boardHeight, setBoardHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const measure = () => {
      const el = scrollWrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setBoardHeight(Math.max(240, Math.floor(window.innerHeight - top - 8)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const idx = useMemo(() => indexColumns(boardConfig.columns), [boardConfig.columns]);
  const colOf = (issue: BoardIssue) => overrides.get(issue.id) ?? resolveColumnId(issue, idx);

  const groups = useMemo(() => buildGroups(issues, groupBy), [issues, groupBy]);

  useEffect(() => monitorForElements({
    canMonitor: ({ source }) => source.data?.type === 'card',
    onDrop: ({ source, location }) => {
      const dest = location.current.dropTargets[0];
      const issueId = source.data?.issueId as string | undefined;
      const fromColId = source.data?.fromColId as string | undefined;
      if (!issueId || !dest) return;

      /* 2026-06-21 (Vikram canonical): freeze done items. If the card's
         CURRENT column maps to category 'done', reject any move silently —
         the drop preview already snapped; we restore the original column. */
      const fromCol = fromColId ? boardConfig.columns.find((c) => c.id === fromColId) : undefined;
      if (fromCol?.category === 'done') return;

      /* Two shapes of drop target:
           - column body        → { type: undefined, colId }
           - per-card drop slot → { type: 'card-slot', targetIssueId, colId, [closestEdge] } */
      const destColId = dest.data?.colId as string | undefined;
      if (!destColId) return;
      const col = boardConfig.columns.find((c) => c.id === destColId);
      const status = idx.colPrimaryStatus[destColId];
      if (!col || !status) return;

      const destType = dest.data?.type as string | undefined;
      const isCardSlot = destType === 'card-slot';
      const isEndSlot  = destType === 'end-slot';
      const targetIssueId = isCardSlot ? (dest.data?.targetIssueId as string | undefined) : undefined;
      const edge = isCardSlot ? extractClosestEdge(dest.data) : null;

      const columnIssueIds: string[] = [];
      for (const i of issues) {
        const c = colOf(i);
        if (c === destColId) columnIssueIds.push(i.id);
      }

      const sameColumn = destColId === fromColId;
      const willStatusChange = !sameColumn;

      // Compute new order for the destination column when we have a slot target.
      let newColumnIds: string[] | null = null;
      if (isCardSlot && targetIssueId) {
        const withoutMoved = columnIssueIds.filter((id) => id !== issueId);
        const tIdx = withoutMoved.indexOf(targetIssueId);
        if (tIdx === -1) {
          newColumnIds = null;
        } else {
          const insertAt = edge === 'bottom' ? tIdx + 1 : tIdx;
          newColumnIds = [...withoutMoved.slice(0, insertAt), issueId, ...withoutMoved.slice(insertAt)];
        }
      } else if (isEndSlot) {
        const withoutMoved = columnIssueIds.filter((id) => id !== issueId);
        newColumnIds = [...withoutMoved, issueId];
      }

      if (willStatusChange) {
        setOverrides((m) => new Map(m).set(issueId, destColId));
        const p = onMove?.(issueId, status, col.category);
        p?.catch(() => setOverrides((m) => { const n = new Map(m); n.delete(issueId); return n; }));
        // After status change is queued, if there's a specific slot the user
        // dropped into, also rewrite the destination column order. Refetch
        // downstream will apply both.
        if (newColumnIds && onReorderColumn) {
          Promise.resolve(p).then(() => onReorderColumn(destColId, newColumnIds!, issueId)).catch(() => {});
        }
        return;
      }

      // Same column reorder — only fires when the user dropped on a card-slot.
      if (sameColumn && newColumnIds && onReorderColumn) {
        onReorderColumn(destColId, newColumnIds, issueId).catch(() => {});
      }
    },
  }), [boardConfig.columns, idx, issues, onMove, onReorderColumn]);

  const grouped = groupBy !== 'none';

  const renderCard = (issue: BoardIssue) => (
    <DraggableCard
      key={issue.id}
      issue={issue}
      fromColId={colOf(issue) ?? ''}
      isSelected={selectedId === issue.id}
      isBusy={busyIds?.has(issue.id)}
      avatarUrl={issue.assigneeName ? avatars.get(issue.assigneeName) : null}
      visibleFields={visibleFields}
      onSelect={onSelect}
      onAvatarClick={onAvatarClick}
      onEditSummary={onEditSummary}
      menuSlot={renderMenu?.(issue)}
      healthRequestKey={cardHealthKey?.(issue)}
      designs={designsByIssue?.get(issue.id)}
    />
  );

  const visibleColumns = useMemo(
    () => hideDone ? boardConfig.columns.filter((c) => c.category !== 'done') : boardConfig.columns,
    [boardConfig.columns, hideDone],
  );
  const doneColumns = useMemo(
    () => boardConfig.columns.filter((c) => c.category === 'done'),
    [boardConfig.columns],
  );

  const bucketize = (groupIssues: BoardIssue[]) => {
    const bucket = new Map<string, BoardIssue[]>();
    boardConfig.columns.forEach((c) => bucket.set(c.id, []));
    for (const i of groupIssues) { const c = colOf(i); if (c && bucket.has(c)) bucket.get(c)!.push(i); }
    return bucket;
  };

  return (
    <div ref={scrollWrapRef} className="kb-board-scroll" style={{
      flex: 1, minHeight: 0, minWidth: 0, overflowX: 'auto', overflowY: 'auto',
      height: boardHeight, maxHeight: boardHeight,
      background: token('elevation.surface', 'var(--ds-surface)'), display: 'flex', flexDirection: 'column',
    }}>
      {/* Defer columns until the board height is measured, so each ColumnBody's
          card virtualizer mounts into an already-bounded scroll container (its
          first viewport read is the real height, not the full content). The
          measure runs in useLayoutEffect — before paint — so there's no flash. */}
      {boardHeight !== undefined && groups.map((g, gi) => {
        const isCollapsed = grouped && collapsed.has(g.key);
        const bucket = bucketize(g.issues);
        return (
          <div key={g.key} style={{ width: 'max-content', ...(grouped ? {} : { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }) }}>
            {grouped && (
              <SwimlaneHeader
                label={g.label} count={g.issues.length} collapsed={isCollapsed}
                showAvatar={groupBy === 'assignee'} avatarName={g.avatarName}
                avatarUrl={g.avatarName ? avatars.get(g.avatarName) : null}
                labelNode={
                  groupBy === 'epic' && g.key !== '__none__' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <EpicIcon label="" />
                      {/* ads-scanner:ignore-next-line — epic identity swatch; real Jira epic color when synced (epic_color on ph_issues), hashed placeholder otherwise — see CAT-KANBAN-EPIC-COLOR-20260702-001 */}
                      <span style={{ width: 20, height: 20, borderRadius: 2, background: g.issues[0]?.parentColor || epicSwatchColor(g.key), flexShrink: 0, display: 'inline-block' }} />
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); useGlobalSearchStore.getState().openDetail({ id: g.key }); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); useGlobalSearchStore.getState().openDetail({ id: g.key }); } }}
                        style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), fontWeight: 500, lineHeight: '16px', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                      >
                        {g.key}
                      </span>
                    </span>
                  ) : groupBy === 'priority' && g.key !== '__none__' ? (
                    <PriorityIcon priority={g.key} size={16} />
                  ) : undefined
                }
                trailingNode={
                  groupBy === 'epic' && g.key !== '__none__' && g.issues[0]?.parentStatus ? (
                    <Lozenge appearance="default" isBold>{g.issues[0].parentStatus}</Lozenge>
                  ) : undefined
                }
                onToggle={() => onToggleGroup(g.key)}
              />
            )}
            {!isCollapsed && (
              <div style={{ display: 'flex', padding: `8px ${SIZES.PAGE_PADDING_X - 4}px 12px`, alignItems: 'stretch', ...(grouped ? {} : { flex: 1, minHeight: 0 }) }}>
                {visibleColumns.map((column: KanbanColumn) => {
                  const colIssues = bucket.get(column.id) ?? [];
                  // Every column is a grey box with header inside (flat + grouped),
                  // matching Jira (probed rgb(248,248,248), no separate strip).
                  return (
                    <div
                      key={column.id}
                      className="kb-column"
                      style={{
                        width: SIZES.COLUMN_WIDTH, minWidth: SIZES.COLUMN_WIDTH, margin: '0 4px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        background: token('elevation.surface.sunken', 'var(--ds-surface-sunken)'),
                        borderRadius: 6, paddingBottom: 4,
                        ...(grouped ? {} : { height: '100%', minHeight: 0 }),
                      }}
                    >
                      <ColumnHeader column={column} count={colIssues.length} />
                      <DroppableBody
                        colId={column.id}
                        groupKey={g.key}
                        ariaLabel={`${column.name}${grouped ? ` — ${g.label}` : ''} column, ${colIssues.length} work items`}
                        fill={!grouped}
                        overKey={overKey}
                        setOver={setOverKey}
                        footer={columnFooter?.(column.id, g.key)}
                        items={colIssues}
                        renderItem={renderCard}
                      />
                    </div>
                  );
                })}
                {/* Archived pill — collapsed done column summary */}
                {doneColumns.length > 0 && (() => {
                  const doneCount = doneColumns.reduce((sum, c) => sum + (bucket.get(c.id)?.length ?? 0), 0);
                  return (
                    <div
                      style={{
                        width: hideDone ? 48 : SIZES.COLUMN_WIDTH,
                        minWidth: hideDone ? 48 : SIZES.COLUMN_WIDTH,
                        margin: '0 4px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        background: token('elevation.surface.sunken', 'var(--ds-surface-sunken)'),
                        borderRadius: 6, overflow: 'hidden',
                        transition: 'width 200ms ease, min-width 200ms ease',
                        ...(grouped ? {} : { height: '100%', minHeight: 0 }),
                      }}
                    >
                      {hideDone ? (
                        <button
                          onClick={onToggleHideDone}
                          title={`Show archived (${doneCount} items)`}
                          aria-label={`Show archived column — ${doneCount} done items`}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 4, height: '100%', width: '100%', border: 'none', background: 'transparent',
                            cursor: 'pointer', padding: '12px 4px',
                            color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
                          }}
                        >
                          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'inherit' }}>
                            Archived
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: '50%',
                            background: token('color.background.neutral.hovered', 'rgba(9,30,66,0.08)'),
                            fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'inherit',
                          }}>
                            {doneCount}
                          </span>
                        </button>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px 6px' }}>
                            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: token('color.text.subtle', 'var(--ds-text-subtle)'), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Archived ({doneCount})
                            </span>
                            <button
                              onClick={onToggleHideDone}
                              title="Collapse archived column"
                              aria-label="Collapse archived column"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', lineHeight: 1, padding: 0, color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}
                            >✕</button>
                          </div>
                          {doneColumns.map((column) => {
                            const colIssues = bucket.get(column.id) ?? [];
                            return (
                              <div key={column.id} className="kb-column" style={{ marginBottom: 8 }}>
                                <ColumnHeader column={column} count={colIssues.length} />
                                <DroppableBody
                                  colId={column.id}
                                  groupKey={g.key}
                                  ariaLabel={`${column.name} archived column, ${colIssues.length} items`}
                                  fill={false}
                                  overKey={overKey}
                                  setOver={setOverKey}
                                  footer={columnFooter?.(column.id, g.key)}
                                  items={colIssues}
                                  renderItem={renderCard}
                                />
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })()}
                {gi === 0 && onAddColumn && <AddColumnSlot onAdd={onAddColumn} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
