/**
 * ReleasesTable — clean custom table for /release-hub/releases-management.
 *
 * Layout rules (Jira parity, screenshot 2026-06-24):
 *   - Only header bottom border + table bottom border.
 *   - No row dividers, no column dividers.
 *   - Status: outlined pill (white bg, colored border + uppercase text).
 *   - Progress: 3-segment bar (Done green, In-progress blue, To-do gray)
 *     with hover tooltip per segment ("12 done", "5 in progress", "4 to do").
 *   - More actions: ⋯ icon, blue hover + blue open state, portal menu
 *     (Release / Archive / Merge / Edit / Delete).
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';

const BLUE_BORDER = 'var(--ds-border-selected, #1868DB)';
const BLUE_BG = 'var(--ds-background-selected, #E9F2FE)';
const BLUE_TEXT = 'var(--ds-text-selected, #0C66E4)';
const GRAY_BORDER = 'var(--ds-border, #DFE1E6)';
const TEXT = 'var(--ds-text, #292A2E)';
const TEXT_SUBTLE = 'var(--ds-text-subtle, #505258)';
const TEXT_SUBTLEST = 'var(--ds-text-subtlest, #6B778C)';
const DANGER = 'var(--ds-text-danger, #AE2A19)';

// ─── Status pill ──────────────────────────────────────────────────────────

const STATUS_BORDER: Record<ReleaseStatus, string> = {
  released:   '#22A06B',
  unreleased: '#1868DB',
  archived:   '#8993A4',
};

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  released:   'RELEASED',
  unreleased: 'UNRELEASED',
  archived:   'ARCHIVED',
};

function StatusPill({ status }: { status: ReleaseStatus }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 18,
        padding: '0 8px',
        borderRadius: 3,
        border: `1.5px solid ${STATUS_BORDER[status]}`,
        background: '#FFFFFF',
        color: TEXT,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────

const PROGRESS_DONE = '#22A06B';
const PROGRESS_IN_PROGRESS = '#1868DB';
const PROGRESS_TODO = '#DFE1E6';

function ProgressBar({ progress }: { progress: ReleaseProgress | null }) {
  if (!progress || !progress.total) {
    return <span style={{ color: TEXT_SUBTLEST, fontSize: 13 }}>No work items</span>;
  }
  const { done, inProgress, toDo, total } = progress;
  const segments: Array<{ key: string; count: number; pct: number; color: string; label: string }> = [
    { key: 'done',  count: done,       pct: (done / total) * 100,       color: PROGRESS_DONE,        label: `${done} done` },
    { key: 'wip',   count: inProgress, pct: (inProgress / total) * 100, color: PROGRESS_IN_PROGRESS, label: `${inProgress} in progress` },
    { key: 'todo',  count: toDo,       pct: (toDo / total) * 100,       color: PROGRESS_TODO,        label: `${toDo} to do` },
  ].filter((s) => s.count > 0);

  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        height: 8,
        width: '100%',
        maxWidth: 220,
        borderRadius: 4,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      {segments.length === 0 ? (
        <div style={{ flex: 1, background: PROGRESS_TODO, borderRadius: 4 }} />
      ) : (
        segments.map((seg, i) => (
          <div
            key={seg.key}
            title={seg.label}
            style={{
              width: `${seg.pct}%`,
              background: seg.color,
              height: '100%',
              borderRadius:
                i === 0 && i === segments.length - 1
                  ? 4
                  : i === 0
                  ? '4px 0 0 4px'
                  : i === segments.length - 1
                  ? '0 4px 4px 0'
                  : 0,
              cursor: 'default',
            }}
          />
        ))
      )}
    </div>
  );
}

// ─── More-actions menu (portal, blue hover/open) ──────────────────────────

interface ActionsMenuProps {
  release: Release;
  onRelease: (r: Release) => void;
  onArchive: (r: Release) => void;
  onMerge: (r: Release) => void;
  onEdit: (r: Release) => void;
  onDelete: (r: Release) => void;
}

function ActionsMenu({ release, onRelease, onArchive, onMerge, onEdit, onDelete }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, []);

  useLayoutEffect(() => { if (open) update(); }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
    };
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const showBlue = open || hover;

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 3,
    border: `1px solid ${open ? BLUE_BORDER : 'transparent'}`,
    background: showBlue ? BLUE_BG : 'transparent',
    color: showBlue ? BLUE_TEXT : TEXT_SUBTLE,
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
      >
        <MoreIcon label="" size="small" />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 10001,
            minWidth: 160,
            background: '#FFFFFF',
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)',
            padding: '4px 0',
          }}
        >
          <MenuItem label="Release" onClick={() => { onRelease(release); setOpen(false); }} />
          <MenuItem label="Archive" onClick={() => { onArchive(release); setOpen(false); }} />
          <MenuItem label="Merge" onClick={() => { onMerge(release); setOpen(false); }} />
          <MenuItem label="Edit" onClick={() => { onEdit(release); setOpen(false); }} />
          <MenuItem label="Delete" onClick={() => { onDelete(release); setOpen(false); }} />
        </div>,
        document.body,
      )}
    </>
  );
}

function MenuItem({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: 'unset',
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: 14,
        color: danger ? DANGER : TEXT,
        background: hover ? 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)' : 'transparent',
      }}
    >
      {label}
    </button>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────

type CellRelease = Release & { jira_version_id?: string; sprint_names?: string[] };

interface RowGroup {
  id: string;
  label: string;
  rows: CellRelease[];
}

export interface ReleasesTableProps {
  rows?: CellRelease[];
  groups?: RowGroup[];
  calculateProgress: (r: CellRelease) => ReleaseProgress | null;
  onOpenDetail: (id: string) => void;
  onRelease: (r: CellRelease) => void;
  onArchive: (r: CellRelease) => void;
  onMerge: (r: CellRelease) => void;
  onEdit: (r: CellRelease) => void;
  onDelete: (r: CellRelease) => void;
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontSize: 12,
  fontWeight: 600,
  color: TEXT_SUBTLE,
  background: 'transparent',
  borderBottom: `1px solid ${GRAY_BORDER}`,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: 14,
  color: TEXT,
  background: 'transparent',
  borderBottom: 'none',
  verticalAlign: 'middle',
};

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function ReleaseRow({
  r, calculateProgress, onOpenDetail, onRelease, onArchive, onMerge, onEdit, onDelete,
}: {
  r: CellRelease;
} & Omit<ReleasesTableProps, 'rows' | 'groups'>) {
  const isOverdue =
    r.status === 'unreleased' && r.release_date && new Date(r.release_date) < new Date();
  return (
    <tr>
      <td style={tdStyle}>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onOpenDetail(r.id); }}
          style={{ color: 'var(--ds-link, #0052CC)', fontWeight: 500, textDecoration: 'none' }}
        >
          {r.name}
        </a>
      </td>
      <td style={tdStyle}>
        <StatusPill status={r.status} />
      </td>
      <td style={tdStyle}>
        <ProgressBar progress={calculateProgress(r)} />
      </td>
      <td style={{ ...tdStyle, color: TEXT_SUBTLE, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {r.sprint_names && r.sprint_names.length > 0 ? (
          <span title={r.sprint_names.join(', ')}>{r.sprint_names.join(', ')}</span>
        ) : null}
      </td>
      <td style={{ ...tdStyle, color: TEXT_SUBTLE }}>{formatDate(r.start_date)}</td>
      <td style={{ ...tdStyle, color: isOverdue ? DANGER : TEXT_SUBTLE }}>
        {formatDate(r.release_date)}
      </td>
      <td style={{ ...tdStyle, color: TEXT_SUBTLE, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {r.description || ''}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        <ActionsMenu
          release={r}
          onRelease={onRelease}
          onArchive={onArchive}
          onMerge={onMerge}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

export function ReleasesTable({
  rows,
  groups,
  calculateProgress,
  onOpenDetail,
  onRelease,
  onArchive,
  onMerge,
  onEdit,
  onDelete,
}: ReleasesTableProps) {
  const rowProps = { calculateProgress, onOpenDetail, onRelease, onArchive, onMerge, onEdit, onDelete };

  return (
    <div style={{ borderBottom: `1px solid ${GRAY_BORDER}`, width: '100%' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          background: 'transparent',
        }}
      >
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '6%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}>Release</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Progress</th>
            <th style={thStyle}>Sprint / Iteration</th>
            <th style={thStyle}>Start date</th>
            <th style={thStyle}>Release date</th>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>More actions</th>
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((g) => (
                <React.Fragment key={g.id}>
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: '14px 16px 6px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: TEXT_SUBTLE,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      {g.label}
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <ReleaseRow key={r.id} r={r} {...rowProps} />
                  ))}
                </React.Fragment>
              ))
            : (rows ?? []).map((r) => <ReleaseRow key={r.id} r={r} {...rowProps} />)}
        </tbody>
      </table>
    </div>
  );
}
