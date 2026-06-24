import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Star, MoreHorizontal, Kanban } from '@/lib/atlaskit-icons';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import AkAvatar from '@atlaskit/avatar';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import { useBoards } from '@/hooks/useBoards';
import { useDeleteBoard, useMoveBoard, useCopyBoard, useToggleBoardStar } from '@/hooks/useBoardMutations';
import { useProjects } from '@/hooks/useProjectHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import {
  CatalystListPageLayout,
  type ToolbarFilter,
} from '@/components/shared/CatalystListPage';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import CreateBoardModal from './CreateBoardModal';
import type { BoardListItem } from '@/types/board';

interface BoardManagerPageProps {
  projectIdOverride?: string;
  basePath?: string;
  /** Project name for the Location column — resolved by ProjectBoardManagerPage */
  projectName?: string;
  /** Project key for the Location column — resolved by ProjectBoardManagerPage */
  projectKey?: string;
}

export default function BoardManagerPage({ projectIdOverride, basePath, projectName, projectKey }: BoardManagerPageProps = {}) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = projectIdOverride || paramProjectId;
  const boardBasePath = basePath || `/projects/${projectId}/boards`;
  const navigate = useNavigate();
  const { data: boards = [], isLoading, error } = useBoards(projectId, projectKey);
  const deleteBoard = useDeleteBoard();
  const moveBoard = useMoveBoard();
  const copyBoard = useCopyBoard();
  const toggleStar = useToggleBoardStar();
  const { data: allProjects = [] } = useProjects();
  const [search, setSearch] = useState('');
  const [spaceFilter, setSpaceFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<BoardListItem | null>(null);
  const [copyTarget, setCopyTarget] = useState<BoardListItem | null>(null);

  // Unique space labels for Space dropdown
  const spaceOptions = useMemo(() => {
    const seen = new Set<string>();
    boards.forEach(b => {
      const label = b.projectId ?? '';
      if (label) seen.add(label);
    });
    return Array.from(seen);
  }, [boards]);

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
    if (!projectId) return;
    if (!window.confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
    deleteBoard.mutate({ boardId: board.id, projectId });
  }, [deleteBoard, projectId]);

  const locationLabel = projectName
    ? `${projectName}${projectKey ? ` (${projectKey})` : ''}`
    : (projectKey ?? '—');

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
            color: row.isStarred ? 'var(--ds-icon-warning, #E2B203)' : 'var(--ds-text-subtlest, #6B778C)',
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
          color: 'var(--ds-link, #0052CC)',
          fontSize: 14,
          fontWeight: 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}>
          {row.name}
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
          fontSize: 14, color: 'var(--ds-text, #172B4D)',
        }}>
          <AkAvatar name={row.leadName} size="xsmall" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.leadName}
          </span>
        </span>
      ) : (
        <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>
      ),
    },
    {
      id: 'location',
      label: 'Location',
      width: 22,
      accessor: () => locationLabel,
      cell: () => (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, color: 'var(--ds-text-subtle, #505258)',
          overflow: 'hidden',
        }}>
          {/* Board icon — matches Jira's board list location column */}
          <span style={{
            width: 16, height: 16, borderRadius: 2, flexShrink: 0,
            background: 'var(--ds-background-accent-blue-subtler, #CCE0FF)',
            color: 'var(--ds-icon-accent-blue, #0055CC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Kanban size={10} />
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {locationLabel}
          </span>
        </span>
      ),
    },
    {
      id: '__menu',
      label: '',
      width: 4,
      alwaysVisible: true,
      accessor: () => null,
      cell: ({ row }) => (
        <span onClick={e => e.stopPropagation()}>
          <BoardRowMenu
            board={row}
            onEditSettings={() => navigate(projectKey ? `/project-hub/${projectKey}/boards/${row.id}/settings` : `${boardBasePath}/${row.id}/settings`)}
            onDelete={() => handleDelete(row)}
            onMove={() => setMoveTarget(row)}
            onCopy={() => setCopyTarget(row)}
            onDuplicate={() => {
              if (!projectId) return;
              copyBoard.mutate({ boardId: row.id, toProjectId: row.projectId ?? projectId, newName: `Copy of ${row.name}` });
            }}
          />
        </span>
      ),
    },
  ], [locationLabel, handleDelete, projectId, toggleStar, navigate, boardBasePath, projectKey, copyBoard, setMoveTarget, setCopyTarget]);

  const spaceFilterOptions = useMemo(() =>
    spaceOptions.map(s => ({ label: s, value: s })), [spaceOptions]);
  const userFilterOptions = useMemo(() =>
    userOptions.map(u => ({ label: u, value: u })), [userOptions]);

  const toolbarFilters = useMemo<ToolbarFilter[]>(() => [
    {
      id: 'space',
      placeholder: 'Space',
      options: spaceFilterOptions,
      value: spaceFilter ? { label: spaceFilter, value: spaceFilter } : null,
      onChange: v => setSpaceFilter(v ? v.value : null),
    },
    {
      id: 'user',
      placeholder: 'User',
      options: userFilterOptions,
      value: userFilter ? { label: userFilter, value: userFilter } : null,
      onChange: v => setUserFilter(v ? v.value : null),
    },
  ], [spaceFilterOptions, userFilterOptions, spaceFilter, userFilter]);

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

  return (
    <>
    <CatalystListPageLayout
      chromeBand={projectKey ? <ProjectPageHeader projectKey={projectKey} /> : undefined}
      tabBarActions={createCta}
      search={search}
      searchPlaceholder="Search boards"
      onSearchChange={setSearch}
      toolbarFilters={toolbarFilters}
      hasActiveFilters={!!(search || spaceFilter || userFilter)}
      onClearAllFilters={() => { setSearch(''); setSpaceFilter(null); setUserFilter(null); }}
      footer={footerText}
    >
      {error && (
        <div style={{ padding: '8px 0' }}>
          <span style={{ fontSize: 12, color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}>
            Board query error: {(error as Error).message}
          </span>
        </div>
      )}
      <JiraTable<BoardListItem>
        data={filtered}
        columns={columns}
        getRowId={(b) => b.id}
        onRowClick={(b) => navigate(`${boardBasePath}/${b.id}`)}
        isLoading={isLoading}
        density="comfortable"
        ariaLabel="Boards directory"
        emptyView={
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '48px 32px', gap: 12, color: token('color.text.subtle'),
          }}>
            <span style={{ fontSize: 16, fontWeight: token('font.weight.medium') }}>
              {search || spaceFilter || userFilter ? 'No boards match your search' : 'No boards yet'}
            </span>
            {!search && !spaceFilter && !userFilter && (
              <Button appearance="primary" onClick={() => setCreateOpen(true)}>
                Create board
              </Button>
            )}
          </div>
        }
      />
    </CatalystListPageLayout>

      {createOpen && (
        <CreateBoardModal projectId={projectId!} basePath={boardBasePath} onClose={() => setCreateOpen(false)} />
      )}

      {moveTarget && (
        <MoveBoardDialog
          board={moveTarget}
          projects={allProjects}
          currentProjectId={moveTarget.projectId ?? ''}
          onConfirm={(toProjectId) => {
            moveBoard.mutate({ boardId: moveTarget.id, fromProjectId: moveTarget.projectId ?? '', toProjectId });
            setMoveTarget(null);
          }}
          onClose={() => setMoveTarget(null)}
        />
      )}
      {copyTarget && (
        <CopyBoardDialog
          board={copyTarget}
          projects={allProjects}
          currentProjectId={copyTarget.projectId ?? ''}
          onConfirm={(toProjectId, newName) => {
            copyBoard.mutate({ boardId: copyTarget.id, toProjectId, newName });
            setCopyTarget(null);
          }}
          onClose={() => setCopyTarget(null)}
        />
      )}
    </>
  );
}

