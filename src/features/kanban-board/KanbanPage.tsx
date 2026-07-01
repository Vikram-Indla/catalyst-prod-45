/**
 * KanbanPage — route entry for the brand-new Kanban board.
 * Mounted at /project-hub/:key/kanban. 100% Atlaskit; shares only the data source.
 */
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { AddFlagModal } from '@/components/workhub/issue-view/IssueActionDialogs';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBoardBySlug } from '@/hooks/useBoardBySlug';
import { token } from '@atlaskit/tokens';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { Board } from './components/Board';
import { Toolbar } from './components/Toolbar';
import { CardContextMenu } from './components/CardContextMenu';
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; issueKey: string } | null>(null);
  const [flagTarget, setFlagTarget] = useState<BoardIssue | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelModalIssue, setLabelModalIssue] = useState<BoardIssue | null>(null);
  const [labelInput, setLabelInput] = useState('');
  /* Tracks which column currently has the inline create form expanded. Only
     one form is open at a time across the whole board. */
  const [openCreateCol, setOpenCreateCol] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<CardVisibleFields>(() => {
    try {
      const saved = localStorage.getItem('kanban-visible-fields');
      return saved ? JSON.parse(saved) : { ...DEFAULT_VISIBLE_FIELDS };
    } catch {
      return { ...DEFAULT_VISIBLE_FIELDS };
    }
  });
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

  const { projectName, boardConfig: baseBoardConfig, boards, issues, isLoading, refetch } = useKanbanData(key, activeBoardId, mode);
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
  const { updateStatus, updateAssignee, createIssue, updateSummary, addLabel, archiveIssue, deleteIssue, setParent, linkIssue } = useKanbanMutations(mode);
  const currentUser = useCurrentUser();
  const [assigneeTarget, setAssigneeTarget] = useState<{ issue: BoardIssue; anchor: HTMLElement } | null>(null);
  const onAssign = useCallback(async (issue: BoardIssue, name: string | null) => {
    await updateAssignee(issue.id, name, null); refetch();
  }, [updateAssignee, refetch]);

  const onMove = useCallback(async (issueId: string, status: string, category: StatusCategory) => {
    await updateStatus(issueId, status, category);
    refetch();
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
    setLabelInput('');
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
  const onLink = useCallback(async (issue: BoardIssue, targetKey: string, linkType: string) => {
    await linkIssue(issue.issueKey, targetKey, linkType);
  }, [linkIssue]);

  const renderMenu = useCallback((issue: BoardIssue) => (
    <CardContextMenu
      issue={issue}
      issues={issues}
      columns={boardConfig.columns}
      colPrimaryStatus={boardConfig.colPrimaryStatus}
      onMoveStatus={(id, status, category) => onMove(id, status, category)}
      onCopyLink={onCopyLink} onCopyKey={onCopyKey} onFlag={onFlag}
      onAddLabel={onAddLabel} onSetParent={onSetParent} onLink={onLink}
      onArchive={onArchive} onDelete={onDelete}
    />
  ), [issues, boardConfig.columns, boardConfig.colPrimaryStatus, onMove, onCopyLink, onCopyKey, onFlag, onAddLabel, onSetParent, onLink, onArchive, onDelete]);

  /* 2026-06-15: swapped the project-board's bespoke InlineCreate (broken type
     dropdown + native showPicker date input) for the canonical InlineCreateCard
     used by PragmaticBoard / product board. State for which column is in
     "create mode" lives at the page level so only one form is open at a time.
     The canonical component writes directly to ph_issues; we just refetch on
     success. */
  const columnFooter = useCallback((colId: string) => {
    const col = boardConfig.columns.find((c) => c.id === colId);
    if (!col || !key) return null;
    const status = boardConfig.colPrimaryStatus[colId] ?? col.statuses[0];
    if (!status) return null;

    if (openCreateCol === colId) {
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
        onClick={() => setOpenCreateCol(colId)}
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

  const filterApi = useKanbanFilters(issues, mode === 'project' ? 'epic' : 'none');
  const { filtered } = filterApi;

  const boardIssues = useMemo(() => {
    if (!standupActive || !standupPerson) return filtered;
    if (standupPerson === STRINGS.UNASSIGNED) return filtered.filter((i) => !i.assigneeName);
    return filtered.filter((i) => i.assigneeName === standupPerson);
  }, [standupActive, standupPerson, filtered]);

  const avatars = useBoardAvatars(useMemo(() => issues.map((i) => i.assigneeName).filter(Boolean) as string[], [issues]));

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
          {isLoading ? (
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
              onSelect={onSelect}
              onMove={onMove}
              onAddColumn={onAddColumn}
              onEditSummary={onEditSummary}
              onAvatarClick={(issue, anchor) => setAssigneeTarget({ issue, anchor })}
              renderMenu={renderMenu}
              columnFooter={columnFooter}
              cardHealthKey={mode === 'product' ? (issue) => issue.id : undefined}
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
          tableName={mode === 'product' ? 'business_requests' : 'ph_issues'}
          onClose={() => { setFlagTarget(null); refetch(); }}
        />
      )}

      {showLabelModal && (
        <ModalDialog onClose={() => setShowLabelModal(false)} width="small">
          <ModalHeader hasCloseButton>
            <ModalTitle>Add label</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div>
              <label style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 600,
                color: 'var(--ds-text)',
              }}>
                Label
              </label>
              <Textfield
                value={labelInput}
                onChange={(e) => setLabelInput((e.target as HTMLInputElement).value)}
                placeholder="Enter label"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const trimmed = labelInput.trim();
                    if (trimmed && labelModalIssue) {
                      await addLabel(labelModalIssue.id, labelModalIssue.labels, trimmed);
                      refetch();
                    }
                    setShowLabelModal(false);
                  }
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setShowLabelModal(false)}>Cancel</Button>
            <Button
              appearance="primary"
              isDisabled={!labelInput.trim()}
              onClick={async () => {
                const trimmed = labelInput.trim();
                if (trimmed && labelModalIssue) {
                  await addLabel(labelModalIssue.id, labelModalIssue.labels, trimmed);
                  refetch();
                }
                setShowLabelModal(false);
              }}
            >
              Add
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </div>
  );
}
