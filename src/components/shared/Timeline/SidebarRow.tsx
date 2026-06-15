/**
 * SidebarRow — single tree row in the Timeline sidebar.
 *
 * Hub-agnostic. Each interactive surface (checkbox, collapse toggle, progress bar,
 * inline create, more-actions menu and its child modals) is gated by a feature
 * flag or the presence of a mutation callback. Pages provide whichever subset
 * applies; the row hides everything else cleanly.
 */

import React, { useState, useRef, useEffect } from 'react';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import MoreIcon from '@atlaskit/icon/glyph/more';
import EditorAddIcon from '@atlaskit/icon/glyph/editor/add';
import EditorDoneIcon from '@atlaskit/icon/glyph/editor/done';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { useNavigate } from 'react-router-dom';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusPill } from '@/components/shared/StatusPill';
import { resolveAvatarUrl } from '@/lib/avatars';
import {
  type TimelineIssue,
  type TimelineMutations,
  ROW_H,
  JIRA_EPIC_COLORS,
} from './types';
import { computeEpicProgress, iconBtnStyle, flattenAll } from './utils';
import { PortalMenu, MenuItemRow } from './primitives';
import { EditDatesModal } from './EditDatesModal';

export interface SidebarRowProps {
  issue: TimelineIssue;
  depth: number;
  collapsed: boolean;
  onToggle: (key: string) => void;
  isSelected: boolean;
  onSelect: (key: string) => void;
  onOpenDetail: (issue: TimelineIssue) => void;
  buildIssueDetailRoute: (issueKey: string) => string;
  /** When provided, the row uses this to compute parent candidates / available versions. */
  allItems: TimelineIssue[];
  /* feature flags */
  enableCheckbox?: boolean;
  enableProgress?: boolean;
  enableInlineCreate?: boolean;
  enableMenu?: boolean;
  /* mutations (used by menu / inline create / edit dates) */
  mutations?: TimelineMutations;
}

