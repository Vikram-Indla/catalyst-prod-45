/**
 * KanbanPage — route entry for the brand-new Kanban board.
 * Mounted at /project-hub/:key/kanban. 100% Atlaskit; shares only the data source.
 */
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import Heading from '@atlaskit/heading';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { Board } from './components/Board';
import { Toolbar } from './components/Toolbar';
import { CardContextMenu } from './components/CardContextMenu';
import { InlineCreate } from './components/InlineCreate';
import { AssigneePicker } from './components/AssigneePicker';
import { StandupPanel } from './components/StandupPanel';
import { StandupHistoryPanel } from './components/StandupHistoryPanel';
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

export default function KanbanPage() {
  const { key, boardId } = useParams<{ key: string; boardId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // boardId from route param takes precedence; fallback to ?board=<id> query param for legacy redirects.
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => boardId || searchParams.get('board'));
  const [standupActive, setStandupActive] = useState(false);
  const [standupPerson, setStandupPerson] = useState<string | null>(null);
  const standupStartedAt = useRef<Date | null>(null);
  const [standupTimerSec, setStandupTimerSec] = useState(300);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<CardVisibleFields>({ ...DEFAULT_VISIBLE_FIELDS });
  const toggleField = useCallback((f: keyof CardVisibleFields) =>
    setVisibleFields((v) => ({ ...v, [f]: !v[f] })), []);
  const onCopyBoardLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href);
  }, []);

  const { projectName, boardConfig: baseBoardConfig, boards, issues, isLoading, refetch } = useKanbanData(key, activeBoardId);
  const [extraColumns, setExtraColumns] = useState<KanbanColumn[]>([]);
  const boardConfig = useMemo(() =>
    extraColumns.length ? { ...baseBoardConfig, columns: [...baseBoardConfig.columns, ...extraColumns] } : baseBoardConfig,
    [baseBoardConfig, extraColumns]);
  const onAddColumn = useCallback((name: string) =>
    setExtraColumns((c) => [...c, { id: `local-col-${c.length}-${name}`, name, statuses: [name], category: 'in_progress', max: null }]),
    []);
  // Map statuses → columns: reuse the existing MapStatusesPage for the active board.
  const onMapStatuses = useCallback(() => {
    const boardId = boardConfig.boardId;
    if (key && boardId) navigate(`/project-hub/${key}/boards/${boardId}/map-statuses`);
  }, [key, boardConfig.boardId, navigate]);
  const { updateStatus, toggleFlag, updateAssignee, createIssue, updateSummary, addLabel, archiveIssue, deleteIssue, setParent, linkIssue } = useKanbanMutations();
  const currentUser = useCurrentUser();
  const [assigneeTarget, setAssigneeTarget] = useState<{ issue: BoardIssue; anchor: HTMLElement } | null>(null);
  const onAssign = useCallback(async (issue: BoardIssue, name: string | null) => {
    await updateAssignee(issue.id, name, null); refetch();
  }, [updateAssignee, refetch]);

  const onMove = useCallback(async (issueId: string, status: string, category: StatusCategory) => {
    await updateStatus(issueId, status, category);
    refetch();
  }, [updateStatus, refetch]);

  const onFlag = useCallback(async (issue: BoardIssue) => {
    await toggleFlag(issue.id, !issue.isFlagged); refetch();
  }, [toggleFlag, refetch]);
  const onCopyLink = useCallback((issue: BoardIssue) => {
    navigator.clipboard?.writeText(`${window.location.origin}/project-hub/${key}/issue/${issue.issueKey}`);
  }, [key]);
  const onCopyKey = useCallback((issue: BoardIssue) => {
    navigator.clipboard?.writeText(issue.issueKey);
  }, []);
  const onAddLabel = useCallback(async (issue: BoardIssue) => {
    const label = window.prompt('Add label')?.trim();
    if (label) { await addLabel(issue.id, issue.labels, label); refetch(); }
  }, [addLabel, refetch]);
  const onArchive = useCallback(async (issue: BoardIssue) => { await archiveIssue(issue.id); refetch(); }, [archiveIssue, refetch]);
  const onDelete = useCallback(async (issue: BoardIssue) => {
    if (window.confirm(`Delete ${issue.issueKey}? This removes it from the board.`)) { await deleteIssue(issue.id); refetch(); }
  }, [deleteIssue, refetch]);
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

  const columnFooter = useCallback((colId: string) => {
    const col = boardConfig.columns.find((c) => c.id === colId);
    if (!col || !key) return null;
    const status = boardConfig.colPrimaryStatus[colId] ?? col.statuses[0];
    if (!status) return null;
    return (
      <InlineCreate
        projectKey={key.toUpperCase()}
        status={status}
        category={col.category}
        onCreate={async (summary, issueType, dueDate) => {
          await createIssue({ projectKey: key.toUpperCase(), summary, issueType, status, category: col.category, dueDate });
          refetch();
        }}
      />
    );
  }, [boardConfig, key, createIssue, refetch]);

  const filterApi = useKanbanFilters(issues);
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
  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    const issueKey = idToKey.get(id);
    if (issueKey) useGlobalSearchStore.getState().openDetail({ id: issueKey });
  }, [idToKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: token('elevation.surface', '#FFFFFF') }}>
      {/* Header */}
      <div style={{ height: SIZES.HEADER_HEIGHT, padding: `0 ${SIZES.PAGE_PADDING_X}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, flexShrink: 0 }}>
        <Breadcrumbs>
          <BreadcrumbsItem text={STRINGS.PROJECTS} href="/project-hub/projects" />
          <BreadcrumbsItem text={projectName} href={`/project-hub/${key}`} />
          <BreadcrumbsItem text="Kanban" />
        </Breadcrumbs>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heading size="large">{boardConfig.boardName === 'Board' ? 'Kanban' : boardConfig.boardName}</Heading>
          {boards.length > 0 && (
            <PortalMenu ariaLabel="Switch board" minWidth={220} trigger={({ open }) => (
              <button style={{ height: 28, padding: '0 8px', borderRadius: 3, border: `1px solid ${token('color.border', '#091E4224')}`, background: open ? token('color.background.neutral.subtle.hovered', '#091E420F') : 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: token('color.text.subtle', '#44546F') }}>
                Switch board ▾
              </button>
            )}>
              {(close) => boards.map((b) => (
                <MenuItem key={b.id} variant="radio" selected={b.id === (activeBoardId ?? boards[0]?.id)} onClick={() => { setActiveBoardId(b.id); close(); }}>{b.name}</MenuItem>
              ))}
            </PortalMenu>
          )}
        </div>
      </div>

      <Toolbar
        api={filterApi}
        total={filtered.length}
        avatars={avatars}
        issues={filtered}
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
        onOpenHistory={() => setHistoryOpen(true)}
        onMapStatuses={onMapStatuses}
        projectKey={key?.toUpperCase()}
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

      <StandupHistoryPanel projectKey={key?.toUpperCase()} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
