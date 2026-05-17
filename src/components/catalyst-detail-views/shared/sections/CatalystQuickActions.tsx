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
import CheckIcon from '@atlaskit/icon/glyph/check';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import AttachmentIcon from '@atlaskit/icon/glyph/attachment';
import WorldIcon from '@atlaskit/icon/glyph/world';
import EditIcon from '@atlaskit/icon/core/edit';
import SearchIcon from '@atlaskit/icon/core/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { toast } from 'sonner';

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
  const hoverBg = 'rgba(11, 18, 14, 0.06)';
  const borderColor = 'rgba(11, 18, 14, 0.14)';

  const menuItems = [
    { id: 'child', icon: <CheckIcon size="small" primaryColor={textColor} />, label: 'Create child work item', section: 'primary', action: () => { setShowMenu(false); setSearch(''); onCreateChild ? onCreateChild() : toast('Create child — scroll to Child work items section'); } },
    { id: 'link', icon: <ArrowRightIcon size="small" primaryColor={textColor} />, label: 'Link work item', section: 'primary', action: () => { setShowMenu(false); setSearch(''); onLinkItem ? onLinkItem() : toast.info('Link work item — coming soon'); } },
    { id: 'attachment', icon: <AttachmentIcon size="small" primaryColor={textColor} />, label: 'Add attachment', section: 'secondary', action: () => { setShowMenu(false); setSearch(''); onAddAttachment ? onAddAttachment() : toast.info('Add attachment — coming soon'); } },
    { id: 'weblink', icon: <WorldIcon size="small" primaryColor={textColor} />, label: 'Add web link', section: 'secondary', action: () => { setShowMenu(false); setSearch(''); onAddWebLink ? onAddWebLink() : toast.info('Add web link — coming soon'); } },
    { id: 'design', icon: <EditIcon size="small" primaryColor={textColor} />, label: 'Add design', section: 'secondary', action: () => { setShowMenu(false); setSearch(''); onAddDesign ? onAddDesign() : toast.info('Add design — coming soon'); } },
  ];

  const q = search.toLowerCase();
  const filtered = q ? menuItems.filter(i => i.label.toLowerCase().includes(q)) : menuItems;
  const primary = filtered.filter(i => i.section === 'primary');
  const secondary = filtered.filter(i => i.section === 'secondary');

  /* jira-compare 2026-05-16: Jira's Add button is a transparent/borderless
     icon button. DOM probe: bg rgba(0,0,0,0), border none, borderRadius 3px,
     padding 6px 0px, height 32px, color rgb(80,82,88). The previous bordered
     chip style (bg #FAFBFC, border 1px #DFE1E6, radius 4px) was not Jira-parity. */
  const btnStyle: React.CSSProperties = {
    width: 32, height: 32, border: 'none', background: 'transparent',
    borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--ds-text-subtle, #505258)', transition: 'background 0.15s, color 0.15s',
  };

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
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)'; e.currentTarget.style.color = 'var(--ds-text, #292A2E)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-subtle, #505258)'; }}
          aria-haspopup="menu"
          aria-expanded={showMenu}
          aria-label="Add"
          title="Add"
        >
          <AddIcon size="small" primaryColor={textColor} />
        </button>

        {showMenu && (
          <div
            role="menu"
            aria-label="Add options"
            style={{
            position: 'absolute', left: 0, top: 34, background: 'var(--ds-surface, #FFFFFF)', borderRadius: 4,
            boxShadow: 'rgba(30,31,33,0.15) 0px 8px 12px, rgba(30,31,33,0.31) 0px 0px 1px',
            width: 266, zIndex: 400, padding: 0,
            animation: 'cv-slide-down 0.15s ease-out',
          }}>
            {/* Search */}
            <div style={{ margin: '4px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${borderColor}`, borderRadius: 3, padding: '1px 0' }}>
                <span style={{ marginLeft: 8, flexShrink: 0, display: 'flex', alignItems: 'center' }}><SearchIcon size="small" primaryColor={textColor} /></span>
                <input
                  type="text" placeholder="Find menu item" value={search}
                  onChange={e => setSearch(e.target.value)} autoFocus
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
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', textAlign: 'center' }}>No items match</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
