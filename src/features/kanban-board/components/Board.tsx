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
import { ColumnHeader, ColumnBody } from './Column';
import { DraggableCard } from './DraggableCard';
import { SwimlaneHeader } from './SwimlaneHeader';
import { indexColumns, resolveColumnId } from '../data/columnConfig';
import { SIZES, STRINGS } from '../constants';
import type { BoardConfig, BoardIssue, CardVisibleFields, GroupByMode, KanbanColumn, StatusCategory } from '../types';

interface BoardProps {
  boardConfig: BoardConfig;
  issues: BoardIssue[];
  avatars: Map<string, string | null>;
  visibleFields: CardVisibleFields;
  selectedId: string | null;
  groupBy: GroupByMode;
  onSelect: (id: string) => void;
  onAvatarClick?: (issue: BoardIssue, anchor: HTMLElement) => void;
  renderMenu?: (issue: BoardIssue) => React.ReactNode;
  columnFooter?: (columnId: string) => React.ReactNode;
  onMove?: (issueId: string, status: string, category: StatusCategory) => Promise<void>;
  onAddColumn?: (name: string) => void;
  onEditSummary?: (issue: BoardIssue, summary: string) => void;
  /** Returns a health request key for a card (product mode). Null/undefined = no badge. */
  cardHealthKey?: (issue: BoardIssue) => string | null | undefined;
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
              style={{ flex: 1, minWidth: 0, height: 36, padding: '0 8px', borderRadius: 6, border: `2px solid ${token('color.border.focused', '#4C9AFF')}`, outline: 'none', fontSize: 13, fontFamily: 'inherit' }}
            />
            {/* onMouseDown fires before the input's blur, so cancel wins even with text typed */}
            <button
              type="button" aria-label="Cancel" title="Cancel"
              onMouseDown={(e) => { e.preventDefault(); cancel(); }}
              style={{ width: 28, height: 28, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', color: token('color.icon.subtle', '#626F86'), fontSize: 16, lineHeight: 1 }}
            >✕</button>
          </div>
          <div style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86'), padding: '4px 2px 0' }}>Enter to add · Esc to cancel</div>
        </div>
      ) : (
        <button
          aria-label="Create column" onClick={() => setAdding(true)}
          style={{ width: 40, height: 40, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: token('color.background.neutral', 'rgba(5,21,36,0.06)'), color: token('color.icon.subtle', '#626F86'), fontSize: 20, lineHeight: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.hovered', 'rgba(5,21,36,0.10)'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = token('color.background.neutral', 'rgba(5,21,36,0.06)'); }}
        >+</button>
      )}
    </div>
  );
};

interface Group { key: string; label: string; avatarName?: string | null; issues: BoardIssue[]; }

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
  return <ColumnBody ref={ref} ariaLabel={ariaLabel} fill={fill} isDragOver={overKey === myKey} footer={footer} items={items} renderItem={renderItem} />;
};

function buildGroups(issues: BoardIssue[], groupBy: GroupByMode): Group[] {
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
  boardConfig, issues, avatars, visibleFields, selectedId, groupBy, onSelect, onAvatarClick, renderMenu, columnFooter, onMove, onAddColumn, onEditSummary, cardHealthKey,
}) => {
  const [overKey, setOverKey] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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
      const destColId = dest?.data?.colId as string | undefined;
      const issueId = source.data?.issueId as string | undefined;
      const fromColId = source.data?.fromColId as string | undefined;
      if (!destColId || !issueId || destColId === fromColId) return;
      const col = boardConfig.columns.find((c) => c.id === destColId);
      const status = idx.colPrimaryStatus[destColId];
      if (!col || !status) return;
      /* 2026-06-21 (Vikram canonical): freeze done items. If the card's
         CURRENT column maps to category 'done', reject the move silently —
         the drop preview already snapped; we restore the original column. */
      const fromCol = fromColId ? boardConfig.columns.find((c) => c.id === fromColId) : undefined;
      if (fromCol?.category === 'done') return;
      setOverrides((m) => new Map(m).set(issueId, destColId));
      onMove?.(issueId, status, col.category).catch(() =>
        setOverrides((m) => { const n = new Map(m); n.delete(issueId); return n; }));
    },
  }), [boardConfig.columns, idx, onMove]);

  const grouped = groupBy !== 'none';

  const renderCard = (issue: BoardIssue) => (
    <DraggableCard
      key={issue.id}
      issue={issue}
      fromColId={colOf(issue) ?? ''}
      isSelected={selectedId === issue.id}
      avatarUrl={issue.assigneeName ? avatars.get(issue.assigneeName) : null}
      visibleFields={visibleFields}
      onSelect={onSelect}
      onAvatarClick={onAvatarClick}
      onEditSummary={onEditSummary}
      menuSlot={renderMenu?.(issue)}
      healthRequestKey={cardHealthKey?.(issue)}
    />
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
      background: token('elevation.surface', '#FFFFFF'), display: 'flex', flexDirection: 'column',
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
                onToggle={() => setCollapsed((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })}
              />
            )}
            {!isCollapsed && (
              <div style={{ display: 'flex', padding: `8px ${SIZES.PAGE_PADDING_X - 4}px 12px`, alignItems: 'stretch', ...(grouped ? {} : { flex: 1, minHeight: 0 }) }}>
                {boardConfig.columns.map((column: KanbanColumn) => {
                  const colIssues = bucket.get(column.id) ?? [];
                  // Every column is a grey box with header inside (flat + grouped),
                  // matching Jira (probed rgba(5,21,36,0.06) r6, no separate strip).
                  return (
                    <div
                      key={column.id}
                      style={{
                        width: SIZES.COLUMN_WIDTH, minWidth: SIZES.COLUMN_WIDTH, margin: '0 4px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        background: token('color.background.neutral', 'rgba(5,21,36,0.06)'),
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
                        footer={columnFooter?.(column.id)}
                        items={colIssues}
                        renderItem={renderCard}
                      />
                    </div>
                  );
                })}
                {gi === 0 && onAddColumn && <AddColumnSlot onAdd={onAddColumn} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
