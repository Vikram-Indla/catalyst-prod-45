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
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';

const BLUE_BORDER = 'var(--ds-border-selected, #1868DB)';
const BLUE_BG = 'var(--ds-background-selected, #E9F2FE)';
const BLUE_TEXT = 'var(--ds-text-selected, #0C66E4)';
const GRAY_BORDER = 'var(--ds-border, #DFE1E6)';
const TEXT = 'var(--ds-text, #292A2E)';
const TEXT_SUBTLE = 'var(--ds-text-subtle, #505258)';
const TEXT_SUBTLEST = 'var(--ds-text-subtlest, #6B778C)';
const DANGER = 'var(--ds-text-danger, #AE2A19)';

// 2026-06-26: hover underline on release title link. Inline style cannot
// express :hover, so inject a one-time stylesheet at module load. HMR-safe:
// updates textContent if the style tag already exists (CLAUDE.md 2026-06-11).
const RELEASES_TABLE_STYLE_ID = 'releases-table-title-link-css';
const RELEASES_TABLE_CSS = `
  .releases-table-title-link:hover {
    text-decoration: underline !important;
    text-decoration-color: var(--ds-link, #0052CC) !important;
    text-underline-offset: 2px;
  }
`;
if (typeof document !== 'undefined') {
  const existing = document.getElementById(RELEASES_TABLE_STYLE_ID);
  if (existing) {
    existing.textContent = RELEASES_TABLE_CSS;
  } else {
    const el = document.createElement('style');
    el.id = RELEASES_TABLE_STYLE_ID;
    el.textContent = RELEASES_TABLE_CSS;
    document.head.appendChild(el);
  }
}

// ─── Status pill ──────────────────────────────────────────────────────────

const STATUS_BORDER: Record<ReleaseStatus, string> = {
  released:   'var(--ds-border-success, #22A06B)',
  unreleased: 'var(--ds-border-selected, #1868DB)',
  archived:   'var(--ds-icon-subtle, #8993A4)',
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
        background: 'var(--ds-surface, #FFFFFF)',
        color: TEXT,
        fontSize: 'var(--ds-font-size-100)',
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

const PROGRESS_DONE = 'var(--ds-background-success-bold, #22A06B)';
const PROGRESS_IN_PROGRESS = 'var(--ds-background-information-bold, #1868DB)';
const PROGRESS_TODO = 'var(--ds-border, #DFE1E6)';

function ProgressBar({ progress }: { progress: ReleaseProgress | null }) {
  if (!progress || !progress.total) {
    return <span style={{ color: TEXT_SUBTLEST, fontSize: 'var(--ds-font-size-300)' }}>No work items</span>;
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
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '4px 0',
          }}
        >
          {release.status === 'unreleased' && (
            <MenuItem label="Release" onClick={() => { onRelease(release); setOpen(false); }} />
          )}
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
        fontSize: 'var(--ds-font-size-400)',
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
  collapsedGroups?: Set<string>;
  onToggleGroup?: (id: string) => void;
  density?: 'compact' | 'comfortable';
  /** 2026-06-26: entity-name column header. Defaults to "Release"; sprint
   *  surface passes "Sprint / Iteration". */
  entityLabel?: string;
  /** 2026-06-26: hide the middle "Sprint / Iteration" column (which lists
   *  sprint_names per release). Sprint surface IS the sprint, so the column
   *  is redundant and is hidden via this flag. */
  hideSprintsColumn?: boolean;
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontSize: 'var(--ds-font-size-200)',
  fontWeight: 600,
  color: TEXT_SUBTLE,
  background: 'transparent',
  borderBottom: `1px solid ${GRAY_BORDER}`,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: 'var(--ds-font-size-400)',
  color: TEXT,
  background: 'transparent',
  borderBottom: 'none',
  verticalAlign: 'middle',
};

