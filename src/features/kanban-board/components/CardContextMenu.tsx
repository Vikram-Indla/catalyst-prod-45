/**
 * CardContextMenu — Jira board card ⋯ menu with drill-in submenus.
 * Move/Change status (columns), Copy link/key, Add flag, Add label,
 * Link work item (→ ph_issue_links), Add parent (→ parent_key), Archive, Delete.
 */
import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import { PortalMenu, MenuItem } from './PortalMenu';
import { IssueTypeIcon } from './IssueTypeIcon';
import type { BoardIssue, KanbanColumn, StatusCategory } from '../types';

const PARENT_TYPES = ['epic', 'story', 'feature', 'task'];
const LINK_TYPES = ['relates to', 'blocks', 'is blocked by', 'duplicates', 'clones'];

interface Props {
  issue: BoardIssue;
  issues: BoardIssue[];
  columns: KanbanColumn[];
  colPrimaryStatus: Record<string, string>;
  onMoveStatus: (issueId: string, status: string, category: StatusCategory) => void;
  onCopyLink: (issue: BoardIssue) => void;
  onCopyKey: (issue: BoardIssue) => void;
  onFlag: (issue: BoardIssue) => void;
  onAddLabel: (issue: BoardIssue) => void;
  onSetParent: (issue: BoardIssue, parentKey: string, parentSummary: string) => void;
  onLink: (issue: BoardIssue, targetKey: string, linkType: string) => void;
  onArchive: (issue: BoardIssue) => void;
  onDelete: (issue: BoardIssue) => void;
}

const Divider = () => <div style={{ height: 1, background: token('color.border', '#091E4224'), margin: '4px 0' }} />;

function ParentItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick}
      style={{ width: '100%', height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'transparent', color: token('color.text', 'var(--ds-text, #172B4D)'), fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <span>{label}</span>
      <ChevronRightIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle, #626F86)')} />
    </button>
  );
}

function BackItem({ onClick }: { onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick}
      style={{ width: '100%', height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: token('color.text.subtle', 'var(--ds-icon, #44546F)'), fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
      <ChevronLeftIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle, #626F86)')} />Back
    </button>
  );
}

const searchInputStyle: React.CSSProperties = {
  width: 'calc(100% - 16px)', margin: '4px 8px', height: 32, padding: '0 8px',
  border: `2px solid var(--ds-border-input, #DFE1E6)`, borderRadius: 3, outline: 'none',
  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};

function IssueRow({ issue, onClick }: { issue: BoardIssue; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick}
      style={{ width: '100%', minHeight: 36, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <IssueTypeIcon issueType={issue.issueType} size={16} />
      <span style={{ fontSize: 12, color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'), flexShrink: 0 }}>{issue.issueKey}</span>
      <span style={{ fontSize: 13, color: token('color.text', 'var(--ds-text, #172B4D)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.summary}</span>
    </button>
  );
}

export const CardContextMenu: React.FC<Props> = (p) => {
  const { issue, issues, columns, colPrimaryStatus } = p;
  const [view, setView] = useState<'main' | 'status' | 'move' | 'parent' | 'link'>('main');
  const [query, setQuery] = useState('');
  const [linkType, setLinkType] = useState(LINK_TYPES[0]);

  const targets = columns.map((c) => ({ id: c.id, name: c.name, status: colPrimaryStatus[c.id] ?? c.statuses[0], category: c.category }));

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (i.id === issue.id || i.issueKey === issue.issueKey) return false;
      if (view === 'parent' && !PARENT_TYPES.includes((i.issueType ?? '').toLowerCase())) return false;
      if (q && !`${i.issueKey} ${i.summary}`.toLowerCase().includes(q)) return false;
      return true;
    }).slice(0, 25);
  }, [issues, issue, view, query]);

  const reset = () => { setView('main'); setQuery(''); };

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <PortalMenu
        align="right" minWidth={240}
        ariaLabel={`Actions for ${issue.issueKey}`}
        onClose={reset}
        trigger={() => (
          <span role="button" aria-label={`More actions for ${issue.issueKey}`}
            style={{ width: 24, height: 24, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: token('elevation.surface.raised', 'var(--ds-surface, #FFFFFF)'), boxShadow: token('elevation.shadow.raised', '0 1px 1px #091E4240, 0 0 1px #091E424F'), cursor: 'pointer' }}>
            <MoreIcon label="" size="small" primaryColor={token('color.icon', 'var(--ds-icon, #44546F)')} />
          </span>
        )}
      >
        {(close) => {
          if (view === 'status' || view === 'move') {
            return (<><BackItem onClick={() => setView('main')} /><Divider />
              {targets.map((t) => (
                <MenuItem key={t.id} variant="plain" onClick={() => { p.onMoveStatus(issue.id, t.status, t.category); reset(); close(); }}>{t.name}</MenuItem>
              ))}</>);
          }
          if (view === 'parent') {
            return (<><BackItem onClick={reset} /><Divider />
              <input autoFocus placeholder="Search epics, stories…" value={query} onChange={(e) => setQuery(e.target.value)} style={searchInputStyle} />
              {candidates.length === 0 && <div style={{ padding: '8px 12px', fontSize: 13, color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)') }}>No matches</div>}
              {candidates.map((c) => <IssueRow key={c.id} issue={c} onClick={() => { p.onSetParent(issue, c.issueKey, c.summary); reset(); close(); }} />)}</>);
          }
          if (view === 'link') {
            return (<><BackItem onClick={reset} /><Divider />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px' }}>
                {LINK_TYPES.map((lt) => (
                  <button key={lt} onClick={() => setLinkType(lt)}
                    style={{ height: 22, padding: '0 8px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                      background: linkType === lt ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)') : token('color.background.neutral', '#091E420F'),
                      color: linkType === lt ? token('color.text.selected', 'var(--ds-link, #0C66E4)') : token('color.text', 'var(--ds-text, var(--ds-text, #172B4D))') }}>{lt}</button>
                ))}
              </div>
              <input autoFocus placeholder="Search work items…" value={query} onChange={(e) => setQuery(e.target.value)} style={searchInputStyle} />
              {candidates.map((c) => <IssueRow key={c.id} issue={c} onClick={() => { p.onLink(issue, c.issueKey, linkType); reset(); close(); }} />)}</>);
          }
          return (
            <>
              <ParentItem label="Move work item" onClick={() => setView('move')} />
              <ParentItem label="Change status" onClick={() => setView('status')} />
              <Divider />
              <MenuItem variant="plain" onClick={() => { p.onCopyLink(issue); close(); }}>Copy link</MenuItem>
              <MenuItem variant="plain" onClick={() => { p.onCopyKey(issue); close(); }}>Copy key</MenuItem>
              <Divider />
              <MenuItem variant="plain" onClick={() => { p.onFlag(issue); close(); }}>{issue.isFlagged ? 'Remove flag' : 'Add flag'}</MenuItem>
              <MenuItem variant="plain" onClick={() => { p.onAddLabel(issue); close(); }}>Add label</MenuItem>
              <ParentItem label="Link work item" onClick={() => setView('link')} />
              <ParentItem label="Add parent" onClick={() => setView('parent')} />
              <Divider />
              <MenuItem variant="plain" onClick={() => { p.onArchive(issue); close(); }}>Archive</MenuItem>
              <button role="menuitem" onClick={() => { p.onDelete(issue); close(); }}
                style={{ width: '100%', height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', border: 'none', background: 'transparent', color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'), fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.danger', 'var(--ds-background-danger, var(--ds-background-danger, #FFECEB))'); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>Delete</button>
            </>
          );
        }}
      </PortalMenu>
    </span>
  );
};
