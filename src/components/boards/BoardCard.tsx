import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Star, Settings, ArrowRight, LayoutGrid, Users, MoreHorizontal, Copy, ClipboardCopy, Trash2 } from 'lucide-react';
import { useToggleBoardStar, useUpdateBoardLastViewed, useDeleteBoard } from '@/hooks/useBoardMutations';
import { useNavigate, useParams } from 'react-router-dom';
import type { BoardListItem } from '@/types/board';

interface BoardCardProps {
  board: BoardListItem;
  projectId: string;
  onOpen: () => void;
  onSettings: () => void;
}

const JIRA_SYNC_BOARDS = ['Delivery Board', 'QA Board'];

export default function BoardCard({ board, projectId, onOpen, onSettings }: BoardCardProps) {
  const { isDark } = useTheme();
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleStar = useToggleBoardStar();
  const updateLastViewed = useUpdateBoardLastViewed();
  const deleteBoard = useDeleteBoard();
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();

  const hasJiraSync = JIRA_SYNC_BOARDS.includes(board.name);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleOpen = () => {
    updateLastViewed.mutate(board.id);
    onOpen();
  };

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar.mutate({ boardId: board.id, projectId, isStarred: !board.isStarred });
  };

  const handleDelete = async () => {
    if (deleteConfirm !== board.name) return;
    await deleteBoard.mutateAsync({ boardId: board.id, projectId: routeProjectId ?? projectId });
    setDeleteModal(false);
  };

  const visibilityChip = () => {
    if (board.visibility === 'private') return { label: '🔒 Private', bg: 'rgba(217,119,6,0.06)', color: '#D97706' };
    if (board.visibility === 'global') return { label: '🌐 Organisation', bg: 'rgba(37,99,235,0.06)', color: '#2563EB' };
    return { label: 'Project', bg: 'var(--bg-1)', color: 'var(--fg-3)' };
  };

  const vis = visibilityChip();
  const timeAgo = formatTimeAgo(board.updatedAt);

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: 'var(--bg-app)',
          border: `0.75px solid ${isDark ? (hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)') : (hover ? 'rgba(15,23,42,0.18)' : 'rgba(15,23,42,0.12)')}`,
          borderRadius: 8, cursor: 'pointer', position: 'relative',
          transition: 'box-shadow 150ms, border-color 150ms',
          boxShadow: hover ? (isDark ? '0 4px 16px rgba(0,0,0,0.30)' : '0 4px 16px rgba(15,23,42,0.10)') : 'none',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ height: 4, background: board.color, flexShrink: 0 }} />

        <div style={{ padding: '14px 14px 12px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: board.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>{board.icon}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 650, color: 'var(--fg-1)',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{board.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: "'Inter', sans-serif" }}>Kanban Board</div>
            </div>
          </div>

          {/* ⋯ overflow menu trigger */}
          <div ref={menuRef} style={{ position: 'absolute', top: 52, right: 42 }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }} style={{
              width: 26, height: 26, borderRadius: 4, border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hover || menuOpen ? 1 : 0, transition: 'opacity 150ms',
            }}>
              <MoreHorizontal size={15} color="rgba(237,237,237,0.40)" />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 28, right: 0,
                width: 172, background: 'var(--cp-float)',
                border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.12)',
                borderRadius: 6, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.30)' : '0 4px 16px rgba(15,23,42,0.14)',
                zIndex: 50, padding: '4px 0',
              }}>
                <MenuItem onClick={() => { navigator.clipboard.writeText(window.location.origin + `/projects/${projectId}/boards/${board.id}`); setMenuOpen(false); }}>
                  <Copy size={13} /> Copy link
                </MenuItem>
                <MenuItem onClick={() => setMenuOpen(false)}>
                  <ClipboardCopy size={13} /> Duplicate board
                </MenuItem>
                <div style={{ height: 0.75, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)', margin: '4px 0' }} />
                <MenuItem danger onClick={() => { setMenuOpen(false); setDeleteModal(true); }}>
                  <Trash2 size={13} /> Delete board…
                </MenuItem>
              </div>
            )}
          </div>

          {/* Star button */}
          <button onClick={handleStar} style={{
            position: 'absolute', top: 52, right: 12,
            width: 28, height: 28, borderRadius: 4,
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: board.isStarred ? 1 : (hover ? 1 : 0),
            transition: 'opacity 150ms',
          }}>
            <Star size={15}
              fill={board.isStarred ? '#D97706' : 'none'}
              color={board.isStarred ? '#D97706' : 'rgba(237,237,237,0.40)'}
            />
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {board.isPersonal && <Chip bg={isDark ? 'rgba(37,99,235,0.12)' : 'rgba(59,130,246,0.06)'} color="#2563EB">Personal</Chip>}
            <Chip bg={vis.bg} color={vis.color}>{vis.label}</Chip>
            {board.swimlaneType !== 'none' && (
              <Chip bg={isDark ? 'rgba(255,255,255,0.06)' : '#1A1A1A'} color={isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)'}>By {board.swimlaneType}</Chip>
            )}
            {/* Jira Sync badge */}
            {hasJiraSync && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 18, padding: '0 8px', borderRadius: 8,
                background: isDark ? 'rgba(0,82,204,0.15)' : 'rgba(0,82,204,0.06)', border: isDark ? '0.75px solid rgba(0,82,204,0.30)' : '0.75px solid rgba(0,82,204,0.18)',
                fontSize: 10.5, fontWeight: 600, color: '#0052CC',
                fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0052CC' }} />
                Jira Sync
              </span>
            )}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            borderTop: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.08)', paddingTop: 10,
            fontSize: 11.5, color: 'var(--fg-3)', fontFamily: "'Inter', sans-serif",
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <LayoutGrid size={12} /> {board.issueCount} issues
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={12} /> {board.columnCount} cols
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)' }}>{timeAgo}</span>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '8px 12px',
          background: isDark ? '#1A1A1A' : 'var(--bg-1)', borderTop: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.08)',
        }}>
          <button onClick={e => { e.stopPropagation(); onSettings(); }} style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px',
            background: isDark ? '#0A0A0A' : 'var(--bg-app)', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.12)',
            borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
            color: 'var(--fg-2)', fontFamily: "'Inter', sans-serif",
          }}>
            <Settings size={13} /> Settings
          </button>
          <button onClick={e => { e.stopPropagation(); handleOpen(); }} style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '8px 12px',
            background: 'var(--cp-blue)', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontSize: 11.5, fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif",
          }}>
            Open Board <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.50)' : 'rgba(15,23,42,0.30)', zIndex: 80 }}
            onClick={() => setDeleteModal(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 420, background: 'var(--cp-float)', borderRadius: 8, zIndex: 90,
            padding: 24, border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.12)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 8px', fontFamily: "'Sora', sans-serif" }}>
              Delete Board
            </h3>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '0 0 16px', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
              Type the board name '<strong style={{ color: 'var(--fg-1)' }}>{board.name}</strong>' to confirm deletion.
              This action cannot be undone.
            </p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={board.name}
              style={{
                width: '100%', height: 50, padding: '8px 12px', boxSizing: 'border-box',
                border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.15)', borderRadius: 6,
                fontSize: 13, fontFamily: "'Inter', sans-serif", color: 'var(--fg-1)',
                outline: 'none', background: isDark ? '#0A0A0A' : 'var(--bg-app)', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteModal(false); setDeleteConfirm(''); }} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.15)', background: isDark ? '#0A0A0A' : 'var(--bg-app)',
                color: 'var(--fg-2)', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}>Cancel</button>
              <button onClick={handleDelete}
                disabled={deleteConfirm !== board.name || deleteBoard.isPending}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: 'none',
                  background: deleteConfirm === board.name ? 'var(--sem-danger)' : 'var(--divider)',
                  color: deleteConfirm === board.name ? '#FFFFFF' : 'var(--fg-4)',
                  cursor: deleteConfirm === board.name ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', sans-serif",
                }}>
                {deleteBoard.isPending ? 'Deleting…' : 'Delete Board'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '7px 12px', border: 'none', background: 'transparent',
      cursor: 'pointer', fontSize: 12, fontWeight: 500,
      color: danger ? 'var(--sem-danger)' : 'var(--fg-2)',
      fontFamily: "'Inter', sans-serif", textAlign: 'left',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? (document.documentElement.classList.contains('dark') ? 'rgba(220,38,38,0.10)' : 'rgba(248,113,113,0.06)') : (document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'))}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function Chip({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
      borderRadius: 12, fontSize: 11, fontWeight: 500,
      background: bg, color, border: document.documentElement.classList.contains('dark') ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.08)',
      fontFamily: "'Inter', sans-serif",
    }}>{children}</span>
  );
}

function formatTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
