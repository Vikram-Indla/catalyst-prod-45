/**
 * KanbanPage — route entry for the brand-new Kanban board.
 * Mounted at /project-hub/:key/kanban. 100% Atlaskit; shares only the data source.
 */
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { AddFlagModal } from '@/components/workhub/issue-view/IssueActionDialogs';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBoardBySlug } from '@/hooks/useBoardBySlug';
import { token } from '@atlaskit/tokens';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { Board, buildGroups } from './components/Board';
import { Toolbar } from './components/Toolbar';
import { CardContextMenu } from './components/CardContextMenu';
import { AddLabelsModal } from './components/AddLabelsModal';
import { LinkWorkItemModal } from './components/LinkWorkItemModal';
import AddIcon from '@atlaskit/icon/glyph/add';
import { InlineCreateCard } from '@/components/kanban/InlineCreateCard';
import { AssigneePicker } from './components/AssigneePicker';
import { StandupPanel } from './components/StandupPanel';
/* StandupHistoryPanel import removed 2026-06-15 — the panel is now mounted
   by the standalone /:hub/:key/standups page, not in-board. */
import { PortalMenu, MenuItem } from './components/PortalMenu';
import { useKanbanData } from './data/useKanbanData';
import { useBoardAvatars } from './data/useBoardAvatars';
import { useKanbanMutations } from './data/useKanbanMutations';
import { useCurrentUser } from './data/useCurrentUser';
import { captureStandupSession } from './data/standupCapture';
import { useKanbanFilters } from './hooks/useKanbanFilters';
import { catalystFlag } from '@/lib/catalystFlag';
import { indexColumns, resolveColumnId } from './data/columnConfig';
import { useCardDesigns } from './data/useCardDesigns';
import { DEFAULT_VISIBLE_FIELDS, SIZES, STRINGS } from './constants';
import type { BoardIssue, CardVisibleFields, StatusCategory, KanbanColumn } from './types';
import './styles.css';

/* 2026-06-15: mode prop lets the same KanbanPage power both /project-hub/:key/boards/:boardId
   (mode='project', default) and /product-hub/:key/boards/:boardId (mode='product').
   2026-06-16: 'incident' mode added for /incident-hub/board — no :key in URL,
   so `keyOverride` is supplied directly by the host page (sentinel 'INCIDENTS').
   2026-06-17: 'tasks' mode added for /tasks/board — columns from task_statuses,
   rows from `tasks` table, no :key in URL (sentinel 'TASKS').
   useKanbanData + useKanbanMutations branch internally on the same mode value. */
interface KanbanPageProps {
  mode?: 'project' | 'product' | 'incident' | 'tasks' | 'release' | 'test';
  /** When set, overrides the URL :key param. Used by surfaces where the
   *  board route doesn't carry a :key (e.g. /incident-hub/board, /tasks/board,
   *  /release-hub/release-kanban). */
  keyOverride?: string;
}

