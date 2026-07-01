import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Star, Settings, Trash2, Kanban, Activity } from '@/lib/atlaskit-icons';
import BoardInsightsPanel from './BoardInsightsPanel';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { useBoards } from '@/hooks/useBoards';
import { useDeleteBoard, useToggleBoardStar } from '@/hooks/useBoardMutations';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import {
  CatalystListPageLayout,
  type ToolbarFilter,
} from '@/components/shared/CatalystListPage';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import CreateBoardModal from './CreateBoardModal';
import type { Board, BoardListItem } from '@/types/board';
import { useEnsurePrimaryBoard } from '@/hooks/useEnsurePrimaryBoard';

interface BoardManagerPageProps {
  projectIdOverride?: string;
  basePath?: string;
  projectName?: string;
  projectKey?: string;
  mode?: 'project' | 'product' | 'test' | 'incident';
}

export default function BoardManagerPage({ projectIdOverride, basePath, projectName, projectKey, mode = 'project' }: BoardManagerPageProps = {}) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = projectIdOverride || paramProjectId;
  const boardBasePath = basePath || `/projects/${projectId}/boards`;
  const navigate = useNavigate();
  const { data: boards = [], isLoading, error } = useBoards(projectId, projectKey);

  useEnsurePrimaryBoard({ projectId, projectKey, projectName, boards, isLoading, mode });

  const deleteBoard = useDeleteBoard();
  const toggleStar = useToggleBoardStar();
  const [search, setSearch] = useState('');
  const [spaceFilter, setSpaceFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BoardListItem | null>(null);
  const [insightsBoard, setInsightsBoard] = useState<Board | null>(null);

  // Unique admin (lead) names for User dropdown
  const userOptions = useMemo(() => {
    const seen = new Set<string>();
    boards.forEach(b => { if (b.leadName) seen.add(b.leadName); });
    return Array.from(seen);
  }, [boards]);

  const filtered = useMemo(() => {
    let list = boards;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q));
    }
    if (spaceFilter) {
      list = list.filter(b => b.projectId === spaceFilter);
    }
    if (userFilter) {
      list = list.filter(b => b.leadName === userFilter);
    }
    return list;
  }, [boards, search, spaceFilter, userFilter]);

  const handleDelete = useCallback((board: BoardListItem) => {
    setDeleteTarget(board);
  }, []);

