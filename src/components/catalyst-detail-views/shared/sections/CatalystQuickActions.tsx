/**
 * CANONICAL — Quick actions menu (+ button) for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Matches Jira's + button below the title with dropdown:
 *   - Create child work item
 *   - Link work item
 *   - Add attachment
 *   - Add web link
 *   - Add design
 *
 * AI Sparkles button removed (jira-compare 2026-05-07): Jira has no inline
 * AI button at this position. Improve functionality lives in the right rail
 * ImproveIssueDropdown only.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import AddIcon from '@atlaskit/icon/core/add';
import SubtasksIcon from '@atlaskit/icon/core/subtasks';
import TaskIcon from '@atlaskit/icon/glyph/task';
import AttachmentIcon from '@atlaskit/icon/glyph/attachment';
import GlobeIcon from '@atlaskit/icon/core/globe';
import EditIcon from '@atlaskit/icon/core/edit';
import SearchIcon from '@atlaskit/icon/core/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import ChildIssuesIcon from '@atlaskit/icon/core/child-issues';
import BranchIcon from '@atlaskit/icon/core/branch';
import { catalystToast } from '@/lib/catalystToast';
import { emitCreateChild, emitCreateChildWorkItem, emitLinkWorkItem, emitAddDependency, emitAddAttachment, emitAddWebLink, emitAddDesign } from './quickActionsBus';
import { getAllowedChildTypes, SUBTASK_FAMILY_CANONICAL_TYPES } from '../parent-rules';

interface CatalystQuickActionsProps {
  /** Parent issue type — drives which children can be created. When
   *  omitted (legacy call sites), BOTH create options fall through to
   *  the bus handlers so no functionality is silently dropped. */
  itemType?: string | null;
  onCreateChild?: () => void;
  onCreateChildWorkItem?: () => void;
  onLinkItem?: () => void;
  onAddDependency?: () => void;
  onAddAttachment?: () => void;
  onAddWebLink?: () => void;
  onAddDesign?: () => void;
}

// Render a keyboard shortcut such as "shift+c" as inline text segments.
// Modifier keys render as their Unicode glyph (⇧ = U+21E7, Jira parity —
// same character Jira's own shortcut hints render); letter keys render
// uppercase. inline-flex + line-height 1 keeps every segment on one
// baseline so the ⇧ glyph and the letter align exactly.
function renderShortcut(combo: string): React.ReactNode {
  const parts = combo.toLowerCase().split('+').map(p => p.trim());
  return parts.map((p, i) => (
    <span
      key={i}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, fontSize: 'var(--ds-font-size-300)',
      }}
    >
      {p === 'shift' ? '⇧' : p.toUpperCase()}
    </span>
  ));
}

