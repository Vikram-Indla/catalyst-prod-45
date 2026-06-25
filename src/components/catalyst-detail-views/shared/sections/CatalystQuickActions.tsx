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
import React, { useState, useRef, useEffect } from 'react';
import AddIcon from '@atlaskit/icon/core/add';
import ChildIssuesIcon from '@atlaskit/icon/core/child-issues';
import TaskIcon from '@atlaskit/icon/glyph/task';
import AttachmentIcon from '@atlaskit/icon/glyph/attachment';
import GlobeIcon from '@atlaskit/icon/core/globe';
import EditIcon from '@atlaskit/icon/core/edit';
import SearchIcon from '@atlaskit/icon/core/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { catalystToast } from '@/lib/catalystToast';
import { emitCreateChild, emitLinkWorkItem, emitAddAttachment, emitAddWebLink, emitAddDesign } from './quickActionsBus';

interface CatalystQuickActionsProps {
  onCreateChild?: () => void;
  onLinkItem?: () => void;
  onAddAttachment?: () => void;
  onAddWebLink?: () => void;
  onAddDesign?: () => void;
}

export function CatalystQuickActions({
  onCreateChild,
  onLinkItem,
  onAddAttachment,
  onAddWebLink,
  onAddDesign,
}: CatalystQuickActionsProps) {
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

  const textColor = 'var(--ds-text, #292A2E)';
  const hoverBg = 'var(--ds-text, rgba(11, 18, 14, 0.06))';
  const borderColor = 'var(--ds-text, rgba(11, 18, 14, 0.14))';

  const menuItems = [
    { id: 'child', icon: <ChildIssuesIcon label="" color={textColor} />, label: 'Create child work item', section: 'primary', action: () => {
      setShowMenu(false); setSearch('');
      // Caller-supplied override wins; otherwise notify any mounted
      // SubtasksPanel via the quickActionsBus. The panel handles
      // expanding + entering inline-create mode; the focused input
      // auto-scrolls itself into view natively.
      if (onCreateChild) onCreateChild();
      else emitCreateChild();
    } },
    { id: 'link', icon: <TaskIcon size="small" primaryColor={textColor} />, label: 'Link work item', section: 'primary', action: () => {
      setShowMenu(false); setSearch('');
      // Caller-supplied override wins; otherwise notify any mounted
      // LinkedWorkItems section via the quickActionsBus. The section
      // expands itself, shows the LinkToolbar, focuses the picker, and
      // smooth-scrolls into view.
      if (onLinkItem) onLinkItem();
      else emitLinkWorkItem();
    } },
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
  const filtered = q ? menuItems.filter(i => i.label.toLowerCase().includes(q)) : menuItems;
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
    ? 'var(--ds-background-selected-hovered, #CCE0FF)'
    : showMenu
      ? 'var(--ds-background-selected, #E9F2FE)'
      : isHovered
        ? 'var(--ds-background-neutral-hovered, #F1F2F4)'
        : 'transparent';
  const btnBorderColor = showMenu
    ? 'var(--ds-border-selected, #0C66E4)'
    : 'var(--ds-border, #DFE1E6)';
  const btnBorderWidth = showMenu ? 2 : 1;
  const addIconColor = isActiveHovered
    ? 'var(--ds-link-pressed, #0747A6)'
    : showMenu
      ? 'var(--ds-text-selected, #0C66E4)'
      : 'var(--ds-text, #292A2E)';
  const btnStyle: React.CSSProperties = {
    width: 32, height: 32,
    border: `${btnBorderWidth}px solid ${btnBorderColor}`,
    background: btnBackground,
    borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box',
    color: isActiveHovered
      ? 'var(--ds-link-pressed, #0747A6)'
      : showMenu
        ? 'var(--ds-text-selected, #0C66E4)'
        : 'var(--ds-text-subtle, #505258)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s, border-width 0.15s',
  };

  // Search wrapper border swaps to brand blue while the input is focused,
  // matching the trigger's active-state language. 2px when focused to
  // match the trigger's active-state border width.
  const searchBorderColor = isSearchFocused
    ? 'var(--ds-border-focused, #388BFF)'
    : 'var(--ds-border, #DFE1E6)';
  const searchBorderWidth = isSearchFocused ? 2 : 1;

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', height: 40, padding: '8px 16px',
    fontSize: 14, fontWeight: 400, color: textColor, background: 'transparent',
    border: 'none', borderRadius: 0, cursor: 'pointer', width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'left',
  };

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
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
            position: 'absolute', left: 0, top: 34, background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', borderRadius: 4,
            boxShadow: 'var(--ds-text, rgba(30,31,33,0.15)) 0px 8px 12px, var(--ds-text, rgba(30,31,33,0.31)) 0px 0px 1px',
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
                  padding: '1px 0',
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
                  style={{ background: 'transparent', border: 'none', outline: 'none', padding: '4px 4px 4px 8px', fontSize: 14, color: textColor, width: '100%', height: 28, fontFamily: 'inherit' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textColor, display: 'flex', padding: 0, marginRight: 6, alignItems: 'center' }}>
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
              </button>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))', textAlign: 'center' }}>No items match</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