export function SidebarRow({
  issue,
  depth,
  collapsed,
  onToggle,
  isSelected,
  onSelect,
  onOpenDetail,
  buildIssueDetailRoute,
  allItems,
  enableCheckbox = true,
  enableProgress = true,
  enableInlineCreate = true,
  enableMenu = true,
  mutations,
}: SidebarRowProps) {
  const hasChildren = issue.children.length > 0;
  const progress = enableProgress && hasChildren ? computeEpicProgress(issue) : null;
  const [rowHovered, setRowHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editDatesOpen, setEditDatesOpen] = useState(false);
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [inlineCreateType, setInlineCreateType] = useState('Story');
  const [inlineCreateSummary, setInlineCreateSummary] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const inlineCreateInputRef = useRef<HTMLInputElement>(null);
  const typePickerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [moveOpen, setMoveOpen] = useState(false);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [parentCandidates, setParentCandidates] = useState<TimelineIssue[]>([]);
  const [depsOpen, setDepsOpen] = useState(false);
  const [depsLinkType, setDepsLinkType] = useState<string>('blocks');
  const [depsIssueKey, setDepsIssueKey] = useState('');
  const [depsSaving, setDepsSaving] = useState(false);
  const [existingLinks, setExistingLinks] = useState<any[]>([]);

  const childTypes = issue.issueType === 'Epic'
    ? ['Story', 'Feature', 'Task']
    : issue.issueType === 'Feature'
    ? ['Story', 'Task']
    : issue.issueType === 'Story'
    ? ['Sub-task', 'Task']
    : ['Sub-task'];

  const canHaveChildren = !['Sub-task', 'Backend', 'Frontend', 'Integration', 'Idea', 'Business Request', 'Business Gap'].includes(issue.issueType ?? '');

  useEffect(() => {
    if (inlineCreateOpen && inlineCreateInputRef.current) inlineCreateInputRef.current.focus();
  }, [inlineCreateOpen]);

  const openEditDates = () => {
    setMenuOpen(false);
    setEditDatesOpen(true);
  };

  const handleRemoveDates = async () => {
    setMenuOpen(false);
    if (!mutations?.onRemoveDates) return;
    try {
      await mutations.onRemoveDates(issue.issueKey);
    } catch (err) {
      console.warn('remove dates failed:', err);
    }
  };

  const handleCreateChild = async () => {
    if (!inlineCreateSummary.trim()) return;
    if (!mutations?.onCreateChild) return;
    const summary = inlineCreateSummary.trim();
    const type = inlineCreateType;
    setInlineCreateOpen(false);
    setInlineCreateSummary('');
    try {
      await mutations.onCreateChild(issue.issueKey, issue.issueType, type, summary);
    } catch (err) {
      console.warn('create child failed:', err);
    }
  };

  const cancelInlineCreate = () => {
    setInlineCreateOpen(false);
    setInlineCreateSummary('');
    setShowTypeDropdown(false);
  };

  const handleEpicColorChange = async (hex: string) => {
    setMenuOpen(false);
    setRowHovered(false);
    if (!mutations?.onChangeEpicColor) return;
    try {
      await mutations.onChangeEpicColor(issue.issueKey, hex);
    } catch (err) {
      console.warn('color change failed:', err);
    }
  };

  const openMoveModal = () => {
    const versions = [...new Set(flattenAll(allItems).flatMap(i => i.fixVersions))].filter(Boolean).sort();
    setAvailableVersions(versions);
    setMenuOpen(false);
    setMoveOpen(true);
  };

  const handleMoveTo = async (versionName: string) => {
    setMoveOpen(false);
    if (!mutations?.onMoveToRelease) return;
    try {
      await mutations.onMoveToRelease(issue.issueKey, versionName);
    } catch (err) {
      console.warn('move to release failed:', err);
    }
  };

  const openParentPicker = () => {
    const flat = flattenAll(allItems);
    let validParentTypes: string[];
    if (issue.issueType === 'Feature') validParentTypes = ['Epic'];
    else if (['Sub-task', 'Backend', 'Frontend', 'Integration'].includes(issue.issueType)) validParentTypes = ['Story', 'Task'];
    else validParentTypes = ['Epic', 'Feature'];
    setParentCandidates(flat.filter(i => validParentTypes.includes(i.issueType) && i.issueKey !== issue.issueKey));
    setParentSearch('');
    setParentPickerOpen(true);
    setMenuOpen(false);
  };

  const handleChangeParent = async (newParentKey: string) => {
    setParentPickerOpen(false);
    if (!mutations?.onChangeParent) return;
    try {
      await mutations.onChangeParent(issue.issueKey, newParentKey);
    } catch (err) {
      console.warn('change parent failed:', err);
    }
  };

  const openDepsModal = async () => {
    setDepsIssueKey('');
    setDepsLinkType('blocks');
    setExistingLinks([]);
    setDepsOpen(true);
    setMenuOpen(false);
    if (mutations?.fetchIssueRawJson) {
      try {
        const raw = await mutations.fetchIssueRawJson(issue.issueKey);
        setExistingLinks(raw?.fields?.issuelinks ?? []);
      } catch (_) {}
    }
  };

  const handleAddDependency = async () => {
    if (!depsIssueKey.trim()) return;
    if (!mutations?.onAddDependency) return;
    setDepsSaving(true);
    try {
      await mutations.onAddDependency(issue.issueKey, depsLinkType, depsIssueKey.trim().toUpperCase());
      if (mutations.fetchIssueRawJson) {
        const raw = await mutations.fetchIssueRawJson(issue.issueKey);
        setExistingLinks(raw?.fields?.issuelinks ?? []);
      }
      setDepsIssueKey('');
    } catch (err) {
      console.warn('add dep failed:', err);
    } finally {
      setDepsSaving(false);
    }
  };

  const handleRemoveDependency = async (index: number) => {
    if (!mutations?.onRemoveDependency) return;
    try {
      await mutations.onRemoveDependency(issue.issueKey, index);
      if (mutations.fetchIssueRawJson) {
        const raw = await mutations.fetchIssueRawJson(issue.issueKey);
        setExistingLinks(raw?.fields?.issuelinks ?? []);
      }
    } catch (err) {
      console.warn('remove dep failed:', err);
    }
  };

  const showCreateChildInMenu = !!mutations?.onCreateChild && canHaveChildren;
  const showAddChildButton = enableInlineCreate && !!mutations?.onCreateChild && canHaveChildren;
  const showEditDatesInMenu = !!mutations?.onUpdateDates;
  const showRemoveDatesInMenu = !!mutations?.onRemoveDates && (issue.startDate || issue.dueDate);
  const showMoveToReleaseInMenu = !!mutations?.onMoveToRelease;
  const showChangeParentInMenu = !!mutations?.onChangeParent && issue.issueType !== 'Epic';
  const showDepsInMenu = !!mutations?.onAddDependency;
  const showEpicColorInMenu = !!mutations?.onChangeEpicColor && issue.issueType === 'Epic';
  const anyMenuActionAvailable =
    showCreateChildInMenu || showEditDatesInMenu || showRemoveDatesInMenu ||
    showMoveToReleaseInMenu || showChangeParentInMenu || showDepsInMenu || showEpicColorInMenu;
  const renderMenu = enableMenu && anyMenuActionAvailable;

  return (
    <>
    <div
      role="rowheader"
      style={{
        height: ROW_H, display: 'flex', alignItems: 'center',
        paddingLeft: 8, paddingRight: 4, gap: 6,
        borderBottom: '1px solid rgba(9,30,66,0.06)',
        overflow: 'hidden', cursor: 'pointer',
        background: isSelected
          ? 'var(--ds-background-selected, #E9F2FE)'
          : rowHovered
            ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.04))'
            : 'transparent',
        transition: 'background 80ms ease',
        position: 'relative',
      }}
      onClick={() => navigate(buildIssueDetailRoute(issue.issueKey))}
      aria-expanded={hasChildren ? !collapsed : undefined}
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => { if (!menuOpen) setRowHovered(false); }}
    >
      {/* row checkbox */}
      {enableCheckbox && (
        <div
          style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            aria-label={`Select ${issue.issueKey}`}
            checked={isSelected}
            onChange={() => onSelect(issue.issueKey)}
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--ds-background-selected-bold, #0052CC)', margin: 0 }}
          />
        </div>
      )}

      {/* collapse toggle */}
      <div
        style={{ width: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text-subtle, #44546F)', marginLeft: depth * 28 }}
        onClick={hasChildren ? e => { e.stopPropagation(); onToggle(issue.issueKey); } : undefined}
        aria-label={hasChildren ? (collapsed ? `Expand ${issue.issueKey}` : `Collapse ${issue.issueKey}`) : undefined}
      >
        {hasChildren && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {collapsed
              ? <path d="M9 6l6 6-6 6" />
              : <path d="M6 9l6 6 6-6" />
            }
          </svg>
        )}
      </div>

      {/* type icon */}
      <div style={{ flexShrink: 0 }}>
        <JiraIssueTypeIcon type={issue.issueType} size={14} />
      </div>

      {/* text block */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {issue.issueKey.includes('-LOCAL-') ? (
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1.3, flexShrink: 0, fontFamily: 'var(--ds-font-family-body)' }}>
            Saving…
          </span>
        ) : (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); navigate(buildIssueDetailRoute(issue.issueKey)); }}
            style={{
              fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)',
              whiteSpace: 'nowrap', lineHeight: 1.3,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'var(--ds-font-family-body)', flexShrink: 0,
            }}
            aria-label={`Open ${issue.issueKey} in full page`}
          >
            {issue.issueKey}
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <span style={{
            fontSize: 13, fontWeight: 400, color: 'var(--ds-text, #172B4D)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
            display: 'block', fontFamily: 'var(--ds-font-family-body)',
          }}>
            {issue.summary}
          </span>
        </div>
      </div>

      {/* status pill — child rows only */}
      {depth > 0 && issue.status && (
        <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <StatusPill value={issue.statusCategory} label={issue.status} />
        </div>
      )}

      {/* assignee avatar — child rows only */}
      {depth > 0 && issue.assigneeDisplayName && (
        <Tooltip content={issue.assigneeDisplayName} position="left">
          <span style={{ flexShrink: 0, lineHeight: 0 }}>
            <Avatar size="xsmall" src={resolveAvatarUrl(issue.assigneeDisplayName) ?? undefined} name={issue.assigneeDisplayName} />
          </span>
        </Tooltip>
      )}

      {/* progress bar */}
      {progress && progress.total > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 8 + (enableCheckbox ? 16 + 6 : 0) + depth * 28 + 20 + 6 + 14 + 6,
            right: 8,
            maxWidth: 200,
            bottom: 4,
            height: 3,
            display: 'flex',
            overflow: 'hidden',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        >
          {progress.done > 0 && <div style={{ flex: progress.done, background: 'var(--ds-chart-success-bold, #94C748)' }} />}
          {progress.inProgress > 0 && <div style={{ flex: progress.inProgress, background: 'var(--ds-chart-information-bold, #8FB8F6)' }} />}
          {progress.toDo > 0 && <div style={{ flex: progress.toDo, background: 'var(--ds-background-neutral, #DDDEE1)' }} />}
        </div>
      )}

      {/* + add child */}
      {showAddChildButton && (
        <button
          onClick={e => { e.stopPropagation(); setInlineCreateOpen(v => !v); if (!inlineCreateOpen) setInlineCreateType(childTypes[0]); }}
          aria-label={`Add child issue to ${issue.issueKey}`}
          style={{
            ...iconBtnStyle,
            width: rowHovered || inlineCreateOpen ? 24 : 0,
            overflow: 'hidden',
            opacity: rowHovered || inlineCreateOpen ? 1 : 0,
            padding: 0,
            transition: 'width 80ms ease, opacity 80ms ease',
          }}
        >
          <EditorAddIcon label="" size="small" />
        </button>
      )}

      {/* open-in-side-panel button */}
      <button
        type="button"
        aria-label={`Open ${issue.issueKey} in side panel`}
        onClick={e => { e.stopPropagation(); onOpenDetail(issue); }}
        style={{
          ...iconBtnStyle,
          width: rowHovered ? 24 : 0,
          overflow: 'hidden',
          opacity: rowHovered ? 1 : 0,
          padding: 0,
          transition: 'width 80ms ease, opacity 80ms ease',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="15" y1="3" x2="15" y2="21" />
          <line x1="17.5" y1="8" x2="19" y2="8" />
          <line x1="17.5" y1="12" x2="19" y2="12" />
          <line x1="17.5" y1="16" x2="19" y2="16" />
        </svg>
      </button>

      {/* ⋯ more actions */}
      {renderMenu && (
        <button
          ref={menuBtnRef}
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          aria-label={`More actions for ${issue.issueKey}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{
            ...iconBtnStyle,
            width: rowHovered || menuOpen ? 24 : 0,
            overflow: 'hidden',
            opacity: rowHovered || menuOpen ? 1 : 0,
            padding: 0,
            transition: 'width 80ms ease, opacity 80ms ease',
          }}
        >
          <MoreIcon label="" size="small" />
        </button>
      )}

      {renderMenu && (
        <PortalMenu
          isOpen={menuOpen}
          onClose={() => { setMenuOpen(false); setRowHovered(false); }}
          triggerRef={menuBtnRef}
          minWidth={220}
          alignRight
        >
          {showCreateChildInMenu && (
            <MenuItemRow
              label={issue.issueType === 'Epic' ? 'Create issue in epic' : 'Create child issue'}
              onClick={() => { setMenuOpen(false); setInlineCreateType(childTypes[0]); setInlineCreateOpen(true); }}
            />
          )}
          {showEpicColorInMenu && (
            <>
              <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
              <div style={{ padding: '4px 12px 2px', fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-body)' }}>
                Epic color
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px 8px' }}>
                {JIRA_EPIC_COLORS.map(({ label, hex }) => (
                  <button
                    key={hex}
                    type="button"
                    title={label}
                    aria-label={`Set epic color to ${label}`}
                    onClick={(e) => { e.stopPropagation(); handleEpicColorChange(hex); }}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', padding: 0, cursor: 'pointer', flexShrink: 0,
                      background: hex, outline: 'none',
                      border: issue.epicColor === hex ? '2px solid var(--ds-border-selected, #0052CC)' : '2px solid transparent',
                      boxShadow: issue.epicColor === hex ? '0 0 0 1.5px #fff inset' : 'none',
                    }}
                  />
                ))}
                {issue.epicColor && (
                  <button
                    type="button"
                    title="Remove color"
                    aria-label="Remove epic color"
                    onClick={(e) => { e.stopPropagation(); handleEpicColorChange(''); }}
                    style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px dashed var(--ds-border, #DFE1E6)', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text-subtlest, #626F86)', fontSize: 12, fontWeight: 600, outline: 'none' }}
                  >
                    ×
                  </button>
                )}
              </div>
            </>
          )}
          {(showMoveToReleaseInMenu || showChangeParentInMenu || showDepsInMenu) && (
            <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
          )}
          {showMoveToReleaseInMenu && <MenuItemRow label="Move to release" onClick={openMoveModal} />}
          {showChangeParentInMenu && <MenuItemRow label="Change parent" onClick={openParentPicker} />}
          {showDepsInMenu && <MenuItemRow label="Edit dependencies" onClick={openDepsModal} />}
          {(showEditDatesInMenu || showRemoveDatesInMenu) && (
            <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
          )}
          {showEditDatesInMenu && <MenuItemRow label="Edit dates" onClick={openEditDates} />}
          {showRemoveDatesInMenu && <MenuItemRow label="Remove dates" onClick={handleRemoveDates} danger />}
        </PortalMenu>
      )}

      {editDatesOpen && mutations?.onUpdateDates && (
        <EditDatesModal
          issue={issue}
          onClose={() => setEditDatesOpen(false)}
          onSave={(start, due) => mutations.onUpdateDates!(issue.issueKey, start, due)}
        />
      )}

      {/* Move to release modal */}
      <ModalTransition>
        {moveOpen && (
          <Modal onClose={() => setMoveOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Move to release</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  onClick={() => handleMoveTo('')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') handleMoveTo(''); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--ds-text-subtle, #44546F)', fontFamily: 'var(--ds-font-family-body)', borderRadius: 3 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  No release
                </div>
                {availableVersions.length === 0 && (
                  <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic', fontFamily: 'var(--ds-font-family-body)' }}>
                    No releases found for this project
                  </div>
                )}
                {availableVersions.map(v => (
                  <div
                    key={v}
                    onClick={() => handleMoveTo(v)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') handleMoveTo(v); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{ flex: 1 }}>{v}</span>
                    {issue.fixVersions.includes(v) && (
                      <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-body)' }}>current</span>
                    )}
                  </div>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setMoveOpen(false)}>Cancel</Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Change parent modal */}
      <ModalTransition>
        {parentPickerOpen && (
          <Modal onClose={() => setParentPickerOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Change parent</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ marginBottom: 12 }}>
                <input
                  autoFocus
                  value={parentSearch}
                  onChange={e => setParentSearch(e.target.value)}
                  placeholder="Search by key or summary…"
                  style={{
                    width: '100%', height: 36, padding: '0 10px', boxSizing: 'border-box',
                    border: '1px solid var(--ds-border-input, #DFE1E6)', borderRadius: 3, fontSize: 13,
                    outline: 'none', fontFamily: 'var(--ds-font-family-body)', color: 'var(--ds-text, #172B4D)',
                    background: 'var(--ds-background-input, #FFFFFF)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ds-border-focused, #388BFF)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--ds-border-input, #DFE1E6)'; }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 260, overflowY: 'auto' }}>
                {parentCandidates
                  .filter(c => !parentSearch || c.issueKey.toLowerCase().includes(parentSearch.toLowerCase()) || c.summary.toLowerCase().includes(parentSearch.toLowerCase()))
                  .slice(0, 50)
                  .map(c => (
                    <div
                      key={c.issueKey}
                      onClick={() => handleChangeParent(c.issueKey)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') handleChangeParent(c.issueKey); }}
                      style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <JiraIssueTypeIcon type={c.issueType} size={14} />
                      <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-body)', flexShrink: 0 }}>{c.issueKey}</span>
                      <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.summary}</span>
                    </div>
                  ))
                }
                {parentCandidates.filter(c => !parentSearch || c.issueKey.toLowerCase().includes(parentSearch.toLowerCase()) || c.summary.toLowerCase().includes(parentSearch.toLowerCase())).length === 0 && (
                  <div style={{ padding: '12px', fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic', fontFamily: 'var(--ds-font-family-body)', textAlign: 'center' }}>
                    No matching issues found
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setParentPickerOpen(false)}>Cancel</Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Edit dependencies modal */}
      <ModalTransition>
        {depsOpen && (
          <Modal onClose={() => setDepsOpen(false)} width="medium">
            <ModalHeader>
              <ModalTitle>Edit dependencies</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--ds-background-neutral-subtle, #F7F8F9)', borderRadius: 3 }}>
                <JiraIssueTypeIcon type={issue.issueType} size={13} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text-subtle, #44546F)', fontFamily: 'var(--ds-font-family-body)' }}>{issue.issueKey}</span>
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.summary}</span>
              </div>

              {existingLinks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', fontFamily: 'var(--ds-font-family-body)', marginBottom: 6 }}>
                    Existing dependencies
                  </div>
                  {existingLinks.map((link, idx) => {
                    const linkedKey = link.outwardIssue?.key ?? link.inwardIssue?.key ?? '—';
                    const linkLabel = link.type?.outward ?? link.type?.inward ?? link.type?.name ?? '—';
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: idx < existingLinks.length - 1 ? '1px solid var(--ds-border, #DFE1E6)' : 'none' }}>
                        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)', fontFamily: 'var(--ds-font-family-body)', minWidth: 90 }}>{linkLabel}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)', flex: 1 }}>{linkedKey}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-danger, #AE2A19)', fontSize: 12, fontFamily: 'var(--ds-font-family-body)', padding: '2px 6px', borderRadius: 3 }}
                          title="Remove dependency"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', fontFamily: 'var(--ds-font-family-body)', marginBottom: 8 }}>
                Add dependency
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <select
                  value={depsLinkType}
                  onChange={e => setDepsLinkType(e.target.value)}
                  style={{
                    height: 36, padding: '0 8px', border: '1px solid var(--ds-border-input, #DFE1E6)', borderRadius: 3, fontSize: 13,
                    fontFamily: 'var(--ds-font-family-body)', color: 'var(--ds-text, #172B4D)', background: 'var(--ds-background-input, #FFFFFF)', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="blocks">blocks</option>
                  <option value="is blocked by">is blocked by</option>
                  <option value="relates to">relates to</option>
                  <option value="duplicates">duplicates</option>
                </select>
                <input
                  value={depsIssueKey}
                  onChange={e => setDepsIssueKey(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddDependency(); }}
                  placeholder="Issue key (e.g. BAU-1234)"
                  style={{
                    flex: 1, minWidth: 160, height: 36, padding: '0 10px', boxSizing: 'border-box',
                    border: '1px solid var(--ds-border-input, #DFE1E6)', borderRadius: 3, fontSize: 13,
                    fontFamily: 'var(--ds-font-family-body)', color: 'var(--ds-text, #172B4D)', background: 'var(--ds-background-input, #FFFFFF)', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ds-border-focused, #388BFF)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--ds-border-input, #DFE1E6)'; }}
                />
                <Button appearance="primary" onClick={handleAddDependency} isDisabled={!depsIssueKey.trim() || depsSaving}>
                  {depsSaving ? 'Saving…' : 'Add'}
                </Button>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setDepsOpen(false)}>Close</Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </div>

    {/* inline create row */}
    {inlineCreateOpen && enableInlineCreate && mutations?.onCreateChild && (
      <div
        style={{
          height: ROW_H, display: 'flex', alignItems: 'center', gap: 8,
          paddingTop: 0, paddingBottom: 0, paddingRight: 8,
          paddingLeft: 8 + (enableCheckbox ? 16 + 6 : 0) + (depth + 1) * 28,
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          ref={typePickerRef}
          onClick={e => { e.stopPropagation(); setShowTypeDropdown(v => !v); }}
          style={{ ...iconBtnStyle, padding: 0, flexShrink: 0 }}
          title="Select type"
          aria-label="Select child issue type"
          aria-haspopup="listbox"
          aria-expanded={showTypeDropdown}
        >
          <JiraIssueTypeIcon type={inlineCreateType} size={14} />
        </button>
        <PortalMenu isOpen={showTypeDropdown} onClose={() => setShowTypeDropdown(false)} triggerRef={typePickerRef} minWidth={160}>
          {childTypes.map(ct => (
            <div
              key={ct}
              role="option"
              aria-selected={ct === inlineCreateType}
              onClick={() => { setInlineCreateType(ct); setShowTypeDropdown(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <JiraIssueTypeIcon type={ct} size={14} />
              <span>{ct}</span>
            </div>
          ))}
        </PortalMenu>
        <input
          ref={inlineCreateInputRef}
          value={inlineCreateSummary}
          onChange={e => setInlineCreateSummary(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleCreateChild(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelInlineCreate(); }
          }}
          placeholder="What needs to be done?"
          style={{
            flex: 1, height: 24, padding: '0 8px',
            border: '1px solid var(--ds-border-focused, #388BFF)',
            borderRadius: 3, fontSize: 13, outline: 'none',
            background: 'var(--ds-background-input, #FFFFFF)',
            fontFamily: 'var(--ds-font-family-body)',
            color: 'var(--ds-text, #172B4D)',
          }}
        />
        <button
          onClick={handleCreateChild}
          disabled={!inlineCreateSummary.trim()}
          style={{
            ...iconBtnStyle, padding: 0, flexShrink: 0,
            color: !inlineCreateSummary.trim() ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text-success, #1F845A)',
          }}
          title="Save"
          aria-label="Save new issue"
        >
          <EditorDoneIcon label="Save" size="small" />
        </button>
        <button
          onClick={cancelInlineCreate}
          style={{ ...iconBtnStyle, padding: 0, flexShrink: 0 }}
          title="Cancel"
          aria-label="Cancel"
        >
          <CrossIcon label="Cancel" size="small" />
        </button>
      </div>
    )}
    </>
  );
}
