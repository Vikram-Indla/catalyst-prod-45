import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Search, Plus, Star } from '@/lib/atlaskit-icons';
import { useBoards } from '@/hooks/useBoards';
import { useDeleteBoard, useMoveBoard, useCopyBoard, useToggleBoardStar } from '@/hooks/useBoardMutations';
import { useProjects } from '@/hooks/useProjectHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import CreateBoardModal from './CreateBoardModal';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import Spinner from '@atlaskit/spinner';
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
  const { data: boards = [], isLoading, error } = useBoards(projectId);
  const deleteBoard = useDeleteBoard();
  const moveBoard = useMoveBoard();
  const copyBoard = useCopyBoard();
  const toggleStar = useToggleBoardStar();
  const { data: allProjects = [] } = useProjects();
  const [search, setSearch] = useState('');
  const [spaceFilter, setSpaceFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsBoard, setSettingsBoard] = useState<BoardListItem | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
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

  // Project avatar initial letter + color for Location column
  const locationInitial = (projectName ?? projectKey ?? '?')[0]?.toUpperCase() ?? '?';

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
          <span style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: 'var(--ds-background-accent-blue-subtler, #CCE0FF)',
            color: 'var(--ds-text-accent-blue, #0055CC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600,
          }}>
            {row.leadName[0]?.toUpperCase()}
          </span>
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
          {/* Project avatar */}
          <span style={{
            width: 16, height: 16, borderRadius: 2, flexShrink: 0,
            background: 'var(--ds-background-accent-teal-subtler, #C6EDFB)',
            color: 'var(--ds-text-accent-teal, #164555)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
          }}>
            {locationInitial}
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
        <BoardRowMenu
          board={row}
          onEditSettings={() => setSettingsBoard(row)}
          onDelete={() => handleDelete(row)}
          onMove={() => setMoveTarget(row)}
          onCopy={() => setCopyTarget(row)}
        />
      ),
    },
  ], [locationLabel, locationInitial, handleDelete, projectId, toggleStar]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--ds-surface, #FFFFFF)' }}>
      {error && (
        <div style={{ background: 'var(--ds-background-danger-subtle, #FEF2F2)', color: 'var(--ds-text-danger, #AE2A19)', padding: '8px 24px', fontSize: 12, borderBottom: '1px solid var(--ds-border-danger, #FECACA)' }}>
          Board query error: {(error as Error).message}
        </div>
      )}
      {/* Header */}
      <div style={{ background: 'var(--ds-surface, #FFFFFF)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', flexShrink: 0 }}>
        <div style={{ padding: '16px 24px 12px' }}>
          {/* Title row — h1 left, Create board right (Jira pattern) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: 0 }}>
              Boards
            </h1>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
              background: 'var(--ds-background-brand-bold, #0052CC)', border: '2px solid transparent',
              borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500,
              color: 'var(--ds-text-inverse, #FFFFFF)',
            }}>
              <Plus size={14} strokeWidth={2.5} /> Create board
            </button>
          </div>
          {/* Toolbar — search + Space dropdown + User dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 8px',
              background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
              border: `2px solid ${searchFocused ? 'var(--ds-border-focused, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
              borderRadius: 3, width: 200, transition: 'border-color 150ms',
            }}>
              <Search size={13} color="var(--ds-text-subtlest, #6B778C)" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                placeholder="Search boards…" aria-label="Search boards"
                style={{
                  border: 'none', outline: 'none', background: 'transparent', flex: 1,
                  fontSize: 14, color: 'var(--ds-text, #172B4D)',
                }}
              />
            </div>
            {/* Space dropdown */}
            <DropdownMenu
              trigger={({ triggerRef, ...triggerProps }) => (
                <button
                  {...triggerProps}
                  ref={triggerRef as React.Ref<HTMLButtonElement>}
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, height: 32,
                    background: spaceFilter ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-background-neutral, #F1F2F4)',
                    border: `2px solid ${spaceFilter ? 'var(--ds-border-selected, #388BFF)' : 'transparent'}`,
                    borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 400,
                    padding: '0 12px',
                    color: spaceFilter ? 'var(--ds-link, #0052CC)' : 'var(--ds-text, #172B4D)',
                  }}
                >
                  Space {spaceFilter ? `· ${spaceFilter.slice(0, 8)}` : ''}
                </button>
              )}
            >
              <DropdownItemGroup>
                <DropdownItem onClick={() => setSpaceFilter(null)}>All spaces</DropdownItem>
                {spaceOptions.map(s => (
                  <DropdownItem key={s} onClick={() => setSpaceFilter(s)}>
                    {s}
                  </DropdownItem>
                ))}
              </DropdownItemGroup>
            </DropdownMenu>
            {/* User dropdown */}
            <DropdownMenu
              trigger={({ triggerRef, ...triggerProps }) => (
                <button
                  {...triggerProps}
                  ref={triggerRef as React.Ref<HTMLButtonElement>}
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, height: 32,
                    background: userFilter ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-background-neutral, #F1F2F4)',
                    border: `2px solid ${userFilter ? 'var(--ds-border-selected, #388BFF)' : 'transparent'}`,
                    borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 400,
                    color: userFilter ? 'var(--ds-link, #0052CC)' : 'var(--ds-text, #172B4D)',
                  }}
                >
                  User {userFilter ? `· ${userFilter.split(' ')[0]}` : ''}
                </button>
              )}
            >
              <DropdownItemGroup>
                <DropdownItem onClick={() => setUserFilter(null)}>All users</DropdownItem>
                {userOptions.map(u => (
                  <DropdownItem key={u} onClick={() => setUserFilter(u)}>
                    {u}
                  </DropdownItem>
                ))}
              </DropdownItemGroup>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Body — JiraTable */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Spinner size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
              {search ? `No boards match "${search}"` : 'No boards yet'}
            </span>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
              background: 'var(--ds-background-brand-bold, #0052CC)', border: 'none',
              borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--ds-text-inverse, #FFFFFF)',
            }}>
              <Plus size={14} strokeWidth={2.5} /> Create board
            </button>
          </div>
        ) : (
          <JiraTable
            data={filtered}
            columns={columns}
            getRowId={(b) => b.id}
            onRowClick={(b) => navigate(`${boardBasePath}/${b.id}`)}
          />
        )}
      </div>

      {createOpen && (
        <CreateBoardModal projectId={projectId!} basePath={boardBasePath} onClose={() => setCreateOpen(false)} />
      )}
      {settingsBoard && (
        <BoardSettingsDrawer
          board={settingsBoard}
          projectKey={projectKey}
          onClose={() => setSettingsBoard(null)}
        />
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
    </div>
  );
}