// ─── Board row kebab menu ────────────────────────────────────────────────────
// Uses the same portal pattern as cells.tsx makeStatusEditCellAkPopup:
// position:absolute + window.scrollY offset instead of Popper position:fixed,
// which avoids the overflow:clip containing-block bug in this page's layout.
function BoardRowMenu({ board, onEditSettings, onDelete, onMove, onCopy, onDuplicate }: {
  board: BoardListItem;
  onEditSettings: () => void;
  onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Click-outside to close — same pattern as cells.tsx
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // position:absolute relative to document root — avoids overflow:clip issue
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 180 });
    }
    setOpen(o => !o);
  };

  const handleItem = (cb: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    cb();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More actions for ${board.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="jira-row-menu-trigger"
        onClick={handleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, padding: 0, border: 'none', borderRadius: 3,
          background: 'transparent', color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
          cursor: 'pointer', opacity: 0, transition: 'opacity 120ms ease, background 100ms ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle, #F4F5F7)');
          (e.currentTarget as HTMLElement).style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          if (!open) (e.currentTarget as HTMLElement).style.opacity = '0';
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={popupRef}
          role="menu"
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'),
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,.25)), 0 0 0 1px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,.08))'),
            minWidth: 180,
            padding: '4px 0',
          }}
        >
          {/* Standard actions */}
          {[
            { label: 'Edit board settings', cb: onEditSettings },
            { label: 'Duplicate board', cb: onDuplicate },
            { label: 'Move to project…', cb: onMove },
            { label: 'Copy board…', cb: onCopy },
          ].map(({ label, cb }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={handleItem(cb)}
              style={{
                display: 'flex', alignItems: 'center', width: '100%', padding: '8px 12px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                textAlign: 'left', fontSize: 14,
                color: token('color.text', 'var(--ds-text, #172B4D)'),
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-surface-sunken, #F7F8F9)'); }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {label}
            </button>
          ))}
          {/* Divider */}
          <div style={{ height: 1, background: token('color.border', 'var(--ds-border, #DFE1E6)'), margin: '4px 0' }} />
          {/* Danger action */}
          <button
            type="button"
            role="menuitem"
            onClick={handleItem(onDelete)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', padding: '8px 12px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              textAlign: 'left', fontSize: 14,
              color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-surface-sunken, #F7F8F9)'); }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Move board dialog ───────────────────────────────────────────────────────
type ProjectOption = { label: string; value: string };

function MoveBoardDialog({ board, projects, currentProjectId, onConfirm, onClose }: {
  board: BoardListItem;
  projects: Array<{ id: string; name: string; project_key: string }>;
  currentProjectId: string;
  onConfirm: (toProjectId: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = React.useState<ProjectOption | null>(null);
  const options: ProjectOption[] = projects
    .filter(p => p.id !== currentProjectId)
    .map(p => ({ label: `${p.name} (${p.project_key})`, value: p.id }));
  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Move board</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ fontSize: 14, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'), marginBottom: 12 }}>
          Move <strong>{board.name}</strong> to a different project.
        </p>
        <Select<ProjectOption>
          options={options}
          value={selected}
          onChange={opt => setSelected(opt as ProjectOption | null)}
          placeholder="Select destination project…"
          isSearchable
          menuPortalTarget={document.body}
          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" isDisabled={!selected} onClick={() => selected && onConfirm(selected.value)}>
          Move
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ─── Copy board dialog ───────────────────────────────────────────────────────
function CopyBoardDialog({ board, projects, currentProjectId, onConfirm, onClose }: {
  board: BoardListItem;
  projects: Array<{ id: string; name: string; project_key: string }>;
  currentProjectId: string;
  onConfirm: (toProjectId: string, newName: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = React.useState<ProjectOption | null>(
    (() => {
      const cur = projects.find(p => p.id === currentProjectId);
      return cur ? { label: `${cur.name} (${cur.project_key})`, value: cur.id } : null;
    })()
  );
  const [name, setName] = React.useState(`Copy of ${board.name}`);
  const options: ProjectOption[] = projects.map(p => ({ label: `${p.name} (${p.project_key})`, value: p.id }));
  const valid = !!selected && name.trim().length > 0;
  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Copy board</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ fontSize: 14, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'), marginBottom: 16 }}>
          Creates a new board with the same configuration. Issues are not copied.
        </p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)'), marginBottom: 4 }}>
          Board name
        </label>
        <div style={{ marginBottom: 16 }}>
          <Textfield value={name} onChange={e => setName((e.target as HTMLInputElement).value)} />
        </div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)'), marginBottom: 4 }}>
          Destination project
        </label>
        <Select<ProjectOption>
          options={options}
          value={selected}
          onChange={opt => setSelected(opt as ProjectOption | null)}
          placeholder="Select project…"
          isSearchable
          menuPortalTarget={document.body}
          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" isDisabled={!valid} onClick={() => valid && onConfirm(selected!.value, name.trim())}>
          Copy
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