export default function KanbanPage({ mode = 'project', keyOverride }: KanbanPageProps = {}) {
  const params = useParams<{ key: string; boardSlug?: string }>();
  const key = keyOverride ?? params.key;
  const kanbanFilterContext = mode === 'test' ? 'testhub' : mode === 'incident' ? 'incident' : mode === 'tasks' ? 'tasks' : mode === 'product' ? 'product' : 'project';
  const boardSlug = params.boardSlug;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Resolve boardSlug (or legacy UUID) → board.id for internal data hooks.
  const { data: resolvedBoard } = useBoardBySlug(boardSlug ?? searchParams.get('board') ?? undefined);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  React.useEffect(() => {
    if (resolvedBoard?.id) setActiveBoardId(resolvedBoard.id);
  }, [resolvedBoard?.id]);
  const [standupActive, setStandupActive] = useState(false);
  const [standupPerson, setStandupPerson] = useState<string | null>(null);
  const standupStartedAt = useRef<Date | null>(null);
  const [standupTimerSec, setStandupTimerSec] = useState(300);
  /* 2026-06-15: historyOpen retired. The kebab "Standup history" item now
     navigates to /:hub/:key/standups (mode-aware) instead of opening an
     in-board panel. */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Deselect a card when the user clicks anywhere outside a card OR its
     related menu portals (⋯ context menu, Move/Change submenus). Without
     this the blue selection border sticks forever after clicking a card
     even when the user has moved on to another surface. */
  React.useEffect(() => {
    if (!selectedId) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-issue-id]')) return;         // clicked another card / same card body
      if (target.closest('[role="menu"]')) return;           // ⋯ menu OR any submenu portal
      if (target.closest('[data-kanban-submenu="true"]')) return;
      if (target.closest('[role="dialog"]')) return;         // modal / drawer clicks
      setSelectedId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [selectedId]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; issueKey: string } | null>(null);
  const [flagTarget, setFlagTarget] = useState<BoardIssue | null>(null);
  const [linkTarget, setLinkTarget] = useState<BoardIssue | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelModalIssue, setLabelModalIssue] = useState<BoardIssue | null>(null);
  /* Tracks which column currently has the inline create form expanded. Only
     one form is open at a time across the whole board. */
  const [openCreateCol, setOpenCreateCol] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<CardVisibleFields>(() => {
    try {
      const saved = localStorage.getItem('kanban-visible-fields');
      // Merge with defaults so new fields always get their initial value
      return saved ? { ...DEFAULT_VISIBLE_FIELDS, ...JSON.parse(saved) } : { ...DEFAULT_VISIBLE_FIELDS };
    } catch {
      return { ...DEFAULT_VISIBLE_FIELDS };
    }
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const onToggleGroup = useCallback((key: string) => {
    setCollapsed((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);
  const toggleField = useCallback((f: keyof CardVisibleFields) => {
    setVisibleFields((v) => {
      const updated = { ...v, [f]: !v[f] };
      try { localStorage.setItem('kanban-visible-fields', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);
  const onCopyBoardLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href);
  }, []);

  const { projectId, projectName, boardConfig: baseBoardConfig, boards, issues, isLoading, error: boardError, refetch } = useKanbanData(key, activeBoardId, mode);
  const [extraColumns, setExtraColumns] = useState<KanbanColumn[]>([]);
  const boardConfig = useMemo(() =>
    extraColumns.length ? { ...baseBoardConfig, columns: [...baseBoardConfig.columns, ...extraColumns] } : baseBoardConfig,
    [baseBoardConfig, extraColumns]);
  const onAddColumn = useCallback((name: string) =>
    setExtraColumns((c) => [...c, { id: `local-col-${c.length}-${name}`, name, statuses: [name], category: 'in_progress', max: null }]),
    []);
  // Map statuses → columns: use slug for navigation (resolvedBoard.slug from URL resolution).
  const onMapStatuses = useCallback(() => {
    const slug = resolvedBoard?.slug ?? boardSlug;
    if (key && slug) navigate(`/project-hub/${key}/boards/${slug}/map-statuses`);
  }, [key, resolvedBoard?.slug, boardSlug, navigate]);
  const [hideDone, setHideDone] = useState(true);
  const { updateStatus, updateAssignee, createIssue, updateSummary, addLabel, setLabels, archiveIssue, deleteIssue, setParent, linkIssue, moveIssuePosition, reorderColumn, setCover } = useKanbanMutations(mode);
  const currentUser = useCurrentUser();
  const [assigneeTarget, setAssigneeTarget] = useState<{ issue: BoardIssue; anchor: HTMLElement } | null>(null);
  /* Cards currently mid-mutation (menu Move Up/Down, ⋯ Change status click,
     or drag-drop reorder). Board renders the skeleton overlay for each id. */
  const [reorderBusyIds, setReorderBusyIds] = useState<Set<string>>(new Set());
  const onAssign = useCallback(async (issue: BoardIssue, name: string | null) => {
    await updateAssignee(issue.id, name, null); refetch();
  }, [updateAssignee, refetch]);

  const onMove = useCallback(async (issueId: string, status: string, category: StatusCategory) => {
    // Mark card busy so <Card> shows the skeleton overlay while the status
    // write + refetch run. Covers both the ⋯ → Change status click AND the
    // cross-column drag-drop path (Board monitor onDrop calls onMove).
    setReorderBusyIds((s) => { const n = new Set(s); n.add(issueId); return n; });
    try {
      await updateStatus(issueId, status, category);
      await refetch();
    } catch (err) {
      // Rethrow so Board's onDrop cancels the follow-up reorder RPC. Toast
      // surfaces the canonical workflow / RLS message to the user (silent
      // failures left cards stuck in the source column looking reordered).
      const msg = err instanceof Error ? err.message : 'Move blocked';
      console.error('[kanban] updateStatus failed', err);
      catalystFlag.error(msg);
      throw err;
    } finally {
      setReorderBusyIds((s) => { const n = new Set(s); n.delete(issueId); return n; });
    }
  }, [updateStatus, refetch]);

  const onFlag = useCallback((issue: BoardIssue) => {
    setFlagTarget(issue);
  }, []);
  const onCopyLink = useCallback((issue: BoardIssue) => {
    navigator.clipboard?.writeText(`${window.location.origin}/project-hub/${key}/issue/${issue.issueKey}`);
  }, [key]);
  const onCopyKey = useCallback((issue: BoardIssue) => {
    navigator.clipboard?.writeText(issue.issueKey);
  }, []);
  const onAddLabel = useCallback((issue: BoardIssue) => {
    setLabelModalIssue(issue);
    setShowLabelModal(true);
  }, []);
  const onArchive = useCallback(async (issue: BoardIssue) => { await archiveIssue(issue.id); refetch(); }, [archiveIssue, refetch]);
  const onDelete = useCallback((issue: BoardIssue) => {
    setDeleteTarget({ id: issue.id, issueKey: issue.issueKey });
  }, []);
  const onEditSummary = useCallback(async (issue: BoardIssue, summary: string) => {
    if (summary.trim() && summary !== issue.summary) { await updateSummary(issue.id, summary.trim()); refetch(); }
  }, [updateSummary, refetch]);
  const onSetParent = useCallback(async (issue: BoardIssue, parentKey: string, parentSummary: string) => {
    await setParent(issue.id, parentKey, parentSummary); refetch();
  }, [setParent, refetch]);
  const onSetCover = useCallback(async (issue: BoardIssue, cover: string | null) => {
    try {
      await setCover(issue.id, cover);
    } catch (err) {
      console.error('[kanban] setCover failed', err);
    } finally {
      refetch();
    }
  }, [setCover, refetch]);
  const onLinkOpen = useCallback((issue: BoardIssue) => {
    // 2026-07-01: Link work item opens the Jira-parity LinkWorkItemModal
    // (link-type select, async search, "+ Create linked work item" +
    // "Give feedback" entries). Replaces the old side-submenu picker.
    setLinkTarget(issue);
  }, []);

  /* Per-column ordered id lists — used by the "Move work item" submenu to
     compute disabled bounds and to tell the RPC which neighbour to swap with.
     `issues` is already sorted by the data query (board_position asc nullsLast,
     then updated_at/jira_updated_at desc), so we just bucket by column. */
  const columnIdx = useMemo(() => indexColumns(boardConfig.columns), [boardConfig.columns]);
  const columnIssueIdsByCol = useMemo(() => {
    const bucket = new Map<string, string[]>();
    for (const col of boardConfig.columns) bucket.set(col.id, []);
    for (const i of issues) {
      const c = resolveColumnId(i, columnIdx);
      if (c && bucket.has(c)) bucket.get(c)!.push(i.id);
    }
    return bucket;
  }, [issues, boardConfig.columns, columnIdx]);

  const onReorderColumn = useCallback(async (_destColId: string, newColumnIds: string[], movedIssueId: string) => {
    setReorderBusyIds((s) => { const n = new Set(s); n.add(movedIssueId); return n; });
    try {
      await reorderColumn(newColumnIds);
      await refetch();
    } catch (err) {
      console.error('[kanban] reorderColumn failed', err);
    } finally {
      setReorderBusyIds((s) => { const n = new Set(s); n.delete(movedIssueId); return n; });
    }
  }, [reorderColumn, refetch]);
  const onReorder = useCallback(async (issueId: string, direction: 'up' | 'down' | 'top' | 'bottom', columnIssueIds: string[]) => {
    // Mark card busy so <Card> shows a spinner overlay while the RPC + refetch
    // run — otherwise the click looks silent for the 200-500ms round trip.
    setReorderBusyIds((s) => { const n = new Set(s); n.add(issueId); return n; });
    try {
      await moveIssuePosition(issueId, direction, columnIssueIds);
      await refetch();
    } catch (err) {
      console.error('[kanban] moveIssuePosition failed', err);
    } finally {
      setReorderBusyIds((s) => { const n = new Set(s); n.delete(issueId); return n; });
    }
  }, [moveIssuePosition, refetch]);

  const renderMenu = useCallback((issue: BoardIssue) => {
    const colId = resolveColumnId(issue, columnIdx);
    const columnIssueIds = colId ? (columnIssueIdsByCol.get(colId) ?? []) : [];
    return (
      <CardContextMenu
        issue={issue}
        issues={issues}
        columns={boardConfig.columns}
        colPrimaryStatus={boardConfig.colPrimaryStatus}
        columnIssueIds={columnIssueIds}
        onMoveStatus={(id, status, category) => onMove(id, status, category)}
        onReorder={onReorder}
        onCopyLink={onCopyLink} onCopyKey={onCopyKey} onFlag={onFlag}
        onAddLabel={onAddLabel} onSetParent={onSetParent} onLinkOpen={onLinkOpen}
        onSetCover={onSetCover}
        coverTable={mode === 'product' ? 'business_requests'
                  : mode === 'tasks'   ? 'tasks'
                  : mode === 'release' ? 'rh_releases'
                  : mode === 'test'    ? 'tm_test_cases'
                  :                      'ph_issues'}
        onArchive={onArchive} onDelete={onDelete}
      />
    );
  }, [issues, boardConfig.columns, boardConfig.colPrimaryStatus, columnIdx, columnIssueIdsByCol, onMove, onReorder, onCopyLink, onCopyKey, onFlag, onAddLabel, onSetParent, onLinkOpen, onSetCover, onArchive, onDelete]);

  /* 2026-06-15: swapped the project-board's bespoke InlineCreate (broken type
     dropdown + native showPicker date input) for the canonical InlineCreateCard
     used by PragmaticBoard / product board. State for which column is in
     "create mode" lives at the page level so only one form is open at a time.
     The canonical component writes directly to ph_issues; we just refetch on
     success. */
  const columnFooter = useCallback((colId: string, groupKey: string = '__all__') => {
    const col = boardConfig.columns.find((c) => c.id === colId);
    if (!col || !key) return null;
    const status = boardConfig.colPrimaryStatus[colId] ?? col.statuses[0];
    if (!status) return null;
    const footerKey = `${groupKey}:${colId}`;

    if (openCreateCol === footerKey) {
      return (
        <div style={{ margin: '0px 8px 4px' }}>
          <InlineCreateCard
            projectKey={key.toUpperCase()}
            columnId={colId}
            status={status}
            mode={mode}
            /* 2026-06-17: lock the creatable type per hub —
                 product   → Business Request
                 incident  → Production Incident
                 tasks     → Task
                 project   → undefined (canonical 9-type list, default Story).
               Locking the type makes the dropdown reflect the only
               entity that surface actually creates, and the default
               selection matches the hub. */
            creatableTypes={
              mode === 'product'
                ? ['Business Request']
                : mode === 'incident'
                  ? ['Production Incident']
                  : mode === 'tasks'
                    ? ['Task']
                    : mode === 'release'
                      ? ['Release']
                      : mode === 'test'
                        ? ['Test Case']
                        : undefined
            }
            onCreateCard={() => { setOpenCreateCol(null); refetch(); }}
            onCancel={() => setOpenCreateCol(null)}
          />
        </div>
      );
    }

    return (
      <button
        type="button"
        className="kb-create-trigger"
        onClick={() => setOpenCreateCol(footerKey)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, width: 'calc(100% - 16px)',
          padding: '4px 8px', margin: '0px 8px 4px', border: 'none', borderRadius: SIZES.CARD_RADIUS,
          background: 'transparent', color: token('color.text.subtle', 'var(--ds-icon)'),
          fontSize: 'var(--ds-font-size-400)', fontFamily: 'inherit', cursor: 'pointer',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <AddIcon label="" size="small" primaryColor="var(--ds-icon-subtle)" />
        {STRINGS.CREATE_ISSUE}
      </button>
    );
  }, [boardConfig, key, openCreateCol, refetch]);

  const filterApi = useKanbanFilters(issues, 'none');
  const { filtered } = filterApi;

  const boardIssues = useMemo(() => {
    if (!standupActive || !standupPerson) return filtered;
    if (standupPerson === STRINGS.UNASSIGNED) return filtered.filter((i) => !i.assigneeName);
    return filtered.filter((i) => i.assigneeName === standupPerson);
  }, [standupActive, standupPerson, filtered]);

  const avatars = useBoardAvatars(useMemo(() => issues.map((i) => i.assigneeName).filter(Boolean) as string[], [issues]));

  // Bulk-fetch attached designs for every card currently rendered so the
  // brush icon + popover can appear without one query per card.
  const boardIssueIds = useMemo(() => boardIssues.map((i) => i.id), [boardIssues]);
  const { data: designsByIssue } = useCardDesigns(boardIssueIds);

  const boardGroups = useMemo(() => buildGroups(boardIssues, filterApi.groupBy), [boardIssues, filterApi.groupBy]);
  const onExpandAll = useCallback(() => setCollapsed(new Set()), []);
  const onCollapseAll = useCallback(() => setCollapsed(new Set(boardGroups.map((g) => g.key))), [boardGroups]);
  const hasSwimlanes = filterApi.groupBy !== 'none';
  const showEpic = mode === 'project';
  const showDueDate = mode === 'project' || mode === 'tasks' || mode === 'release';

  const idToKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of issues) m.set(i.id, i.issueKey);
    return m;
  }, [issues]);

  // Card click → open the canonical Catalyst detail (Atlaskit-compliant,
  // ph_issues-backed by issue_key). Highlight selection locally too.
  // Release mode: releases live in rh_releases with UUID PKs; their detail
  // view is the dedicated /release-hub/:id route (not the global ph_issues
  // detail), so navigate instead of using the global search store.
  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    if (mode === 'release') {
      navigate(`/release-hub/${id}`);
      return;
    }
    if (mode === 'test') {
      navigate(`/testhub/repository?case=${id}`);
      return;
    }
    const issueKey = idToKey.get(id);
    if (issueKey) useGlobalSearchStore.getState().openDetail({ id: issueKey });
  }, [idToKey, mode, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: token('elevation.surface', 'var(--ds-surface)') }}>
      {/* Header — canonical ProjectPageHeader (mirrors FilterPreviewPage pattern) */}
      <ProjectPageHeader
        projectKey={key ?? ''}
        hubType={mode === 'product' ? 'product' : mode === 'incident' ? 'incident' : mode === 'release' ? 'release' : mode === 'test' ? 'test' : 'project'}
        trail={[
          {
            text: 'Boards',
            href: mode === 'product' ? `/product-hub/${key}/boards` : mode === 'incident' ? '/incident-hub/board' : mode === 'tasks' ? '/tasks/board' : mode === 'release' ? '/release-hub/overview' : mode === 'test' ? '/testhub/board' : `/project-hub/${key}/boards`,
            onClick: () => navigate(mode === 'product' ? `/product-hub/${key}/boards` : mode === 'incident' ? '/incident-hub/board' : mode === 'tasks' ? '/tasks/board' : mode === 'release' ? '/release-hub/overview' : mode === 'test' ? '/testhub/board' : `/project-hub/${key}/boards`),
          },
        ]}
        title={boardConfig.boardName === 'Board' ? 'Kanban' : boardConfig.boardName}
        actions={boards.length > 0 ? (
          <PortalMenu ariaLabel="Switch board" minWidth={220} trigger={({ open }) => (
            <button style={{ height: 28, padding: '0 8px', borderRadius: 3, border: '1px solid var(--ds-border)', background: open ? 'var(--ds-background-neutral-subtle-hovered)' : 'transparent', cursor: 'pointer', fontSize: 'var(--ds-font-size-300)', fontFamily: 'inherit', color: 'var(--ds-text-subtle)' }}>
              Switch board ▾
            </button>
          )}>
            {(close) => boards.map((b) => (
              <MenuItem key={b.id} variant="radio" selected={b.id === (activeBoardId ?? boards[0]?.id)} onClick={() => { setActiveBoardId(b.id); close(); }}>{b.name}</MenuItem>
            ))}
          </PortalMenu>
        ) : undefined}
      />

      <Toolbar
        api={filterApi}
        avatars={avatars}
        visibleFields={visibleFields}
        onToggleField={toggleField}
        onCopyBoardLink={onCopyBoardLink}
        onStartStandup={() => { standupStartedAt.current = new Date(); setStandupPerson(null); setStandupActive(true); }}
        standupActive={standupActive}
        onEndStandup={() => {
          const startedAt = standupStartedAt.current;
          setStandupActive(false); setStandupPerson(null); standupStartedAt.current = null;
          if (startedAt && currentUser && key) {
            captureStandupSession({
              projectKey: key.toUpperCase(),
              driver: { id: currentUser.id, name: currentUser.displayName, avatarUrl: currentUser.avatarUrl },
              startedAt, endedAt: new Date(), timerSetSec: standupTimerSec,
            }).catch((e) => console.warn('[standup] capture error', e));
          }
        }}
        onOpenHistory={() => navigate(`/${mode === 'product' ? 'product-hub' : 'project-hub'}/${key}/standups`)}
        onMapStatuses={onMapStatuses}
        projectKey={key?.toUpperCase()}
        filterContext={kanbanFilterContext}
        hasSwimlanes={hasSwimlanes}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        showEpic={showEpic}
        showDueDate={showDueDate}
      />


      <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex' }}>
        {standupActive && (
          <StandupPanel
            issues={filtered}
            avatars={avatars}
            onPersonChange={setStandupPerson}
            onTimerSet={setStandupTimerSec}
          />
        )}
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {boardError ? (
            /* Failed issues query — show the real error instead of an empty
               board (a failed fetch is otherwise indistinguishable from a
               board with no issues). */
            <div style={{ padding: '16px 24px', maxWidth: 720 }}>
              <SectionMessage
                appearance="error"
                title="Couldn't load this board"
                actions={[{ key: 'retry', text: 'Retry', onClick: () => refetch() }]}
              >
                {boardError.message ?? 'Unknown error loading board issues.'}
              </SectionMessage>
            </div>
          ) : isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spinner size="large" />
            </div>
          ) : issues.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState header={STRINGS.EMPTY_TITLE} description={STRINGS.EMPTY_DESCRIPTION} />
            </div>
          ) : (
            <Board
              boardConfig={boardConfig}
              issues={boardIssues}
              avatars={avatars}
              visibleFields={visibleFields}
              selectedId={selectedId}
              groupBy={filterApi.groupBy}
              busyIds={reorderBusyIds}
              collapsed={collapsed}
              onToggleGroup={onToggleGroup}
              onSelect={onSelect}
              onMove={onMove}
              onReorderColumn={onReorderColumn}
              onAddColumn={onAddColumn}
              onEditSummary={onEditSummary}
              onAvatarClick={(issue, anchor) => setAssigneeTarget({ issue, anchor })}
              renderMenu={renderMenu}
              columnFooter={columnFooter}
              cardHealthKey={mode === 'product' ? (issue) => issue.id : undefined}
              designsByIssue={designsByIssue}
              hideDone={hideDone}
              onToggleHideDone={() => setHideDone((v) => !v)}
            />
          )}
        </div>
      </div>

      {assigneeTarget && (
        <AssigneePicker
          issue={assigneeTarget.issue}
          anchor={assigneeTarget.anchor}
          members={filterApi.allAssignees}
          avatars={avatars}
          currentUserName={currentUser?.displayName ?? null}
          onAssign={onAssign}
          onClose={() => setAssigneeTarget(null)}
        />
      )}

      {/* StandupHistoryPanel mount removed 2026-06-15 — see /:hub/:key/standups route. */}

      {deleteTarget && (
        <ConfirmDeleteDialog
          isOpen
          onClose={() => setDeleteTarget(null)}
          issueKey={deleteTarget.issueKey}
          issueSummary=""
          typeLabel="issue"
          onConfirm={async () => {
            await deleteIssue(deleteTarget.id);
            setDeleteTarget(null);
            refetch();
          }}
        />
      )}

      {flagTarget && (
        <AddFlagModal
          issueId={flagTarget.id}
          issueKey={flagTarget.issueKey}
          issueTitle={flagTarget.summary}
          issueType={flagTarget.issueType}
          flagged={flagTarget.isFlagged}
          tableName={
            mode === 'product' ? 'business_requests'
            : mode === 'tasks'   ? 'tasks'
            : mode === 'release' ? 'rh_releases'
            : mode === 'test'    ? 'tm_test_cases'
            :                      'ph_issues'
          }
          onClose={() => { setFlagTarget(null); refetch(); }}
        />
      )}

      {showLabelModal && labelModalIssue && (
        <AddLabelsModal
          issueId={labelModalIssue.id}
          issueKey={labelModalIssue.issueKey}
          currentLabels={labelModalIssue.labels}
          mode={mode}
          projectKey={mode === 'project' ? key : null}
          productId={mode === 'product' ? projectId : null}
          onSave={async (labels) => {
            await setLabels(labelModalIssue.id, labels);
            refetch();
          }}
          onClose={() => setShowLabelModal(false)}
        />
      )}

      {linkTarget && (
        <LinkWorkItemModal
          issueKey={linkTarget.issueKey}
          issueTitle={linkTarget.summary}
          issueType={linkTarget.issueType}
          projectId={mode === 'project' ? projectId : null}
          projectKey={mode === 'project' ? (key ?? null) : null}
          onClose={() => setLinkTarget(null)}
        />
      )}
    </div>
  );
}