const tdStyleCompact: React.CSSProperties = {
  ...tdStyle,
  padding: '6px 8px',
};

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function ReleaseRow({
  r, calculateProgress, onOpenDetail, onRelease, onArchive, onMerge, onEdit, onDelete, density,
  hideSprintsColumn,
}: {
  r: CellRelease;
} & Omit<ReleasesTableProps, 'rows' | 'groups'>) {
  const isOverdue =
    r.status === 'unreleased' && r.release_date && new Date(r.release_date) < new Date();
  const td = density === 'compact' ? tdStyleCompact : tdStyle;
  return (
    <tr>
      <td style={td}>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onOpenDetail(r.id); }}
          className="releases-table-title-link"
          style={{ color: 'var(--ds-link, #0052CC)', fontWeight: 500, textDecoration: 'none' }}
        >
          {r.name}
        </a>
      </td>
      <td style={td}>
        <StatusPill status={r.status} />
      </td>
      <td style={td}>
        <ProgressBar progress={calculateProgress(r)} />
      </td>
      {!hideSprintsColumn && (
        <td style={{ ...td, color: TEXT_SUBTLE, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.sprint_names && r.sprint_names.length > 0 ? (
            <span title={r.sprint_names.join(', ')}>{r.sprint_names.join(', ')}</span>
          ) : null}
        </td>
      )}
      <td style={{ ...td, color: TEXT_SUBTLE }}>{formatDate(r.start_date)}</td>
      <td style={{ ...td, color: isOverdue ? DANGER : TEXT_SUBTLE }}>
        {formatDate(r.release_date)}
      </td>
      <td style={{ ...td, color: TEXT_SUBTLE, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {r.description || ''}
      </td>
      <td style={{ ...td, textAlign: 'right' }}>
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
  collapsedGroups: collapsedGroupsProp,
  onToggleGroup: onToggleGroupProp,
  density = 'comfortable',
  entityLabel = 'Release',
  hideSprintsColumn = false,
}: ReleasesTableProps) {
  const rowProps = { calculateProgress, onOpenDetail, onRelease, onArchive, onMerge, onEdit, onDelete, density, hideSprintsColumn };
  const colSpan = hideSprintsColumn ? 7 : 8;

  const groupIdsKey = useMemo(() => (groups ?? []).map((g) => g.id).join('|'), [groups]);
  const [internalCollapsed, setInternalCollapsed] = useState<Set<string>>(() => {
    const ids = (groups ?? []).map((g) => g.id);
    return new Set(ids.slice(1));
  });
  useEffect(() => {
    if (collapsedGroupsProp) return;
    const ids = (groups ?? []).map((g) => g.id);
    setInternalCollapsed(new Set(ids.slice(1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdsKey]);

  const collapsedGroups = collapsedGroupsProp ?? internalCollapsed;

  const toggleGroup = useCallback((id: string) => {
    if (onToggleGroupProp) {
      onToggleGroupProp(id);
      return;
    }
    setInternalCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [onToggleGroupProp]);

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
          <col style={{ width: hideSprintsColumn ? '24%' : '18%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '15%' }} />
          {!hideSprintsColumn && <col style={{ width: '14%' }} />}
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: hideSprintsColumn ? '23%' : '15%' }} />
          <col style={{ width: '6%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}>{entityLabel}</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Progress</th>
            {!hideSprintsColumn && <th style={thStyle}>Sprint / Iteration</th>}
            <th style={thStyle}>Start date</th>
            <th style={thStyle}>Release date</th>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>More actions</th>
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((g) => {
                const collapsed = collapsedGroups.has(g.id);
                return (
                  <React.Fragment key={g.id}>
                    <tr>
                      <td
                        colSpan={colSpan}
                        style={{
                          padding: '14px 8px 6px',
                          background: 'transparent',
                        }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={!collapsed}
                          onClick={() => toggleGroup(g.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleGroup(g.id);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginLeft: -5,
                            cursor: 'pointer',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              color: TEXT_SUBTLE,
                              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                              transition: 'transform 200ms ease',
                              flexShrink: 0,
                            }}
                          >
                            <ChevronDownIcon label="" size="medium" />
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--ds-font-size-200)',
                              fontWeight: 600,
                              color: TEXT_SUBTLE,
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                            }}
                          >
                            {g.label}
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--ds-font-size-200)',
                              fontWeight: 500,
                              color: TEXT_SUBTLEST,
                            }}
                          >
                            {g.rows.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!collapsed &&
                      g.rows.map((r) => (
                        <ReleaseRow key={r.id} r={r} {...rowProps} />
                      ))}
                  </React.Fragment>
                );
              })
            : (rows ?? []).map((r) => <ReleaseRow key={r.id} r={r} {...rowProps} />)}
        </tbody>
      </table>
    </div>
  );
}
