import React, { useState } from 'react';
import { Star, Settings, ArrowRight, LayoutGrid, Users, Lock, Globe } from 'lucide-react';
import type { BoardListItem } from '@/types/board';

interface BoardCardProps {
  board: BoardListItem;
  onOpen: () => void;
  onSettings: () => void;
}

export default function BoardCard({ board, onOpen, onSettings }: BoardCardProps) {
  const [hover, setHover] = useState(false);

  const visibilityChip = () => {
    if (board.visibility === 'private') return { label: '🔒 Private', bg: 'var(--cp-warning-5)', color: 'var(--cp-warning-60)' };
    if (board.visibility === 'global') return { label: '🌐 Organisation', bg: 'var(--cp-primary-5)', color: 'var(--cp-primary-60)' };
    return { label: 'Project', bg: 'var(--cp-bg-sunken)', color: 'var(--cp-text-tertiary)' };
  };

  const vis = visibilityChip();
  const timeAgo = formatTimeAgo(board.updatedAt);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#FFFFFF',
        border: `0.75px solid ${hover ? 'rgba(15,23,42,0.18)' : 'var(--cp-border-subtle)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        position: 'relative',
        transition: 'box-shadow 150ms, border-color 150ms',
        boxShadow: hover ? '0 4px 16px rgba(15,23,42,0.10)' : 'none',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Accent strip */}
      <div style={{ height: 4, background: board.color, flexShrink: 0 }} />

      {/* Body */}
      <div style={{ padding: '14px 14px 12px', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 7,
            background: board.color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            {board.icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 650, color: 'var(--cp-text-primary)',
              fontFamily: 'var(--cp-font-body)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{board.name}</div>
            <div style={{ fontSize: 11, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-body)' }}>
              Kanban Board
            </div>
          </div>
        </div>

        {/* Star button */}
        <button
          onClick={e => { e.stopPropagation(); }}
          style={{
            position: 'absolute', top: 52, right: 12,
            width: 28, height: 28, borderRadius: 4,
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: board.isStarred ? 1 : (hover ? 1 : 0),
            transition: 'opacity 150ms',
          }}
        >
          <Star size={15}
            fill={board.isStarred ? 'var(--cp-warning-60)' : 'none'}
            color={board.isStarred ? 'var(--cp-warning-60)' : 'var(--cp-text-muted)'}
          />
        </button>

        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {board.isPersonal && (
            <Chip bg="var(--cp-purple-5)" color="var(--cp-purple-60)">Personal</Chip>
          )}
          <Chip bg={vis.bg} color={vis.color}>{vis.label}</Chip>
          {board.swimlaneType !== 'none' && (
            <Chip bg="var(--cp-bg-sunken)" color="var(--cp-text-tertiary)">
              By {board.swimlaneType}
            </Chip>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          borderTop: '0.75px solid var(--cp-border-subtle)', paddingTop: 10,
          fontSize: 11.5, color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <LayoutGrid size={12} /> {board.issueCount} issues
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} /> {board.columnCount} cols
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--cp-text-muted)' }}>{timeAgo}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        padding: '8px 12px',
        background: 'var(--cp-bg-sunken)', borderTop: '0.75px solid var(--cp-border-subtle)',
      }}>
        <button onClick={e => { e.stopPropagation(); onSettings(); }} style={{
          display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px',
          background: '#FFFFFF', border: '0.75px solid var(--cp-border-default)',
          borderRadius: 5, cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
          color: 'var(--cp-text-secondary)', fontFamily: 'var(--cp-font-body)',
        }}>
          <Settings size={13} /> Settings
        </button>
        <button onClick={e => { e.stopPropagation(); onOpen(); }} style={{
          display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px',
          background: 'linear-gradient(135deg, var(--cp-primary-60), var(--cp-primary-70))',
          border: 'none', borderRadius: 5, cursor: 'pointer',
          fontSize: 11.5, fontWeight: 600, color: '#FFFFFF',
          fontFamily: 'var(--cp-font-body)',
        }}>
          Open Board <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

function Chip({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
      borderRadius: 10, fontSize: 11, fontWeight: 500,
      background: bg, color, border: '0.75px solid var(--cp-border-subtle)',
      fontFamily: 'var(--cp-font-body)',
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
