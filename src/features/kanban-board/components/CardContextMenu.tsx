/**
 * CardContextMenu — Jira board card ⋯ menu with drill-in submenus.
 * Move/Change status (columns), Copy link/key, Add flag, Add label,
 * Link work item (→ ph_issue_links), Add parent (→ parent_key), Archive, Delete.
 */
import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { PortalMenu, MenuItem } from './PortalMenu';
import { SubmenuItem } from './SubmenuItem';
import { SelectCoverPanel } from './SelectCoverPanel';
import type { WorkItemTable } from '../data/useCoverGallery';
import { IssueTypeIcon } from './IssueTypeIcon';
import type { BoardIssue, KanbanColumn, StatusCategory } from '../types';
import type { MovePositionDirection } from '../data/useKanbanMutations';

const PARENT_TYPES = ['epic', 'story', 'feature', 'task'];
const LINK_TYPES = ['relates to', 'blocks', 'is blocked by', 'duplicates', 'clones'];

interface Props {
  issue: BoardIssue;
  issues: BoardIssue[];
  columns: KanbanColumn[];
  colPrimaryStatus: Record<string, string>;
  /** In-column ordering (position asc nullsLast, then updated_at desc) that the
   *  Move-work-item submenu uses to compute disabled bounds and pass to the
   *  reorder RPC. First item in the list = top of column, last = bottom. */
  columnIssueIds: string[];
  onMoveStatus: (issueId: string, status: string, category: StatusCategory) => void;
  onReorder: (issueId: string, direction: MovePositionDirection, columnIssueIds: string[]) => void;
  onCopyLink: (issue: BoardIssue) => void;
  onCopyKey: (issue: BoardIssue) => void;
  onFlag: (issue: BoardIssue) => void;
  onAddLabel: (issue: BoardIssue) => void;
  onSetParent: (issue: BoardIssue, parentKey: string, parentSummary: string) => void;
  onLinkOpen: (issue: BoardIssue) => void;
  onSetCover: (issue: BoardIssue, cover: string | null) => void;
  /** Underlying table for the cover image gallery — mode-dispatched by the host. */
  coverTable: WorkItemTable;
  onArchive: (issue: BoardIssue) => void;
  onDelete: (issue: BoardIssue) => void;
}

const Divider = () => <div style={{ height: 1, background: token('color.border', '#091E4224'), margin: '4px 0' }} />;

function ParentItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick}
      style={{ width: '100%', height: 32, padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'transparent', color: token('color.text', 'var(--ds-text)'), fontSize: 'var(--ds-font-size-400)', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <span>{label}</span>
      <ChevronRightIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
    </button>
  );
}


const searchInputStyle: React.CSSProperties = {
  width: 'calc(100% - 16px)', margin: '4px 8px', height: 32, padding: '0 8px',
  border: `2px solid var(--ds-border-input)`, borderRadius: 3, outline: 'none',
  fontSize: 'var(--ds-font-size-300)', fontFamily: 'inherit', boxSizing: 'border-box',
};

function IssueRow({ issue, onClick }: { issue: BoardIssue; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick}
      style={{ width: '100%', minHeight: 36, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <IssueTypeIcon issueType={issue.issueType} size={16} />
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)'), flexShrink: 0 }}>{issue.issueKey}</span>
      <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text', 'var(--ds-text)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.summary}</span>
    </button>
  );
}

/* Add-parent picker — its own state so the query resets each time the
   submenu opens/closes and doesn't leak into the Link-work-item picker. */
const AddParentSubmenu: React.FC<{
  issue: BoardIssue;
  issues: BoardIssue[];
  close: () => void;
  onSetParent: Props['onSetParent'];
}> = ({ issue, issues, close, onSetParent }) => {
  const [query, setQuery] = useState('');
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (i.id === issue.id || i.issueKey === issue.issueKey) return false;
      if (!PARENT_TYPES.includes((i.issueType ?? '').toLowerCase())) return false;
      if (q && !`${i.issueKey} ${i.summary}`.toLowerCase().includes(q)) return false;
      return true;
    }).slice(0, 25);
  }, [issues, issue, query]);
  return (
    <>
      <input
        autoFocus placeholder="Search epics, stories…"
        value={query} onChange={(e) => setQuery(e.target.value)} style={searchInputStyle}
      />
      {candidates.length === 0 && (
        <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)') }}>
          No matches
        </div>
      )}
      {candidates.map((c) => (
        <IssueRow key={c.id} issue={c} onClick={() => { onSetParent(issue, c.issueKey, c.summary); close(); }} />
      ))}
    </>
  );
};