// ─── Board row kebab menu ────────────────────────────────────────────────────
// CLAUDE.md 2026-05-10: uses @atlaskit/dropdown-menu, not a hand-rolled menu.
function BoardRowMenu({ board, onEditSettings, onDelete, onMove, onCopy }: {
  board: BoardListItem;
  onEditSettings: () => void;
  onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
}) {
  return (
    <DropdownMenu
      trigger={({ triggerRef, ...triggerProps }) => (
        <button
          {...triggerProps}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          type="button"
          aria-label={`More actions for ${board.name}`}
          className="jira-row-menu-trigger"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, padding: 0, border: 'none', borderRadius: 3,
            background: 'transparent', color: 'var(--ds-text-subtle, #42526E)',
            cursor: 'pointer', opacity: 0, transition: 'opacity 120ms ease',
            fontSize: 18, letterSpacing: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F4F5F7)';
            (e.currentTarget as HTMLElement).style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          •••
        </button>
      )}
    >
      <DropdownItemGroup>
        <DropdownItem onClick={onEditSettings}>Edit settings</DropdownItem>
        <DropdownItem onClick={onMove}>Move to project…</DropdownItem>
        <DropdownItem onClick={onCopy}>Copy board…</DropdownItem>
      </DropdownItemGroup>
      <DropdownItemGroup>
        <DropdownItem onClick={onDelete}>
          <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>Delete</span>
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

// ─── Shared dialog chrome ────────────────────────────────────────────────────
function DialogOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--ds-blanket, rgba(9,30,66,0.54))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--ds-surface-overlay, #FFFFFF)', borderRadius: 4,
        padding: 24, minWidth: 360, maxWidth: 480, width: '100%',
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 32px rgba(9,30,66,0.24))',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Move board dialog ───────────────────────────────────────────────────────
function MoveBoardDialog({ board, projects, currentProjectId, onConfirm, onClose }: {
  board: BoardListItem;
  projects: Array<{ id: string; name: string; project_key: string }>;
  currentProjectId: string;
  onConfirm: (toProjectId: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = React.useState('');
  const eligible = projects.filter(p => p.id !== currentProjectId);
  return (
    <DialogOverlay onClose={onClose}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
        Move "{board.name}"
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
        Select the destination project.
      </p>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        style={{
          width: '100%', height: 32, padding: '0 8px', boxSizing: 'border-box',
          border: '2px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
          fontSize: 14, color: 'var(--ds-text, #172B4D)',
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
          outline: 'none', marginBottom: 16,
        }}
      >
        <option value="">— Choose project —</option>
        {eligible.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.project_key})</option>
        ))}
      </select>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{
          height: 32, padding: '0 12px', border: '2px solid var(--ds-border, #DFE1E6)',
          borderRadius: 3, background: 'transparent', cursor: 'pointer',
          fontSize: 14, color: 'var(--ds-text, #172B4D)',
        }}>
          Cancel
        </button>
        <button onClick={() => selected && onConfirm(selected)} disabled={!selected} style={{
          height: 32, padding: '0 12px', border: '2px solid transparent',
          borderRadius: 3, cursor: selected ? 'pointer' : 'not-allowed',
          fontSize: 14, fontWeight: 500, color: 'var(--ds-text-inverse, #FFFFFF)',
          background: selected ? 'var(--ds-background-brand-bold, #0052CC)' : 'var(--ds-background-disabled, #091E420F)',
        }}>
          Move
        </button>
      </div>
    </DialogOverlay>
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
  const [selected, setSelected] = React.useState(currentProjectId);
  const [name, setName] = React.useState(`Copy of ${board.name}`);
  const valid = !!selected && name.trim().length > 0;
  return (
    <DialogOverlay onClose={onClose}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
        Copy "{board.name}"
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
        Creates a new board with the same configuration. Issues are not copied.
      </p>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 4 }}>
        Board name
      </label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        style={{
          width: '100%', height: 32, padding: '0 8px', boxSizing: 'border-box',
          border: '2px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
          fontSize: 14, color: 'var(--ds-text, #172B4D)',
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
          outline: 'none', marginBottom: 12,
        }}
      />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 4 }}>
        Destination project
      </label>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        style={{
          width: '100%', height: 32, padding: '0 8px', boxSizing: 'border-box',
          border: '2px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
          fontSize: 14, color: 'var(--ds-text, #172B4D)',
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
          outline: 'none', marginBottom: 16,
        }}
      >
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.project_key})</option>
        ))}
      </select>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{
          height: 32, padding: '0 12px', border: '2px solid var(--ds-border, #DFE1E6)',
          borderRadius: 3, background: 'transparent', cursor: 'pointer',
          fontSize: 14, color: 'var(--ds-text, #172B4D)',
        }}>
          Cancel
        </button>
        <button onClick={() => valid && onConfirm(selected, name.trim())} disabled={!valid} style={{
          height: 32, padding: '0 12px', border: '2px solid transparent',
          borderRadius: 3, cursor: valid ? 'pointer' : 'not-allowed',
          fontSize: 14, fontWeight: 500, color: 'var(--ds-text-inverse, #FFFFFF)',
          background: valid ? 'var(--ds-background-brand-bold, #0052CC)' : 'var(--ds-background-disabled, #091E420F)',
        }}>
          Copy
        </button>
      </div>
    </DialogOverlay>
  );
}