export function CatalystQuickActions({
  itemType,
  onCreateChild,
  onCreateChildWorkItem,
  onLinkItem,
  onAddDependency,
  onAddAttachment,
  onAddWebLink,
  onAddDesign,
}: CatalystQuickActionsProps) {
  // Which child-creation flows apply for this parent type. Derived
  // from the canonical parent-rules map:
  //   canHaveSubtasks       → allowed list intersects subtask family
  //   canHaveChildWorkItems → allowed list has any non-subtask-family type
  // When itemType is omitted (legacy call sites), fall back to showing
  // the Subtask option so no existing surface loses functionality.
  const allowedChildren = getAllowedChildTypes(itemType ?? '');
  const subtaskFamilyLower = new Set(
    SUBTASK_FAMILY_CANONICAL_TYPES.map((t) => t.toLowerCase()),
  );
  const canHaveSubtasks = itemType
    ? allowedChildren.some((t) => subtaskFamilyLower.has(t.toLowerCase()))
    : true;
  const canHaveChildWorkItems = itemType
    ? allowedChildren.some((t) => !subtaskFamilyLower.has(t.toLowerCase()))
    : false;
  // Dependencies are ph_issues-backed only (Epic/Feature/Story/Task). Hidden
  // on subtasks and on non-ph_issues types (e.g. Business Request) which use
  // a separate store. When itemType is omitted (legacy call sites), hide it.
  const DEP_TYPES = new Set(['epic', 'feature', 'story', 'task']);
  const canHaveDependencies = itemType ? DEP_TYPES.has(itemType.toLowerCase()) : false;
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMenu]);

  const textColor = 'var(--ds-text)';
  const hoverBg = 'var(--ds-background-neutral-hovered)';
  const borderColor = 'var(--ds-border)';

  // Create-subtask action extracted so both the menu item and the
  // Shift+C keyboard shortcut share one code path.
  const triggerCreateChild = useCallback(() => {
    setShowMenu(false); setSearch('');
    if (onCreateChild) onCreateChild();
    else emitCreateChild();
  }, [onCreateChild]);

  // Create child work item — separate bus channel so a future
  // ChildIssuesSection can subscribe without conflating with the
  // subtask-panel handler. Both currently route to SubtasksPanel.
  const triggerCreateChildWorkItem = useCallback(() => {
    setShowMenu(false); setSearch('');
    if (onCreateChildWorkItem) onCreateChildWorkItem();
    else emitCreateChildWorkItem();
  }, [onCreateChildWorkItem]);

  // Global Shift+C shortcut → create subtask. Mounted on the document so
  // it fires from anywhere in the open detail view (modal / side panel /
  // full page). Gated to avoid firing while the user is typing in an
  // input / textarea / contenteditable surface.
  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null): boolean => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (t.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k !== 'c') return;
      if (isTypingTarget(e.target)) return;
      // Only fire when this parent supports subtask creation. If not,
      // let the keystroke fall through so other keybindings can claim
      // it without a silent no-op.
      if (!canHaveSubtasks) return;
      e.preventDefault();
      triggerCreateChild();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [triggerCreateChild, canHaveSubtasks]);

  const menuItems = [
    canHaveSubtasks
      ? { id: 'child', icon: <SubtasksIcon label="" color={textColor} />, label: 'Create subtask', shortcut: 'shift+c', section: 'primary', action: triggerCreateChild }
      : null,
    canHaveChildWorkItems
      ? { id: 'child-work-item', icon: <ChildIssuesIcon label="" color={textColor} />, label: 'Create child work item', section: 'primary', action: triggerCreateChildWorkItem }
      : null,
    { id: 'link', icon: <TaskIcon size="small" primaryColor={textColor} />, label: 'Link work item', section: 'primary', action: () => {
      setShowMenu(false); setSearch('');
      // Caller-supplied override wins; otherwise notify any mounted
      // LinkedWorkItems section via the quickActionsBus. The section
      // expands itself, shows the LinkToolbar, focuses the picker, and
      // smooth-scrolls into view.
      if (onLinkItem) onLinkItem();
      else emitLinkWorkItem();
    } },
    canHaveDependencies
      ? { id: 'dependency', icon: <BranchIcon label="" color={textColor} />, label: 'Add Dependency', section: 'primary', action: () => {
          setShowMenu(false); setSearch('');
          // Caller override wins; else notify the mounted DependenciesSection.
          if (onAddDependency) onAddDependency();
          else emitAddDependency();
        } }
      : null,
    { id: 'attachment', icon: <AttachmentIcon size="small" primaryColor={textColor} />, label: 'Add attachment', section: 'secondary', action: () => {
      setShowMenu(false); setSearch('');
      // Caller-supplied override wins; otherwise notify any mounted
      // AttachmentsSection. Emit MUST be synchronous on this click so
      // the browser keeps the user-activation gesture chain — the
      // listener calls fileInput.click() which is gated on that.
      if (onAddAttachment) onAddAttachment();
      else emitAddAttachment();
    } },
    { id: 'weblink', icon: <GlobeIcon label="" color={textColor} />, label: 'Add web link', section: 'secondary', action: () => {
      setShowMenu(false); setSearch('');
      // Caller-supplied override wins; otherwise notify the mounted
      // WebLinksSection — opens the form, focuses URL, scrolls in.
      if (onAddWebLink) onAddWebLink();
      else emitAddWebLink();
    } },
    { id: 'design', icon: <EditIcon label="" color={textColor} />, label: 'Add design', section: 'secondary', action: () => {
      setShowMenu(false); setSearch('');
      // Caller-supplied override wins; otherwise notify the mounted
      // DesignsSection — opens the Figma URL form, focuses, scrolls.
      if (onAddDesign) onAddDesign();
      else emitAddDesign();
    } },
  ];

  const q = search.toLowerCase();
  // Drop null entries produced by the conditional create-* items above,
  // then apply the free-text filter.
  const activeItems = menuItems.filter((i): i is NonNullable<typeof i> => i != null);
  const filtered = q ? activeItems.filter(i => i.label.toLowerCase().includes(q)) : activeItems;
  const primary = filtered.filter(i => i.section === 'primary');
  const secondary = filtered.filter(i => i.section === 'secondary');

  // Four-state styling for the + trigger:
  //   idle             → 1px gray border, transparent bg, subtle dark stroke
  //   hovered          → 1px gray border, light gray bg (menu closed)
  //   active           → 2px blue border + light blue bg + blue stroke (menu open)
  //   active+hovered   → 2px blue border + DARKER blue bg + DARKER blue stroke
  //                       (so the user sees the trigger react while the menu
  //                        is already open)
  const isActiveHovered = showMenu && isHovered;
  const btnBackground = isActiveHovered
    ? 'var(--ds-background-selected-hovered)'
    : showMenu
      ? 'var(--ds-background-selected)'
      : isHovered
        ? 'var(--ds-background-neutral-hovered)'
        : 'transparent';
  const btnBorderColor = showMenu
    ? 'var(--ds-border-selected)'
    : 'var(--ds-border)';
  const btnBorderWidth = showMenu ? 2 : 1;
  const addIconColor = isActiveHovered
    ? 'var(--ds-link-pressed)'
    : showMenu
      ? 'var(--ds-text-selected)'
      : 'var(--ds-text)';
  const btnStyle: React.CSSProperties = {
    width: 32, height: 32,
    border: `${btnBorderWidth}px solid ${btnBorderColor}`,
    background: btnBackground,
    borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box',
    color: isActiveHovered
      ? 'var(--ds-link-pressed)'
      : showMenu
        ? 'var(--ds-text-selected)'
        : 'var(--ds-text-subtle)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s, border-width 0.15s',
  };

  // Search wrapper border swaps to brand blue while the input is focused,
  // matching the trigger's active-state language. 2px when focused to
  // match the trigger's active-state border width.
  const searchBorderColor = isSearchFocused
    ? 'var(--ds-border-focused)'
    : 'var(--ds-border)';
  const searchBorderWidth = isSearchFocused ? 2 : 1;

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', height: 40, padding: '8px 16px',
    fontSize: 'var(--ds-font-size-400)', fontWeight: 400, color: textColor, background: 'transparent',
    border: 'none', borderRadius: 0, cursor: 'pointer', width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'left',
  };

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
      {/* + icon chip — Jira-parity naked icon (no "Add" label). */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={btnStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-haspopup="menu"
          aria-expanded={showMenu}
          aria-label="Add"
          title="Add"
        >
          <AddIcon size="small" primaryColor={addIconColor} />
        </button>

        {showMenu && (
          <div
            role="menu"
            aria-label="Add options"
            style={{
            position: 'absolute', left: 0, top: 32, background: 'var(--ds-surface-overlay)', borderRadius: 4,
            boxShadow: 'var(--ds-shadow-overlay)',
            width: 266, zIndex: 400, padding: 0,
            animation: 'cv-slide-down 0.15s ease-out',
          }}>
            {/* Search */}
            <div style={{ margin: '4px 8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: `${searchBorderWidth}px solid ${searchBorderColor}`,
                  borderRadius: 3,
                  padding: '0px 0',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, border-width 0.15s',
                }}
              >
                <span style={{ marginLeft: 8, flexShrink: 0, display: 'flex', alignItems: 'center' }}><SearchIcon size="small" primaryColor={textColor} /></span>
                <input
                  type="text" placeholder="Find menu item" value={search}
                  onChange={e => setSearch(e.target.value)} autoFocus
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', padding: '4px 4px 4px 8px', fontSize: 'var(--ds-font-size-400)', color: textColor, width: '100%', height: 28, fontFamily: 'inherit' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textColor, display: 'flex', padding: 0, marginRight: 4, alignItems: 'center' }}>
                    <CrossIcon size="small" primaryColor={textColor} />
                  </button>
                )}
              </div>
            </div>

            {/* Primary */}
            {primary.length > 0 && primary.map(item => (
              <button key={item.id} role="menuitem" onClick={item.action} style={itemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <span
                    aria-label={`Keyboard shortcut ${item.shortcut}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      marginLeft: 8, flexShrink: 0,
                      fontSize: 'var(--ds-font-size-300)',
                      color: 'var(--ds-text-subtle)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {renderShortcut(item.shortcut)}
                  </span>
                )}
              </button>
            ))}

            {/* Separator */}
            {primary.length > 0 && secondary.length > 0 && (
              <div style={{ height: 0.5, background: borderColor }} />
            )}

            {/* Secondary */}
            {secondary.length > 0 && secondary.map(item => (
              <button key={item.id} role="menuitem" onClick={item.action} style={itemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <span
                    aria-label={`Keyboard shortcut ${item.shortcut}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      marginLeft: 8, flexShrink: 0,
                      fontSize: 'var(--ds-font-size-300)',
                      color: 'var(--ds-text-subtle)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {renderShortcut(item.shortcut)}
                  </span>
                )}
              </button>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: '12px 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', textAlign: 'center' }}>No items match</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