const columns: Column<BoardListItem>[] = useMemo(() => [
    {
      id: '__star',
      label: '',
      width: 4,
      alwaysVisible: true,
      accessor: (b) => b.isStarred,
      cell: ({ row }) => (
        <button
          data-jira-table-editor
          onClick={(e) => {
            e.stopPropagation();
            if (projectId) toggleStar.mutate({ boardId: row.id, projectId, isStarred: !row.isStarred });
          }}
          title={row.isStarred ? 'Unstar board' : 'Star board'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
            color: row.isStarred ? 'var(--ds-icon-warning)' : 'var(--ds-text-subtlest)',
          }}
        >
          <Star size={14} fill={row.isStarred ? 'currentColor' : 'none'} />
        </button>
      ),
    },
    {
      id: 'name',
      label: 'Name',
      flex: true,
      alwaysVisible: true,
      accessor: (b) => b.name,
      cell: ({ row }) => (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          overflow: 'hidden',
        }}>
          <span style={{
            color: 'var(--ds-link)',
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            flexShrink: 1,
          }}>
            {row.name}
          </span>
          {row.isDefault && (
            <span style={{ flexShrink: 0 }}>
              <Lozenge appearance="new">Default</Lozenge>
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'admin',
      label: 'Admin',
      width: 18,
      accessor: (b) => b.leadName,
      cell: ({ row }) => row.leadName ? (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)',
        }}>
          <CatalystAvatar name={row.leadName} size="xsmall" src={row.leadAvatarUrl ?? undefined} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.leadName}
          </span>
        </span>
      ) : (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest)' }}>—</span>
      ),
    },
    {
      id: 'primary_work_item_type',
      label: 'Primary Work Item',
      width: 22,
      accessor: (b) => b.primaryWorkItemType,
      cell: ({ row }) => row.primaryWorkItemType ? (
        <span style={{
          fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block',
        }}>
          {row.primaryWorkItemType}
        </span>
      ) : (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest)' }}>—</span>
      ),
    },
    {
      id: '__menu',
      label: '',
      width: 12,
      alwaysVisible: true,
      accessor: () => null,
      cell: ({ row }) => (
        <span onClick={e => e.stopPropagation()}>
          <BoardRowActions
            board={row}
            isInsightsActive={insightsBoard?.id === row.id}
            onViewHealth={() => setInsightsBoard(insightsBoard?.id === row.id ? null : row)}
            onEditSettings={() => navigate(projectKey ? `/project-hub/${projectKey}/boards/${row.slug}/settings` : `${boardBasePath}/${row.slug}/settings`)}
            onDelete={() => handleDelete(row)}
          />
        </span>
      ),
    },
  ], [handleDelete, toggleStar, navigate, boardBasePath, projectKey, insightsBoard]);

  const projectFilterOptions = useMemo(() => {
    const ids = Array.from(new Set(boards.map(b => b.projectId).filter(Boolean))) as string[];
    return ids.map(id => ({ label: id, value: id }));
  }, [boards]);
  const userFilterOptions = useMemo(() =>
    userOptions.map(u => ({ label: u, value: u })), [userOptions]);

  const toolbarFilters = useMemo<ToolbarFilter[]>(() => [
    {
      id: 'project',
      placeholder: 'Project',
      options: projectFilterOptions,
      value: spaceFilter ? (projectFilterOptions.find(o => o.value === spaceFilter) ?? null) : null,
      onChange: v => setSpaceFilter(v ? v.value : null),
    },
    {
      id: 'user',
      placeholder: 'User',
      options: userFilterOptions,
      value: userFilter ? { label: userFilter, value: userFilter } : null,
      onChange: v => setUserFilter(v ? v.value : null),
    },
  ], [projectFilterOptions, userFilterOptions, spaceFilter, userFilter]);

  const createCta = useMemo(() => (
    <Button
      appearance="primary"
      iconBefore={() => <Plus size="small" />}
      onClick={() => setCreateOpen(true)}
    >
      Create board
    </Button>
  ), []);

  const footerText = !isLoading && filtered.length > 0
    ? (filtered.length === boards.length
        ? `${boards.length} board${boards.length !== 1 ? 's' : ''}`
        : `${filtered.length} of ${boards.length} board${boards.length !== 1 ? 's' : ''}`)
    : undefined;

  const hasBoards = boards.length > 0;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{
        flex: insightsBoard ? '0 0 38%' : '1 1 100%',
        transition: 'flex 200ms ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRight: insightsBoard ? '2px solid var(--ds-border-bold)' : undefined,
      }}>
    <>
    <CatalystListPageLayout
      chromeBand={projectKey ? <ProjectPageHeader projectKey={projectKey} /> : undefined}
      tabBarActions={createCta}
      search={hasBoards ? search : undefined}
      searchPlaceholder="Search boards"
      onSearchChange={hasBoards ? setSearch : undefined}
      toolbarFilters={hasBoards ? toolbarFilters : []}
      hasActiveFilters={hasBoards && !!(search || spaceFilter || userFilter)}
      onClearAllFilters={() => { setSearch(''); setSpaceFilter(null); setUserFilter(null); }}
      footer={hasBoards ? footerText : undefined}
    >
      {error && (
        <div style={{ padding: '8px 0' }}>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>
            Board query error: {(error as Error).message}
          </span>
        </div>
      )}
      {!isLoading && !hasBoards ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 32px', gap: 16,
        }}>
          <span style={{
            width: 48, height: 48, borderRadius: 8, flexShrink: 0,
            background: 'var(--ds-background-neutral)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ds-icon-subtle)',
          }}>
            <Kanban size={24} />
          </span>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)' }}>
              No boards yet
            </span>
            <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
              Create your first board to start organising work
            </span>
          </div>
          <Button appearance="primary" iconBefore={() => <Plus size="small" />} onClick={() => setCreateOpen(true)}>
            Create board
          </Button>
        </div>
      ) : (
        <JiraTable<BoardListItem>
          data={filtered}
          columns={columns}
          getRowId={(b) => b.id}
          onRowClick={(b) => navigate(`${boardBasePath}/${b.slug}`)}
          isLoading={isLoading}
          density="comfortable"
          ariaLabel="Boards directory"
          emptyView={
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '48px 32px', gap: 12,
            }}>
              <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle)' }}>
                No boards match your search
              </span>
            </div>
          }
        />
      )}
    </CatalystListPageLayout>

      {createOpen && (
        <CreateBoardModal projectId={projectId!} basePath={boardBasePath} onClose={() => setCreateOpen(false)} />
      )}

      {deleteTarget && (
        <ModalDialog onClose={() => setDeleteTarget(null)} width="small">
          <ModalHeader hasCloseButton>
            <ModalTitle appearance="danger">Delete board</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, color: 'var(--ds-text)' }}>
              Delete <strong>"{deleteTarget.name}"</strong>? This cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              appearance="danger"
              onClick={() => {
                deleteBoard.mutate({ boardId: deleteTarget.id, projectId: deleteTarget.projectId ?? projectId ?? '' });
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}

    </>
      </div>
      {insightsBoard && (
        <div style={{ flex: '0 0 62%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <BoardInsightsPanel
            board={insightsBoard}
            projectKey={projectKey}
            onClose={() => setInsightsBoard(null)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Board row inline actions ─────────────────────────────────────────────────
function BoardRowActions({ board, isInsightsActive, onViewHealth, onEditSettings, onDelete }: {
  board: BoardListItem;
  isInsightsActive: boolean;
  onViewHealth: () => void;
  onEditSettings: () => void;
  onDelete: () => void;
}) {
  return (
    <span
      className="jira-row-menu-trigger"
      style={{ display: 'inline-flex', gap: 2 }}
    >
      <button
        type="button"
        aria-label={`Board health for ${board.name}`}
        onClick={(e) => { e.stopPropagation(); onViewHealth(); }}
        title="View board health"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, padding: 0, border: 'none', borderRadius: 3,
          background: isInsightsActive ? 'var(--ds-background-selected)' : 'transparent',
          color: isInsightsActive ? 'var(--ds-link)' : 'var(--ds-icon-subtle)',
          cursor: 'pointer', transition: 'background 100ms ease',
        }}
        onMouseEnter={e => { if (!isInsightsActive) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered)'; }}
        onMouseLeave={e => { if (!isInsightsActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Activity size={14} />
      </button>
      <button
        type="button"
        aria-label={`Edit settings for ${board.name}`}
        onClick={(e) => { e.stopPropagation(); onEditSettings(); }}
        title="Edit board settings"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, padding: 0, border: 'none', borderRadius: 3,
          background: 'transparent', color: 'var(--ds-icon-subtle)', cursor: 'pointer',
          transition: 'background 100ms ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Settings size={14} />
      </button>
      {!board.isDefault && (
        <button
          type="button"
          aria-label={`Delete ${board.name}`}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete board"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, padding: 0, border: 'none', borderRadius: 3,
            background: 'transparent', color: 'var(--ds-icon-subtle)', cursor: 'pointer',
            transition: 'background 100ms ease, color 100ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-danger-hovered)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-icon-danger)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-icon-subtle)'; }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </span>
  );
}