export const CardContextMenu: React.FC<Props> = (p) => {
  const { issue, issues, columns, colPrimaryStatus, columnIssueIds } = p;

  /* Dynamic status list — columns come from the mode-specific workflow inside
     useKanbanData (project → board_columns, product → BR workflow, incident →
     piWorkflow, tasks → task_statuses, release → RELEASE_BOARD_COLUMNS, test →
     TEST_BOARD_COLUMNS). We surface one row per column here so the "Change
     status" submenu matches whatever workflow the surface actually uses. */
  const targets = columns.map((c) => ({
    id: c.id,
    name: c.name,
    status: colPrimaryStatus[c.id] ?? c.statuses[0],
    category: c.category,
    statusLower: (colPrimaryStatus[c.id] ?? c.statuses[0] ?? '').toLowerCase(),
    matchers: (c.statuses ?? []).map((s) => (s ?? '').toLowerCase()),
  }));
  const currentStatusLower = (issue.status ?? '').toLowerCase();

  const idxInColumn = columnIssueIds.indexOf(issue.id);
  const isFirst = idxInColumn <= 0;
  const isLast  = idxInColumn === -1 || idxInColumn === columnIssueIds.length - 1;


  return (
    <span onClick={(e) => e.stopPropagation()}>
      <PortalMenu
        align="right" minWidth={240}
        ariaLabel={`Actions for ${issue.issueKey}`}
        trigger={() => (
          <span role="button" aria-label={`More actions for ${issue.issueKey}`}
            style={{ width: 24, height: 24, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: token('elevation.surface.raised', 'var(--ds-surface)'), boxShadow: token('elevation.shadow.raised', '0 1px 1px #091E4240, 0 0 1px #091E424F'), cursor: 'pointer' }}>
            <MoreIcon label="" size="small" primaryColor={token('color.icon', 'var(--ds-icon)')} />
          </span>
        )}
      >
        {(close) => {
          const fireMove = (dir: MovePositionDirection) => {
            p.onReorder(issue.id, dir, columnIssueIds);
            close();
          };
          const fireStatus = (t: typeof targets[number]) => {
            p.onMoveStatus(issue.id, t.status, t.category);
            close();
          };
          return (
            <>
              <SubmenuItem
                label="Move work item"
                ariaLabel="Move work item"
                onCloseParentMenu={close}
              >
                {() => (
                  <>
                    <MenuItem variant="plain" disabled={isFirst} onClick={() => fireMove('up')}>Up</MenuItem>
                    <MenuItem variant="plain" disabled={isLast}  onClick={() => fireMove('down')}>Down</MenuItem>
                    <Divider />
                    <MenuItem variant="plain" disabled={isFirst} onClick={() => fireMove('top')}>To the top</MenuItem>
                    <MenuItem variant="plain" disabled={isLast}  onClick={() => fireMove('bottom')}>To the bottom</MenuItem>
                  </>
                )}
              </SubmenuItem>
              <SubmenuItem
                label="Change status"
                ariaLabel="Change status"
                onCloseParentMenu={close}
                minWidth={220}
              >
                {() => targets.length === 0
                  ? <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest', 'var(--ds-icon-subtle)') }}>No statuses available</div>
                  : (
                    <>
                      {targets.map((t) => {
                        // A status is "current" if the issue's status matches the
                        // column primary OR any of the column's mapped statuses.
                        // Second half handles multi-status columns (project/product)
                        // where the primary != the issue's exact status.
                        const isCurrent = t.statusLower === currentStatusLower
                          || t.matchers.includes(currentStatusLower);
                        return (
                          <MenuItem
                            key={t.id}
                            variant="check"
                            selected={isCurrent}
                            disabled={isCurrent}
                            onClick={() => fireStatus(t)}
                          >
                            {t.name}
                          </MenuItem>
                        );
                      })}
                    </>
                  )
                }
              </SubmenuItem>
              <Divider />
              <MenuItem variant="plain" onClick={() => { p.onCopyLink(issue); close(); }}>Copy link</MenuItem>
              <MenuItem variant="plain" onClick={() => { p.onCopyKey(issue); close(); }}>Copy key</MenuItem>
              <Divider />
              <MenuItem variant="plain" onClick={() => { p.onFlag(issue); close(); }}>{issue.isFlagged ? 'Remove flag' : 'Add flag'}</MenuItem>
              <MenuItem variant="plain" onClick={() => { p.onAddLabel(issue); close(); }}>Add label</MenuItem>
              <MenuItem variant="plain" onClick={() => { p.onLinkOpen(issue); close(); }}>Link work item</MenuItem>
              <SubmenuItem
                label="Add parent"
                ariaLabel="Add parent"
                onCloseParentMenu={close}
                minWidth={280}
              >
                {(closeSub) => (
                  <AddParentSubmenu
                    issue={issue}
                    issues={issues}
                    close={() => { closeSub(); close(); }}
                    onSetParent={p.onSetParent}
                  />
                )}
              </SubmenuItem>
              <SubmenuItem
                label="Select cover"
                ariaLabel="Select cover"
                onCloseParentMenu={close}
                minWidth={380}
              >
                {(closeSub) => (
                  <SelectCoverPanel
                    currentCover={issue.cover}
                    workItemId={issue.id}
                    workItemTable={p.coverTable}
                    onSelect={(cover) => p.onSetCover(issue, cover)}
                    onRemove={() => p.onSetCover(issue, null)}
                    onClose={() => { closeSub(); close(); }}
                  />
                )}
              </SubmenuItem>
              <Divider />
              <MenuItem variant="plain" onClick={() => { p.onArchive(issue); close(); }}>Archive</MenuItem>
              <button role="menuitem" onClick={() => { p.onDelete(issue); close(); }}
                style={{ width: '100%', height: 32, padding: '8px 20px', display: 'flex', alignItems: 'center', border: 'none', background: 'transparent', color: token('color.text.danger', 'var(--ds-text-danger)'), fontSize: 'var(--ds-font-size-400)', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.danger', 'var(--ds-background-danger, var(--ds-background-danger))'); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>Delete</button>
            </>
          );
        }}
      </PortalMenu>
    </span>
  );
};
